import {
    ErrorDescription,
    EventDescription,
    FunctionDescription,
    SolidityABI,
    SolidityDefinition,
    SolidityType
} from "../types/abi-types";
import {open} from "fs/promises";
import {TSObject} from "../types/output-types";

interface Definitions {
    functions: FunctionDescription[],
    events: EventDescription[],
    errors: ErrorDescription[]
}

export async function parseABIFile(path: string): Promise<SolidityABI> {
    const abiFile = await open(path, 'r')
    const rawAbi = await abiFile.readFile('utf-8')
    return JSON.parse(rawAbi) as SolidityABI
}

export function generateDefinitions(abi: SolidityABI): string {
    const definitions = extractDefinitions(abi)
    // store interfaces created as part of definition
    // discovery in map by name for side-by-side definition
    const interfaces = new Map<string, string>()

    let contractDefinition = 'interface SolidityContract {'
    for (const functionDescription of definitions.functions) {
        if (!functionDescription.name) {
            // TODO: handle nameless functions if necessary
            // skipping for now because I can't think of a use-case
            continue
        }

        const inputObjects = functionDescription.inputs?.map((stObj) => convertSolidityTypeToTSObject(stObj, interfaces)) ?? []
        const parameterList = inputObjects.map((parameter) => `${parameter.identifier}: ${parameter.tsType.typeName}`).join(', ')
        const returnTypeDefinition = buildReturnTypeDefinition(functionDescription, interfaces);
        let functionDefinition = `${functionDescription.name}(${parameterList}): ${returnTypeDefinition}`
        contractDefinition += `\n  ${functionDefinition}`
    }
    contractDefinition += '\n}'

    let definitionResult = `${contractDefinition}\n`
    if (interfaces.size > 0) {
        for(const [, definition] of interfaces.entries()) {
            definitionResult += `\n${definition}\n`
        }
    }
    return definitionResult
}

function extractDefinitions(abi: SolidityDefinition[]) {
    const definitions: Definitions = {
        functions: [],
        events: [],
        errors: []
    }
    for (const definition of abi) {
        switch (definition.type) {
            case 'event':
                definitions.events.push(definition)
                break
            case 'error':
                definitions.errors.push(definition)
                break
            default:
                definitions.functions.push(definition)
                break
        }
    }
    return definitions
}

function generateStructDefinitionFromType(typeName: string, solidityType: SolidityType, interfaces: Map<string, string>): string {
    if (!solidityType.internalType?.startsWith('struct')) {
        throw Error('Unsupported operation: cannot generate struct definition for non-struct type')
    }
    let definition = `interface ${typeName} {`
    const components = solidityType.components || []
    const componentObjects = components.map((component) => convertSolidityTypeToTSObject(component, interfaces))
    for (const component of componentObjects) {
        definition += `\n  ${component.identifier}: ${component.tsType.typeName}`
    }

    definition += '\n}'

    return definition
}

function getTypeNameForNonTuple(type: string): string {
    const arrayMatch = type.match(/^(\w+(?:\[?\d*]?)*)\[\d*]$/)
    if (arrayMatch) {
        const nonTupleType = getTypeNameForNonTuple(arrayMatch[1])
        return `${nonTupleType}[]`
    }
    switch (type) {
        case 'address':
        case 'string':
            return 'string'
        case 'bool':
            return 'boolean'
    }

    const intMatch = type.match(/^u?int(\d*)$/)
    if (intMatch) {
        // number is an int<M> or uint<M>
        let intSize = intMatch[1] == '' ? 256 : parseInt(intMatch[1])
        return intSize <= 32 ? 'number' : 'BigNumber'
    }

    if (/^bytes\d*$/.test(type)) {
        return 'string'
    }
    return ''
}

function generateInternalTypeName(solidityType: SolidityType, interfaces: Map<string, string>): string {
    // tuple or tuple array should use the same name generation logic
    if (/^tuple\[?\d*]?$/.test(solidityType.type)) {
        let name = ``
        if (solidityType.name?.length > 0) {
            name += solidityType.name[0].toUpperCase()
            if (solidityType.name.length > 1) {
                name += solidityType.name.substring(1)
            }
        }
        return `struct Contract.${name}Struct${interfaces.size + 1}`
    } else {
        return solidityType.type
    }
}

function convertSolidityTypeToTSObject(solidityType: SolidityType, interfaces: Map<string, string>): TSObject {
    if (!solidityType.internalType) {
        // we don't have internal type information, generate new type information on the fly
        solidityType.internalType = generateInternalTypeName(solidityType, interfaces)
    }

    // detect tuple arrays (possibly multidimensional: capture the tuple
    // type up until before the last array bracket pair. i.e the highest order dimension)
    const tupleMatch = solidityType.type.match(/^(tuple(?:\[?\d*]?)*)\[\d*]$/)
    if (tupleMatch) {
        const tupleType = convertSolidityTypeToTSObject({
                ...solidityType,
                type: tupleMatch[1]
            },
            interfaces)
        return {
            identifier: solidityType.name,
            tsType: {
                solidityType: solidityType,
                typeName: `${tupleType.tsType.typeName}[]`,
                definition: tupleType.tsType.definition
            },
        }
    }
    else if (solidityType.type === 'tuple') {
        // process as struct
        const indexOfDot = solidityType.internalType.indexOf('.')
        if (indexOfDot === -1 || indexOfDot >= solidityType.internalType.length - 1) {
            console.error('Unsupported tuple definition:', solidityType)
            throw new Error(`Tuple definitition ${solidityType.internalType} is unsupported`)
        }

        const typeName = solidityType.internalType.substring(indexOfDot + 1).trim()
        let structDefinition = interfaces.has(typeName) ? interfaces.get(typeName) : null
        if (!structDefinition) {
            structDefinition = generateStructDefinitionFromType(typeName, solidityType, interfaces)
            interfaces.set(typeName, structDefinition)
        }
        return {
            identifier: solidityType.name,
            tsType: {
                solidityType: solidityType,
                typeName,
                definition: structDefinition
            },
        }
    }

    return {
        identifier: solidityType.name,
        tsType: {
            solidityType: solidityType,
            typeName: getTypeNameForNonTuple(solidityType.type)
        }
    }
}

function buildReturnTypeDefinition(functionDescription: FunctionDescription, interfaces: Map<string, string>) {
    let returnTypeDefinition = 'Promise<'

    if (!['pure', 'view'].includes(functionDescription.stateMutability ?? '')) {
        // returns Promise<TransactionResponse>
        returnTypeDefinition += 'TransactionResponse'
    } else {
        const outputObjects = functionDescription.outputs?.map((stObj) => convertSolidityTypeToTSObject(stObj, interfaces)) ?? []
        if (!outputObjects.length) {
            returnTypeDefinition += 'void'
        } else {
            const outputTypeList = outputObjects.map((obj) => obj.tsType.typeName).join(', ')
            if (outputObjects.length == 1) {
                returnTypeDefinition += outputTypeList
            } else {
                returnTypeDefinition += `[${outputTypeList}]`
            }
        }
    }

    returnTypeDefinition += '>'
    return returnTypeDefinition;
}
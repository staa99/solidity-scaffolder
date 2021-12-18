export type SolidityABI = SolidityDefinition[]
type SolidityStateMutability = 'pure' | 'view' | 'payable' | 'nonpayable'
export type SolidityDefinition = FunctionDescription | EventDescription | ErrorDescription

export interface CompilationOutput {
    _format: string
    contractName: string
    sourceName: string
    abi: SolidityABI
    bytecode: string
    deployedBytecode: string
    linkReferences: any
    deployedLinkReferences: any
}

export interface FunctionDescription {
    name?: string
    type: 'function' | 'constructor' | 'receive' | 'fallback'
    inputs?: SolidityType[]
    outputs?: SolidityType[]
    stateMutability?: SolidityStateMutability
}

export interface EventDescription {
    name: string
    type: 'event'
    inputs?: SolidityType[]
    anonymous?: boolean
}

export interface ErrorDescription {
    name: string
    type: 'error'
    inputs?: SolidityType[]
    anonymous?: boolean
}

export interface SolidityType {
    name: string | undefined
    type: string
    components?: SolidityType[]
    indexed?: boolean
    internalType?: string
    generatedName?: boolean | undefined // added by name generator
}

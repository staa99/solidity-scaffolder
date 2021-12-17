import {SolidityType} from "./abi-types";

export interface TSType {
    solidityType: SolidityType
    typeName: string
    definition?: string // undefined if a primitive TS type is used
}

export interface TSObject{
    identifier: string
    tsType: TSType
}
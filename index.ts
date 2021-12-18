#!/usr/bin/env node

import {Command} from 'commander'
import * as process from 'process'
import {generateDefinitions, parseABIFile} from './lib/scaffolder'
import {CompilationOutput, SolidityABI} from './lib/types/abi-types'
import {writeFile} from 'fs/promises'

(async () => {
    const program = new Command()

    program
        .requiredOption('-f, --abi <abi-file>', 'Solidity ABI')
        .option('-o, --output <file-path>', 'Output file name. Defaults to stdout. Will ALWAYS override')

    program.parse(process.argv)

    const options = program.opts()

    let uncheckedABI: SolidityABI | CompilationOutput
    try {
        uncheckedABI = await parseABIFile(options.abi)
    } catch (e) {
        console.error('An error occurred while trying to parse the ABI file')
        console.error(e)
        return
    }

    if (!uncheckedABI || !uncheckedABI.length) {
        // check abi as CompilationOutput
        uncheckedABI = uncheckedABI as any as CompilationOutput
        if (!uncheckedABI.abi || !uncheckedABI.abi.length) {
            console.error('ABI is not a valid ABI definition or compilation output file')
            return
        }
        console.info('The file is a compilation output file, processing accordingly')
        uncheckedABI = uncheckedABI.abi
    }

    const abi = uncheckedABI as SolidityABI
    const definitions = generateDefinitions(abi)
    console.log('Definitions generated successfully')
    if (!options.output) {
        console.log(definitions)
    } else {
        try{
            await writeFile(options.output, definitions, { flag: 'w+' })
        }
        catch (e) {
            console.error('An error occurred while writing the file\n', e)
        }
    }
})()
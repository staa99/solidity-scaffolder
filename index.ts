import {Command} from 'commander'
import * as process from 'process'
import {CompilationOutput, SolidityABI} from "./lib/types/abi-types";
import {generateDefinitions, parseABIFile} from "./lib/scaffolder";

(async () => {
    const program = new Command()

    program
        .requiredOption('-f, --abi <abi-file>', 'Solidity ABI')
        .option('-o, --output', 'Output file name')

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
        console.info('The ABI definition might be a compilation output, or it is empty or invalid.')
        // check abi as CompilationOutput
        uncheckedABI = uncheckedABI as any as CompilationOutput
        if (!uncheckedABI.abi || !uncheckedABI.abi.length) {
            console.error('ABI is not a valid ABI definition or compilation output file')
            return
        }
        uncheckedABI = uncheckedABI.abi
    }

    const abi = uncheckedABI as SolidityABI
    console.log(generateDefinitions(abi))
})()
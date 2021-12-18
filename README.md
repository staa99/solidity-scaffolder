# Solidity Type Scaffolder

This tool helps you enhance your solidity development experience 
when you build with TypeScript and Ethers. You can generate 
type information from your contract ABI to gain type-safety. 
The type information generated is designed to be consistent with Ethers meta-objects.
Ethers already generates a meta-object for your contract at runtime from the ABI specification,
this tool helps you ensure type-safety when you build with TypeScript.

## Features

- Supports [ABI JSON](https://docs.soliditylang.org/en/v0.8.10/abi-spec.html#abi-json) format
- Generate contract interface
- Generate function signatures on contract like `contract.functionName(params...)`.
- Generate struct interfaces
- Function return type specifications
- Generate all imports
- File and stdout output

## Installation

You can install using `npm` by running the following command.
This installs it as a global tool on your machine.

If you develop with TypeScript, then you may already have `npm` installed. 

````
npm install -g solidity-scaffolder
````

## Usage

When you install the tool, a new command will be available for you to run.

````
scaffold-contract-types -f <abi-file> -o <output-ts-file>
````

`scaffold-contract-types` takes two named parameters:

- -f, --abi: A JSON file containing the ABI 
in [ABI JSON](https://docs.soliditylang.org/en/v0.8.10/abi-spec.html#abi-json) format
- -o, --output: An output file to write the contract interface 
definitions to. It is overwritten if it exists already. If omitted, the definitions are written to `stdout`.


## Contributing
Please feel free to review the code and contribute improvements. 
You could also suggest missing features that you think should be included.
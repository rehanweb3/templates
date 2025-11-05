import solc from "solc";

export async function compileContract(source: string, contractName: string) {
  const input = {
    language: "Solidity",
    sources: {
      "contract.sol": {
        content: source,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter((e: any) => e.severity === "error");
    if (errors.length > 0) {
      throw new Error(errors.map((e: any) => e.message).join("\n"));
    }
  }

  const contract = output.contracts["contract.sol"][contractName];
  
  return {
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object,
  };
}
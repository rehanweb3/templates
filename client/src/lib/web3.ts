import { BrowserProvider, Contract, JsonRpcSigner } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const BNB_CHAIN_CONFIG = {
  chainId: "0x279F",
  chainName: "Monad Testnet",
  rpcUrls: ["https://testnet-rpc.monad.xyz/"],
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  blockExplorerUrls: ["https://testnet.monadexplorer.com/"],
};

export async function connectWallet(): Promise<{ provider: BrowserProvider; signer: JsonRpcSigner; address: string }> {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed!");
  }

  const provider = new BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = accounts[0];

  return { provider, signer, address };
}

export async function switchToBNBChain() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed!");
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BNB_CHAIN_CONFIG.chainId }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [BNB_CHAIN_CONFIG],
      });
    } else {
      throw switchError;
    }
  }
}

export async function deployContract(
  signer: JsonRpcSigner,
  abi: any[],
  bytecode: string
): Promise<string> {
  const { ContractFactory } = await import("ethers");
  const prefixedBytecode = bytecode.startsWith("0x") ? bytecode : `0x${bytecode}`;
  const factory = new ContractFactory(abi, prefixedBytecode, signer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  return address;
}

export function getContract(address: string, abi: any[], signer: JsonRpcSigner): Contract {
  return new Contract(address, abi, signer);
}

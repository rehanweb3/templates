import { useState, useEffect } from "react";
import { JsonRpcSigner } from "ethers";
import { connectWallet, switchToBNBChain, deployContract, getContract } from "./lib/web3";
import { generateContractSource } from "./lib/contractTemplate";
import { compileContract } from "./lib/compiler";
import type { DeployedToken } from "../../shared/schema";

interface FunctionParam {
  name: string;
  type: string;
}

interface ContractFunction {
  name: string;
  inputs: FunctionParam[];
}

export default function App() {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenSupply, setTokenSupply] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [contractAbi, setContractAbi] = useState<any[]>([]);
  const [ownerFunctions, setOwnerFunctions] = useState<ContractFunction[]>([]);
  const [selectedContract, setSelectedContract] = useState("");
  const [deployedTokens, setDeployedTokens] = useState<DeployedToken[]>([]);
  const [functionInputs, setFunctionInputs] = useState<Record<string, Record<string, string>>>({});
  const [executing, setExecuting] = useState<string>("");

  useEffect(() => {
    if (walletAddress) {
      loadDeployedTokens(walletAddress);
    }
  }, [walletAddress]);

  async function loadDeployedTokens(address: string) {
    try {
      const response = await fetch(`/api/tokens/${address}`);
      const tokens = await response.json();
      setDeployedTokens(tokens);
    } catch (err) {
      console.error("Failed to load tokens:", err);
    }
  }

  async function handleConnect() {
    try {
      setError("");
      const { signer, address } = await connectWallet();
      await switchToBNBChain();
      setSigner(signer);
      setWalletAddress(address);
      setSuccess(`Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeploy() {
    if (!signer || !tokenName || !tokenSymbol || !tokenSupply) {
      setError("Please fill all fields and connect wallet");
      return;
    }

    setIsDeploying(true);
    setError("");
    setSuccess("");

    try {
      const supply = parseInt(tokenSupply);
      if (isNaN(supply) || supply <= 0) {
        throw new Error("Invalid supply amount");
      }

      const contractSource = generateContractSource(tokenName, tokenSymbol, supply);
      
      setSuccess("Compiling contract...");
      const { abi, bytecode } = await compileContract(contractSource, `${tokenSymbol}Token`);
      
      setSuccess("Deploying contract...");
      const contractAddress = await deployContract(signer, abi, bytecode);
      
      setDeployedAddress(contractAddress);
      setContractAbi(abi);
      
      const network = await signer.provider?.getNetwork();
      const chainId = network ? Number(network.chainId) : 56;

      await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: walletAddress.toLowerCase(),
          tokenName,
          tokenSymbol,
          tokenSupply: tokenSupply,
          contractAddress,
          chainId,
        }),
      });

      await loadDeployedTokens(walletAddress);
      
      const ownerFuncs = extractOwnerFunctions(abi);
      setOwnerFunctions(ownerFuncs);
      
      setSuccess(`Contract deployed at: ${contractAddress}`);
    } catch (err: any) {
      setError(err.message || "Deployment failed");
    } finally {
      setIsDeploying(false);
    }
  }

  function extractOwnerFunctions(abi: any[]): ContractFunction[] {
    const ownerFunctionNames = [
      "pause",
      "unpause",
      "blacklist",
      "unblacklist",
      "addDexPair",
      "removeDexPair",
      "allowSellWithAmount",
      "disallowSell",
      "burn",
      "mint",
      "transferOwnership",
    ];

    return abi
      .filter((item) => item.type === "function" && ownerFunctionNames.includes(item.name))
      .map((func) => ({
        name: func.name,
        inputs: func.inputs || [],
      }));
  }

  async function handleSelectToken(contractAddress: string) {
    const token = deployedTokens.find((t) => t.contractAddress === contractAddress);
    if (!token || !signer) return;

    setSelectedContract(contractAddress);
    setDeployedAddress(contractAddress);

    const contractSource = generateContractSource(token.tokenName, token.tokenSymbol, parseInt(token.tokenSupply));
    const { abi } = await compileContract(contractSource, `${token.tokenSymbol}Token`);
    
    setContractAbi(abi);
    const ownerFuncs = extractOwnerFunctions(abi);
    setOwnerFunctions(ownerFuncs);
  }

  async function executeFunction(functionName: string, inputs: FunctionParam[]) {
    if (!signer || !deployedAddress) return;

    setExecuting(functionName);
    setError("");
    setSuccess("");

    try {
      const contract = getContract(deployedAddress, contractAbi, signer);
      const args = inputs.map((input) => functionInputs[functionName]?.[input.name] || "");
      
      const tx = await contract[functionName](...args);
      setSuccess(`Transaction sent: ${tx.hash}`);
      
      await tx.wait();
      setSuccess(`${functionName} executed successfully!`);
    } catch (err: any) {
      setError(err.message || `Failed to execute ${functionName}`);
    } finally {
      setExecuting("");
    }
  }

  function updateFunctionInput(functionName: string, paramName: string, value: string) {
    setFunctionInputs((prev) => ({
      ...prev,
      [functionName]: {
        ...(prev[functionName] || {}),
        [paramName]: value,
      },
    }));
  }

  return (
    <div className="card">
      <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "24px", textAlign: "center" }}>
        Token Deployer dApp
      </h1>

      {!walletAddress ? (
        <button onClick={handleConnect} className="btn-primary" style={{ width: "100%" }}>
          Connect MetaMask
        </button>
      ) : (
        <>
          <div style={{ marginBottom: "24px", padding: "12px", background: "#f0f0f0", borderRadius: "8px" }}>
            <strong>Connected:</strong> {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
          </div>

          {deployedTokens.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                Load Previous Token:
              </label>
              <select
                value={selectedContract}
                onChange={(e) => handleSelectToken(e.target.value)}
                style={{ marginBottom: "12px" }}
              >
                <option value="">-- Select a token --</option>
                {deployedTokens.map((token) => (
                  <option key={token.id} value={token.contractAddress}>
                    {token.tokenName} ({token.tokenSymbol}) - {token.contractAddress.slice(0, 10)}...
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>Deploy New Token</h2>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Token Name:</label>
              <input
                type="text"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="e.g., My Token"
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Token Symbol:</label>
              <input
                type="text"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
                placeholder="e.g., MTK"
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Total Supply:</label>
              <input
                type="number"
                value={tokenSupply}
                onChange={(e) => setTokenSupply(e.target.value)}
                placeholder="e.g., 1000000"
              />
            </div>

            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="btn-primary"
              style={{ width: "100%" }}
            >
              {isDeploying ? <span className="loading"></span> : "Deploy Token"}
            </button>
          </div>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          {ownerFunctions.length > 0 && (
            <div style={{ marginTop: "32px", borderTop: "2px solid #e0e0e0", paddingTop: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
                Owner Functions
              </h2>
              <div style={{ display: "grid", gap: "16px" }}>
                {ownerFunctions.map((func) => (
                  <div
                    key={func.name}
                    style={{
                      padding: "16px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      background: "#fafafa",
                    }}
                  >
                    <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
                      {func.name}
                    </h3>
                    
                    {func.inputs.length > 0 && (
                      <div style={{ marginBottom: "12px" }}>
                        {func.inputs.map((input) => (
                          <div key={input.name} style={{ marginBottom: "8px" }}>
                            <label style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}>
                              {input.name} ({input.type}):
                            </label>
                            <input
                              type="text"
                              value={functionInputs[func.name]?.[input.name] || ""}
                              onChange={(e) =>
                                updateFunctionInput(func.name, input.name, e.target.value)
                              }
                              placeholder={`Enter ${input.name}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <button
                      onClick={() => executeFunction(func.name, func.inputs)}
                      disabled={executing === func.name}
                      className="btn-secondary"
                      style={{ width: "100%" }}
                    >
                      {executing === func.name ? <span className="loading"></span> : `Execute ${func.name}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

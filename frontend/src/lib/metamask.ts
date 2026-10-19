/**
 * src/lib/metamask.ts
 * ====================
 * MetaMask integration and ProductRegistry contract interactions via ethers.js.
 *
 * Chain ID comes from VITE_CHAIN_ID (default 1337 = local Ganache).
 */

import { BrowserProvider, Contract } from "ethers";

const EXPECTED_CHAIN_ID = parseInt(
  (import.meta.env.VITE_CHAIN_ID as string | undefined) ?? "1337",
  10
);

export const PRODUCT_REGISTRY_ABI = [
  "function owner() view returns (address)",
  "function operator() view returns (address)",
  "function isManufacturer(address _mfr) view returns (bool)",
  "function addManufacturer(address _mfr) external",
  "function removeManufacturer(address _mfr) external",
  "function setOperator(address _newOperator) external",
  "event ManufacturerAdded(address indexed manufacturer)",
  "event ManufacturerRemoved(address indexed manufacturer)",
  "event OperatorChanged(address indexed oldOperator, address indexed newOperator)",
];

/** Returns true if the MetaMask extension is available. */
export function isMetaMaskAvailable(): boolean {
  return typeof window !== "undefined" &&
    !!(window as { ethereum?: unknown }).ethereum;
}

/** Request MetaMask account access. Returns the selected address or null. */
export async function connectMetaMask(): Promise<string | null> {
  if (!isMetaMaskAvailable()) return null;
  try {
    const eth = (window as unknown as { ethereum: { request(a: { method: string; params?: unknown[] }): Promise<string[]> } }).ethereum;
    const accounts = await eth.request({ method: "eth_requestAccounts" });
    return accounts[0] ?? null;
  } catch {
    return null;
  }
}

/** Check that MetaMask is on the expected chain; prompt to switch/add if not. */
export async function ensureCorrectChain(): Promise<boolean> {
  if (!isMetaMaskAvailable()) return false;
  try {
    const eth = (window as unknown as { ethereum: { request(a: { method: string; params?: unknown[] }): Promise<any> } }).ethereum;
    const chainHex = await eth.request({ method: "eth_chainId" });
    const chainId = parseInt(chainHex as string, 16);
    if (chainId === EXPECTED_CHAIN_ID) return true;

    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }],
      });
      return true;
    } catch (switchError: any) {
      if (switchError?.code === 4902 || switchError?.message?.includes("Unrecognized chain ID")) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}`,
              chainName: "Ganache Local",
              rpcUrls: ["http://127.0.0.1:7546"],
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            },
          ],
        });
        return true;
      }
      return false;
    }
  } catch {
    return false;
  }
}

export async function getContractInstance(contractAddress: string, withSigner: boolean = false): Promise<Contract> {
  if (!isMetaMaskAvailable()) throw new Error("MetaMask is not installed.");
  const provider = new BrowserProvider((window as unknown as { ethereum: any }).ethereum);
  if (withSigner) {
    const signer = await provider.getSigner();
    return new Contract(contractAddress, PRODUCT_REGISTRY_ABI, signer);
  }
  return new Contract(contractAddress, PRODUCT_REGISTRY_ABI, provider);
}

/** Read owner and operator from the deployed contract */
export async function getContractDetails(contractAddress: string): Promise<{ owner: string; operator: string }> {
  const contract = await getContractInstance(contractAddress, false);
  const [owner, operator] = await Promise.all([
    contract.owner(),
    contract.operator(),
  ]);
  return { owner, operator };
}

/** Check whether an address is a whitelisted manufacturer */
export async function checkIsManufacturer(contractAddress: string, mfrAddress: string): Promise<boolean> {
  const contract = await getContractInstance(contractAddress, false);
  return await contract.isManufacturer(mfrAddress);
}

/** Whitelist a manufacturer using connected MetaMask signer (owner only) */
export async function whitelistManufacturer(
  contractAddress: string,
  mfrAddress: string
): Promise<{ txHash: string; blockNumber: number }> {
  const contract = await getContractInstance(contractAddress, true);
  const tx = await contract.addManufacturer(mfrAddress);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

/** Revoke a manufacturer using connected MetaMask signer (owner only) */
export async function revokeManufacturer(
  contractAddress: string,
  mfrAddress: string
): Promise<{ txHash: string; blockNumber: number }> {
  const contract = await getContractInstance(contractAddress, true);
  const tx = await contract.removeManufacturer(mfrAddress);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

/** Change backend operator account using connected MetaMask signer (owner only) */
export async function changeOperator(
  contractAddress: string,
  newOperatorAddress: string
): Promise<{ txHash: string; blockNumber: number }> {
  const contract = await getContractInstance(contractAddress, true);
  const tx = await contract.setOperator(newOperatorAddress);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

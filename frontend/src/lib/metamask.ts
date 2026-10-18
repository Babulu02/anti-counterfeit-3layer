/**
 * src/lib/metamask.ts
 * ====================
 * Optional MetaMask integration.
 *
 * MetaMask is NOT required — the backend can sign transactions with the
 * MANUFACTURER_PRIVATE_KEY from .env.  MetaMask is useful when the
 * manufacturer wants to sign their own on-chain registration.
 *
 * Chain ID comes from VITE_CHAIN_ID (default 1337 = local Ganache).
 */

const EXPECTED_CHAIN_ID = parseInt(
  (import.meta.env.VITE_CHAIN_ID as string | undefined) ?? "1337",
  10
);

/** Returns true if the MetaMask extension is available. */
export function isMetaMaskAvailable(): boolean {
  return typeof window !== "undefined" &&
    !!(window as { ethereum?: unknown }).ethereum;
}

/** Request MetaMask account access.  Returns the selected address or null. */
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

/** Check that MetaMask is on the expected chain; prompt to switch if not. */
export async function ensureCorrectChain(): Promise<boolean> {
  if (!isMetaMaskAvailable()) return false;
  try {
    const eth = (window as unknown as { ethereum: { request(a: { method: string; params?: unknown[] }): Promise<string> } }).ethereum;
    const chainHex = await eth.request({ method: "eth_chainId" });
    const chainId  = parseInt(chainHex as string, 16);
    if (chainId === EXPECTED_CHAIN_ID) return true;
    // Try to switch
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }],
    });
    return true;
  } catch {
    return false;
  }
}

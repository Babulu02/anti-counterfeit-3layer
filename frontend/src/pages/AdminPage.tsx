import { useState, useEffect } from "react";
import Card from "../components/Card";
import { getChainInfo, type ChainInfo } from "../lib/api";
import {
  isMetaMaskAvailable,
  connectMetaMask,
  ensureCorrectChain,
  getContractDetails,
  checkIsManufacturer,
  whitelistManufacturer,
  revokeManufacturer,
} from "../lib/metamask";

// Deterministic Ganache Accounts Reference
const DETERMINISTIC_ACCOUNTS = [
  { index: 0, role: "Contract Owner / Admin", address: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1" },
  { index: 1, role: "Backend Operator", address: "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0" },
  { index: 2, role: "Manufacturer (in .env)", address: "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b" },
  { index: 3, role: "Manufacturer 2", address: "0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d" },
  { index: 4, role: "Manufacturer 3", address: "0xd03ea8624C8C5987235048901fB614fDcA89b117" },
  { index: 5, role: "Manufacturer 4", address: "0x95cED938F7991cd0dFcb48F0a06a40FA1aF46EBC" },
];

export default function AdminPage() {
  const [chainInfo, setChainInfo] = useState<ChainInfo | null>(null);
  const [contractAddress, setContractAddress] = useState("");
  const [contractOwner, setContractOwner] = useState<string | null>(null);
  const [contractOperator, setContractOperator] = useState<string | null>(null);

  // MetaMask state
  const [account, setAccount] = useState<string | null>(null);
  const [chainOk, setChainOk] = useState(false);

  // Form & status state
  const [targetAddress, setTargetAddress] = useState("0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b");
  const [targetIsWhitelisted, setTargetIsWhitelisted] = useState<boolean | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Action state
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | "info";
    text: string;
    txHash?: string;
  } | null>(null);

  // Initial load: get chain info from backend
  useEffect(() => {
    getChainInfo()
      .then((info) => {
        setChainInfo(info);
        setContractAddress(info.contract_address);
        setContractOwner(info.owner);
        setContractOperator(info.operator);
      })
      .catch((err) => {
        console.warn("Failed to load chain info from backend:", err);
      });
  }, []);

  // Update live contract details whenever contractAddress changes
  useEffect(() => {
    if (contractAddress && isMetaMaskAvailable()) {
      getContractDetails(contractAddress)
        .then(({ owner, operator }) => {
          setContractOwner(owner);
          setContractOperator(operator);
        })
        .catch(() => {});
    }
  }, [contractAddress]);

  // Check target address whitelist status
  const refreshTargetStatus = async (addr: string, cAddr: string = contractAddress) => {
    if (!addr || !cAddr || !isMetaMaskAvailable()) return;
    try {
      setCheckingStatus(true);
      const isMfr = await checkIsManufacturer(cAddr, addr);
      setTargetIsWhitelisted(isMfr);
    } catch {
      setTargetIsWhitelisted(null);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (targetAddress && contractAddress) {
      refreshTargetStatus(targetAddress, contractAddress);
    }
  }, [targetAddress, contractAddress]);

  // Listen to MetaMask account / chain changes
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      eth
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
            ensureCorrectChain().then(setChainOk);
          }
        })
        .catch(() => {});

      const handleAccountsChanged = (accs: string[]) => {
        setAccount(accs[0] || null);
      };
      const handleChainChanged = () => {
        ensureCorrectChain().then(setChainOk);
      };

      eth.on("accountsChanged", handleAccountsChanged);
      eth.on("chainChanged", handleChainChanged);

      return () => {
        if (eth.removeListener) {
          eth.removeListener("accountsChanged", handleAccountsChanged);
          eth.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, []);

  async function handleConnect() {
    setStatusMsg(null);
    const addr = await connectMetaMask();
    if (!addr) {
      setStatusMsg({ type: "error", text: "MetaMask connection was rejected or provider not found." });
      return;
    }
    const ok = await ensureCorrectChain();
    setAccount(addr);
    setChainOk(ok);
  }

  async function handleWhitelist() {
    if (!contractAddress || !targetAddress) return;
    setBusy(true);
    setStatusMsg({ type: "info", text: "Requesting signature in MetaMask..." });

    try {
      const tx = await whitelistManufacturer(contractAddress, targetAddress);
      setStatusMsg({
        type: "success",
        text: `Manufacturer ${targetAddress.slice(0, 8)}... successfully whitelisted on-chain!`,
        txHash: tx.txHash,
      });
      await refreshTargetStatus(targetAddress);
    } catch (err: any) {
      const reason = err?.reason || err?.message || String(err);
      setStatusMsg({
        type: "error",
        text: `Transaction failed: ${reason.includes("user rejected") ? "User rejected signature in MetaMask" : reason}`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke() {
    if (!contractAddress || !targetAddress) return;
    setBusy(true);
    setStatusMsg({ type: "info", text: "Requesting signature in MetaMask..." });

    try {
      const tx = await revokeManufacturer(contractAddress, targetAddress);
      setStatusMsg({
        type: "success",
        text: `Manufacturer ${targetAddress.slice(0, 8)}... authorization revoked!`,
        txHash: tx.txHash,
      });
      await refreshTargetStatus(targetAddress);
    } catch (err: any) {
      const reason = err?.reason || err?.message || String(err);
      setStatusMsg({
        type: "error",
        text: `Transaction failed: ${reason.includes("user rejected") ? "User rejected signature in MetaMask" : reason}`,
      });
    } finally {
      setBusy(false);
    }
  }

  const isOwner =
    account && contractOwner && account.toLowerCase() === contractOwner.toLowerCase();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#26384B] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-[#00BFFF]/10 border border-[#00BFFF]/30 text-[#00BFFF] text-[11px] font-mono mb-2">
            STARK // SMART CONTRACT GOVERNANCE
          </div>
          <h1 className="text-2xl font-bold text-[#F1F6FC] tracking-tight">
            Smart Contract Administration
          </h1>
          <p className="text-xs text-[#9BAFC5] mt-1">
            Manage manufacturer whitelisting, review on-chain role privileges, and inspect ProductRegistry.sol contract state.
          </p>
        </div>

        {/* MetaMask Status Pill */}
        <div className="shrink-0">
          {account ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#111C29] border border-[#26384B]">
              <span
                className={`w-2 h-2 rounded-full ${
                  chainOk ? "bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-[#EF4444]"
                }`}
              />
              <div className="text-right">
                <p className="text-[10px] font-mono text-[#9BAFC5]">ADMIN WALLET</p>
                <p className="font-mono text-xs text-[#F1F6FC]">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </p>
              </div>
            </div>
          ) : isMetaMaskAvailable() ? (
            <button
              onClick={handleConnect}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00BFFF]/10 to-[#168BFF]/20 hover:from-[#00BFFF]/20 hover:to-[#168BFF]/30 border border-[#00BFFF]/40 text-[#00BFFF] text-xs font-semibold tracking-wide transition-all shadow-sm"
            >
              Connect MetaMask
            </button>
          ) : (
            <span className="text-xs font-mono text-[#5B708B] px-3 py-1.5 rounded-lg bg-[#111C29] border border-[#26384B]">
              No Web3 Provider
            </span>
          )}
        </div>
      </div>

      {/* ── Role Privilege Notice Banner ── */}
      {account && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            isOwner
              ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]"
              : "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-sm">{isOwner ? "👑" : "👁️"}</span>
            <div>
              <p className="font-semibold">
                {isOwner
                  ? "Contract Owner Authorization Active"
                  : "Read-Only Observability Mode"}
              </p>
              <p className="text-[#9BAFC5] mt-0.5">
                {isOwner
                  ? "Connected with Account #0. You possess full permission to add/remove manufacturers."
                  : "Connected account is not the contract owner. Whitelist write transactions require Account #0."}
              </p>
            </div>
          </div>

          {!isOwner && (
            <button
              onClick={handleConnect}
              className="text-xs px-3 py-1 rounded-lg bg-[#F59E0B]/20 border border-[#F59E0B]/40 hover:bg-[#F59E0B]/30 font-semibold text-[#F59E0B] whitespace-nowrap"
            >
              Switch Account
            </button>
          )}
        </div>
      )}

      {/* ── On-Chain Contract Parameters Card ── */}
      <Card
        title="Deployed Smart Contract Configuration"
        subtitle="Live state read directly from Ganache local EVM (Chain ID 1337)"
        icon={
          <svg className="w-5 h-5 text-[#00BFFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-[#26384B]/40">
                <td className="py-2.5 text-[#9BAFC5]">ProductRegistry Contract Address</td>
                <td className="py-2.5 text-right font-mono text-[#00BFFF] break-all">
                  {contractAddress || "Loading..."}
                </td>
              </tr>
              <tr className="border-b border-[#26384B]/40">
                <td className="py-2.5 text-[#9BAFC5]">EVM Network & Chain ID</td>
                <td className="py-2.5 text-right font-mono text-[#F1F6FC]">
                  Ganache CLI (Chain ID 1337)
                </td>
              </tr>
              <tr className="border-b border-[#26384B]/40">
                <td className="py-2.5 text-[#9BAFC5]">Contract Deployer / Owner (`onlyOwner`)</td>
                <td className="py-2.5 text-right font-mono text-[#F1F6FC] break-all">
                  {contractOwner || "Loading..."}
                </td>
              </tr>
              <tr className="border-b border-[#26384B]/40">
                <td className="py-2.5 text-[#9BAFC5]">Backend Operator Account (`onlyOperator`)</td>
                <td className="py-2.5 text-right font-mono text-[#F1F6FC] break-all">
                  {contractOperator || "Loading..."}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Manufacturer Whitelist Management Console ── */}
      <Card
        title="Manufacturer Whitelist Authorization Console"
        subtitle="Authorize or revoke physical asset minting privileges on-chain"
        icon={
          <svg className="w-5 h-5 text-[#00BFFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[#9BAFC5]">
                Target Manufacturer Address
              </label>
              <button
                type="button"
                onClick={() => setTargetAddress("0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b")}
                className="text-[11px] font-mono text-[#00BFFF] hover:underline"
              >
                Use Account #2 (Default in .env)
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value.trim())}
                placeholder="0x..."
                className="flex-1 rounded-lg bg-[#080D14] border border-[#26384B] px-3.5 py-2 text-xs font-mono text-[#F1F6FC] focus:outline-none focus:border-[#00BFFF]"
              />
              <button
                type="button"
                onClick={() => refreshTargetStatus(targetAddress)}
                disabled={checkingStatus}
                className="px-3.5 py-2 rounded-lg bg-[#172536] hover:bg-[#172536]/80 border border-[#26384B] text-xs font-semibold text-[#9BAFC5] hover:text-[#F1F6FC] transition-colors"
              >
                {checkingStatus ? "Checking..." : "Verify Status"}
              </button>
            </div>
          </div>

          {/* Live Whitelist Status Indicator */}
          <div className="p-3 rounded-xl bg-[#080D14] border border-[#26384B] flex items-center justify-between">
            <span className="text-xs text-[#9BAFC5]">On-Chain Whitelist Status:</span>
            {checkingStatus ? (
              <span className="text-xs font-mono text-[#9BAFC5]">Querying ledger...</span>
            ) : targetIsWhitelisted === true ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] font-mono text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                WHITELISTED AUTHORIZED
              </span>
            ) : targetIsWhitelisted === false ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] font-mono text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                NOT WHITELISTED
              </span>
            ) : (
              <span className="text-xs font-mono text-[#5B708B]">Unknown</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleWhitelist}
              disabled={busy || !isOwner}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:opacity-95 text-white font-semibold text-xs tracking-wide shadow-md transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <span>✨</span>
              <span>Whitelist via MetaMask (addManufacturer)</span>
            </button>

            <button
              type="button"
              onClick={handleRevoke}
              disabled={busy || !isOwner}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#EF4444] to-[#B91C1C] hover:opacity-95 text-white font-semibold text-xs tracking-wide shadow-md transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <span>🚫</span>
              <span>Revoke Authorization (removeManufacturer)</span>
            </button>
          </div>

          {/* Transaction Feedback Notification */}
          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                statusMsg.type === "success"
                  ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]"
                  : statusMsg.type === "error"
                  ? "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]"
                  : "bg-[#00BFFF]/10 border-[#00BFFF]/30 text-[#00BFFF]"
              }`}
            >
              <p className="font-semibold">{statusMsg.text}</p>
              {statusMsg.txHash && (
                <p className="font-mono mt-1 text-[11px] opacity-90 break-all">
                  Tx Hash: {statusMsg.txHash}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ── Deterministic Accounts Reference Table ── */}
      <Card
        title="Deterministic Ganache Account Directory"
        subtitle="Pre-configured local testnet accounts for development and pair-programming"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[#9BAFC5] border-b border-[#26384B] font-mono text-[11px]">
                <th className="pb-2 pr-3">Idx</th>
                <th className="pb-2 pr-3">Assigned Role</th>
                <th className="pb-2 pr-3">Ethereum Address</th>
                <th className="pb-2 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody>
              {DETERMINISTIC_ACCOUNTS.map((acc) => (
                <tr
                  key={acc.index}
                  className="border-b border-[#26384B]/40 last:border-0 hover:bg-[#172536]/30 transition-colors"
                >
                  <td className="py-2.5 pr-3 font-mono text-[#00BFFF]">#{acc.index}</td>
                  <td className="py-2.5 pr-3 font-medium text-[#F1F6FC]">{acc.role}</td>
                  <td className="py-2.5 pr-3 font-mono text-[#9BAFC5]">{acc.address}</td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setTargetAddress(acc.address)}
                      className="text-[11px] font-mono text-[#00BFFF] hover:underline"
                    >
                      Select Target
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

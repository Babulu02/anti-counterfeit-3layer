/**
 * src/pages/AdminPage.tsx
 * =======================
 * Contract Administration Portal:
 *  - Connects to MetaMask with Contract Owner (Ganache Account #0).
 *  - Whitelist and revoke manufacturers directly on-chain using MetaMask.
 *  - Displays live on-chain contract roles (Owner, Operator, Manufacturer statuses).
 *  - Provides one-click whitelisting for deterministic Ganache manufacturer accounts.
 */

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
  { index: 1, role: "Backend Operator",        address: "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0" },
  { index: 2, role: "Manufacturer (in .env)",  address: "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b" },
  { index: 3, role: "Manufacturer 2",          address: "0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d" },
  { index: 4, role: "Manufacturer 3",          address: "0xd03ea8624C8C5987235048901fB614fDcA89b117" },
  { index: 5, role: "Manufacturer 4",          address: "0x95cED938F7991cd0dFcb48F0a06a40FA1aF46EBC" },
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
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string; txHash?: string } | null>(null);

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
    if (!isMetaMaskAvailable()) return;
    const eth = (window as unknown as { ethereum: any }).ethereum;
    const handleAccountsChanged = (accs: string[]) => {
      setAccount(accs[0] ?? null);
    };
    const handleChainChanged = () => {
      ensureCorrectChain().then(setChainOk);
    };

    eth.on?.("accountsChanged", handleAccountsChanged);
    eth.on?.("chainChanged", handleChainChanged);

    return () => {
      eth.removeListener?.("accountsChanged", handleAccountsChanged);
      eth.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  // Check if MetaMask already has connected accounts on mount
  useEffect(() => {
    if (isMetaMaskAvailable()) {
      const eth = (window as unknown as { ethereum: any }).ethereum;
      eth.request?.({ method: "eth_accounts" })
        .then((accs: string[]) => {
          if (accs && accs[0]) {
            setAccount(accs[0]);
            ensureCorrectChain().then(setChainOk);
          }
        })
        .catch(() => {});
    }
  }, []);

  async function handleConnect() {
    setStatusMsg(null);
    const addr = await connectMetaMask();
    if (!addr) {
      setStatusMsg({ type: "error", text: "MetaMask connection was rejected or unavailable." });
      return;
    }
    const ok = await ensureCorrectChain();
    setAccount(addr);
    setChainOk(ok);
  }

  const effectiveOwner = contractOwner || chainInfo?.owner || "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";
  const isOwnerConnected =
    Boolean(account && effectiveOwner && account.toLowerCase() === effectiveOwner.toLowerCase());

  async function handleWhitelist(mfrToWhitelist: string = targetAddress) {
    if (!contractAddress) {
      setStatusMsg({ type: "error", text: "Contract address is not set." });
      return;
    }
    if (!account) {
      setStatusMsg({ type: "error", text: "Please connect MetaMask first." });
      return;
    }
    if (!isOwnerConnected) {
      setStatusMsg({
        type: "error",
        text: `Only the Contract Owner (${contractOwner}) can whitelist manufacturers. Your connected account is ${account}.`,
      });
      return;
    }

    setBusy(true);
    setStatusMsg({ type: "info", text: `Submitting on-chain transaction via MetaMask to whitelist ${mfrToWhitelist}...` });

    try {
      const { txHash, blockNumber } = await whitelistManufacturer(contractAddress, mfrToWhitelist);
      setStatusMsg({
        type: "success",
        text: `Successfully whitelisted ${mfrToWhitelist} in block #${blockNumber}!`,
        txHash,
      });
      await refreshTargetStatus(mfrToWhitelist);
    } catch (err: any) {
      const reason = err?.reason || err?.message || String(err);
      setStatusMsg({ type: "error", text: `Transaction failed: ${reason}` });
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(mfrToRevoke: string = targetAddress) {
    if (!contractAddress || !account) return;
    if (!isOwnerConnected) {
      setStatusMsg({
        type: "error",
        text: `Only the Contract Owner can revoke manufacturers.`,
      });
      return;
    }

    setBusy(true);
    setStatusMsg({ type: "info", text: `Submitting on-chain transaction via MetaMask to revoke ${mfrToRevoke}...` });

    try {
      const { txHash, blockNumber } = await revokeManufacturer(contractAddress, mfrToRevoke);
      setStatusMsg({
        type: "success",
        text: `Successfully revoked ${mfrToRevoke} in block #${blockNumber}!`,
        txHash,
      });
      await refreshTargetStatus(mfrToRevoke);
    } catch (err: any) {
      const reason = err?.reason || err?.message || String(err);
      setStatusMsg({ type: "error", text: `Transaction failed: ${reason}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span>🛡️</span> Smart Contract Administration
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Authorize and manage manufacturer accounts on the ProductRegistry contract using MetaMask.
          </p>
        </div>

        <div>
          {!account ? (
            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg shadow-sm flex items-center gap-2 transition"
            >
              <img src="https://metamask.io/images/metamask-fox.svg" alt="MetaMask" className="w-5 h-5" />
              Connect Owner Wallet
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span className="font-mono text-gray-700">
                {account.slice(0, 8)}...{account.slice(-6)}
              </span>
              <button
                onClick={handleConnect}
                className="text-sky-600 hover:underline ml-1 font-medium"
              >
                Switch
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Status Banner / Alerts ── */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl border text-sm flex flex-col gap-1 ${
            statusMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : statusMsg.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-sky-50 border-sky-200 text-sky-800"
          }`}
        >
          <div className="font-semibold">{statusMsg.text}</div>
          {statusMsg.txHash && (
            <div className="font-mono text-xs text-gray-600 break-all">
              Tx Hash: {statusMsg.txHash}
            </div>
          )}
        </div>
      )}

      {/* ── Owner Permission Advisory ── */}
      {account && !isOwnerConnected && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <div className="font-semibold">Connected account is not the Contract Owner</div>
            <p className="mt-1 text-xs text-amber-800">
              Your connected MetaMask account ({account}) cannot authorize manufacturers. Please switch your
              MetaMask account to <strong>Account #0</strong> ({contractOwner || "0x90F8bf6A..."}) to send
              whitelisting transactions.
            </p>
          </div>
        </div>
      )}

      {/* ── Contract Overview Card ── */}
      <Card title="Contract Status & Configuration">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">ProductRegistry Address</label>
            <div className="font-mono text-xs bg-gray-50 p-2.5 rounded border border-gray-200 mt-1 break-all text-gray-800 font-semibold">
              {contractAddress || "Loading..."}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Connected Network</label>
            <div className="flex items-center gap-2 mt-1 p-2 bg-gray-50 rounded border border-gray-200">
              <span className={`w-2.5 h-2.5 rounded-full ${chainOk ? "bg-emerald-500" : "bg-amber-500"}`}></span>
              <span className="text-xs font-medium text-gray-700">
                {chainOk ? "Ganache Local (Chain ID 1337)" : "Check Network (Requires Chain ID 1337)"}
              </span>
              {!chainOk && (
                <button
                  onClick={ensureCorrectChain}
                  className="ml-auto text-xs bg-sky-600 text-white px-2 py-0.5 rounded hover:bg-sky-700"
                >
                  Switch Network
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Contract Owner (Deployer)</label>
            <div className="font-mono text-xs bg-gray-50 p-2 rounded border border-gray-200 mt-1 break-all text-gray-700">
              {effectiveOwner || "Reading on-chain..."}
              {isOwnerConnected && (
                <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                  YOU
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Backend Operator</label>
            <div className="font-mono text-xs bg-gray-50 p-2 rounded border border-gray-200 mt-1 break-all text-gray-700">
              {contractOperator || "Reading on-chain..."}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Whitelist Management Card ── */}
      <Card title="Whitelist Manufacturer">
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Whitelisting an Ethereum address grants it permission to sign and register new authentic products on-chain.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Manufacturer Ethereum Address
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value.trim())}
                placeholder="0x..."
                className="flex-1 font-mono text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setTargetAddress("0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b")}
                className="text-xs px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium whitespace-nowrap"
                title="Paste Ganache Account #2 (Default configured in .env)"
              >
                Use Account #2 (Default)
              </button>
            </div>
          </div>

          {/* Real-time status display */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
            <span className="font-medium text-gray-600">Current On-Chain Status:</span>
            {checkingStatus ? (
              <span className="text-gray-400">Querying chain...</span>
            ) : targetIsWhitelisted === true ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Whitelisted Manufacturer
              </span>
            ) : targetIsWhitelisted === false ? (
              <span className="text-rose-700 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> Not Whitelisted
              </span>
            ) : (
              <span className="text-gray-400">Connect wallet to inspect</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => handleWhitelist(targetAddress)}
              disabled={busy || !isOwnerConnected || targetIsWhitelisted === true}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm flex items-center gap-2 transition ${
                busy || !isOwnerConnected || targetIsWhitelisted === true
                  ? "bg-gray-300 cursor-not-allowed text-gray-500"
                  : "bg-sky-600 hover:bg-sky-700"
              }`}
            >
              {busy ? "Confirming in MetaMask..." : "✨ Whitelist via MetaMask"}
            </button>

            <button
              onClick={() => handleRevoke(targetAddress)}
              disabled={busy || !isOwnerConnected || targetIsWhitelisted !== true}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition ${
                busy || !isOwnerConnected || targetIsWhitelisted !== true
                  ? "border-gray-200 text-gray-300 cursor-not-allowed"
                  : "border-rose-200 text-rose-600 hover:bg-rose-50"
              }`}
            >
              Revoke Whitelist
            </button>
          </div>
        </div>
      </Card>

      {/* ── Quick Ganache Accounts Reference Table ── */}
      <Card title="Ganache Deterministic Accounts Reference">
        <p className="text-xs text-gray-500 mb-3">
          On local Ganache (deterministic), these accounts are created with fixed keys every restart. Use this table
          to whitelist any manufacturer account with a single click.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-gray-100 rounded-lg">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase">
                <th className="py-2.5 px-3">Account</th>
                <th className="py-2.5 px-3">Designated Role</th>
                <th className="py-2.5 px-3">Address</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {DETERMINISTIC_ACCOUNTS.map((acc) => (
                <tr key={acc.index} className="hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-semibold text-gray-700">#{acc.index}</td>
                  <td className="py-2.5 px-3 font-medium text-gray-600">
                    {acc.role}
                    {acc.index === 0 && (
                      <span className="ml-1 text-[10px] bg-sky-100 text-sky-800 font-bold px-1 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-gray-700">{acc.address}</td>
                  <td className="py-2.5 px-3 text-right">
                    {acc.index >= 2 ? (
                      <button
                        onClick={() => {
                          setTargetAddress(acc.address);
                          handleWhitelist(acc.address);
                        }}
                        disabled={busy || !isOwnerConnected}
                        className="text-xs font-medium text-sky-600 hover:text-sky-800 disabled:text-gray-300 hover:underline"
                      >
                        Whitelist
                      </button>
                    ) : (
                      <span className="text-gray-400 text-[11px]">—</span>
                    )}
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

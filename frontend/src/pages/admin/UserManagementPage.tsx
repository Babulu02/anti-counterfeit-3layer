import React, { useState } from "react";
import { useAuth, UserRole } from "../../lib/auth";
import Card from "../../components/Card";

interface PlatformUser {
  id: string;
  name: string;
  role: UserRole;
  walletAddress: string;
  assignedPermissions: string[];
  status: "active" | "suspended" | "pending";
  lastActive: string;
}

const DEFAULT_USERS: PlatformUser[] = [
  {
    id: "usr-001",
    name: "Chief Security Officer (Owner)",
    role: "ADMIN",
    walletAddress: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
    assignedPermissions: ["Full Governance", "Whitelist Minting Rights", "Contract Admin", "Revoke Roles"],
    status: "active",
    lastActive: "Just now",
  },
  {
    id: "usr-002",
    name: "Automated Backend Oracle",
    role: "ADMIN",
    walletAddress: "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0",
    assignedPermissions: ["logScan Execution", "Mark Sold", "Telemetry Relay"],
    status: "active",
    lastActive: "1 min ago",
  },
  {
    id: "usr-003",
    name: "Aether Pharma Production Lead",
    role: "MANUFACTURER",
    walletAddress: "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b",
    assignedPermissions: ["Batch Creation", "NTAG 424 SUN Encoding", "Product Enrollment"],
    status: "active",
    lastActive: "10 mins ago",
  },
  {
    id: "usr-004",
    name: "Kronos Horology Compliance",
    role: "MANUFACTURER",
    walletAddress: "0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d",
    assignedPermissions: ["Catalog Drafting", "Pending On-Chain Whitelist"],
    status: "pending",
    lastActive: "1 hour ago",
  },
];

export default function UserManagementPage() {
  const [users, setUsers] = useState<PlatformUser[]>(DEFAULT_USERS);
  const { setRole } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("MANUFACTURER");
  const [newWallet, setNewWallet] = useState("");

  const toggleUserStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, status: u.status === "active" ? "suspended" : "active" }
          : u
      )
    );
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newWallet) return;
    const newUser: PlatformUser = {
      id: `usr-${Date.now()}`,
      name: newName,
      role: newRole,
      walletAddress: newWallet,
      assignedPermissions: newRole === "ADMIN" ? ["Governance", "Security"] : ["Batch Management"],
      status: "active",
      lastActive: "New Account",
    };
    setUsers([newUser, ...users]);
    setShowModal(false);
    setNewName("");
    setNewWallet("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            RBAC // ROLE-BASED ACCESS CONTROL
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight">
            User & Role Governance
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Configure administrative accounts, associate Ethereum signing keys, and enforce permission boundaries across portals.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl bg-stark-cyan text-white text-xs font-bold font-mono hover:bg-stark-cyan/90 transition-all shadow-sm flex items-center gap-1.5"
        >
          <span>+</span>
          <span>Assign Account</span>
        </button>
      </div>

      {/* Role Definitions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-bg-card border border-stark-border shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <div>
              <h3 className="text-sm font-bold text-text-heading">ADMIN ROLE</h3>
              <span className="text-[10px] font-mono text-stark-cyan">SUPERUSER LEVEL</span>
            </div>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Full authority to execute smart contract whitelisting, review manufacturer KYC, oversee audit telemetry, and manage security incidents.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-bg-card border border-stark-border shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏭</span>
            <div>
              <h3 className="text-sm font-bold text-text-heading">MANUFACTURER ROLE</h3>
              <span className="text-[10px] font-mono text-stark-emerald">PRODUCTION LEVEL</span>
            </div>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Authorized to register company brands, create production batches, generate dynamic QR codes, and encode physical NTAG 424 SUN chips.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-bg-card border border-stark-border shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">👤</span>
            <div>
              <h3 className="text-sm font-bold text-text-heading">CONSUMER ROLE</h3>
              <span className="text-[10px] font-mono text-text-muted">PUBLIC LEVEL</span>
            </div>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Public access to scan physical QR/NFC tags, inspect multi-signal blockchain proofs, review verification history, and file counterfeit reports.
          </p>
        </div>
      </div>

      {/* User Directory */}
      <Card title={`Active Accounts & Cryptographic Identities (${users.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-text-secondary border-b border-stark-border font-mono text-[11px]">
                <th className="pb-2 pr-3">Identity Name</th>
                <th className="pb-2 pr-3">Assigned Role</th>
                <th className="pb-2 pr-3">Associated Wallet Address</th>
                <th className="pb-2 pr-3">Permissions Scope</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-stark-border/50 last:border-0 hover:bg-bg-elevated/40 transition-colors"
                >
                  <td className="py-2.5 pr-3 font-semibold text-text-heading">{u.name}</td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        u.role === "ADMIN"
                          ? "bg-stark-cyan/10 text-stark-cyan border border-stark-cyan/30"
                          : "bg-stark-emerald/10 text-stark-emerald border border-stark-emerald/30"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-text-secondary text-[11px]">{u.walletAddress}</td>
                  <td className="py-2.5 pr-3 font-mono text-text-muted text-[11px]">
                    {u.assignedPermissions.join(", ")}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase ${
                        u.status === "active"
                          ? "bg-stark-emerald/10 text-stark-emerald border border-stark-emerald/30"
                          : u.status === "pending"
                          ? "bg-stark-amber/10 text-stark-amber border border-stark-amber/30"
                          : "bg-stark-red/10 text-stark-red border border-stark-red/30"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleUserStatus(u.id)}
                      className="px-2.5 py-1 rounded bg-bg-elevated hover:bg-bg-secondary border border-stark-border font-mono text-[11px]"
                    >
                      {u.status === "active" ? "Suspend" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole(u.role)}
                      className="px-2.5 py-1 rounded bg-stark-cyan/10 hover:bg-stark-cyan/20 border border-stark-cyan/30 text-stark-cyan font-mono text-[11px]"
                    >
                      Assume Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-bg-card border border-stark-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stark-border pb-3">
              <h3 className="text-base font-bold text-text-heading">Assign New Platform Identity</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-text-muted hover:text-text-heading"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-text-secondary font-mono mb-1">Account Display Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Regional Quality Inspector"
                  className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-text-primary focus:outline-none focus:border-stark-cyan"
                />
              </div>

              <div>
                <label className="block text-text-secondary font-mono mb-1">Target Portal Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-stark-cyan"
                >
                  <option value="ADMIN">ADMIN (Superuser / Security)</option>
                  <option value="MANUFACTURER">MANUFACTURER (Production & NFC)</option>
                  <option value="CONSUMER">CONSUMER (Public Inspector)</option>
                </select>
              </div>

              <div>
                <label className="block text-text-secondary font-mono mb-1">Ethereum Wallet Address (0x...)</label>
                <input
                  type="text"
                  required
                  value={newWallet}
                  onChange={(e) => setNewWallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-stark-cyan"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stark-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-text-secondary font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-stark-cyan text-white font-bold hover:bg-stark-cyan/90 transition-all shadow-sm"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


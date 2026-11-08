import React, { createContext, useContext, useState, useEffect } from "react";
import { isMetaMaskAvailable, checkIsManufacturer, getContractDetails } from "./metamask";
import { getChainInfo } from "./api";

export type UserRole = "ADMIN" | "MANUFACTURER" | "CONSUMER";

export interface ManufacturerApplication {
  id: string;
  name: string;
  businessRegNumber: string;
  contactEmail: string;
  walletAddress: string;
  status: "approved" | "pending" | "rejected";
  submittedAt: string;
  approvedAt?: string;
  jurisdiction: string;
  brands: string[];
}

interface AuthContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  walletAddress: string | null;
  setWalletAddress: (addr: string | null) => void;
  isOwner: boolean;
  isWhitelistedManufacturer: boolean;
  applications: ManufacturerApplication[];
  submitApplication: (app: Omit<ManufacturerApplication, "id" | "status" | "submittedAt">) => void;
  updateApplicationStatus: (id: string, status: "approved" | "rejected") => void;
  currentManufacturerApp: ManufacturerApplication | null;
  logout: () => void;
}

const INITIAL_APPLICATIONS: ManufacturerApplication[] = [
  {
    id: "mfr-001",
    name: "Aether Pharma Technologies Ltd",
    businessRegNumber: "CORP-984210-EU",
    contactEmail: "security@aetherpharma.com",
    walletAddress: "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b",
    status: "approved",
    submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    approvedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    jurisdiction: "Zurich, Switzerland",
    brands: ["AetherCare", "BioShield Vaccines"],
  },
  {
    id: "mfr-002",
    name: "Kronos Luxury Horology Corp",
    businessRegNumber: "CH-LUX-55312",
    contactEmail: "compliance@kronoshorology.ch",
    walletAddress: "0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d",
    status: "pending",
    submittedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    jurisdiction: "Geneva, Switzerland",
    brands: ["Kronos Master", "Chronos Aero"],
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>(() => {
    const saved = localStorage.getItem("aether_user_role");
    if (saved === "ADMIN" || saved === "MANUFACTURER" || saved === "CONSUMER") {
      return saved;
    }
    return "CONSUMER";
  });

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isWhitelistedManufacturer, setIsWhitelistedManufacturer] = useState(false);
  const [applications, setApplications] = useState<ManufacturerApplication[]>(() => {
    try {
      const saved = localStorage.getItem("aether_mfr_applications");
      return saved ? JSON.parse(saved) : INITIAL_APPLICATIONS;
    } catch {
      return INITIAL_APPLICATIONS;
    }
  });

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem("aether_user_role", newRole);
  };

  useEffect(() => {
    try {
      localStorage.setItem("aether_mfr_applications", JSON.stringify(applications));
    } catch {}
  }, [applications]);

  // Check on-chain roles when wallet or chain config changes
  useEffect(() => {
    let mounted = true;
    async function verifyRoles() {
      if (!walletAddress) {
        setIsOwner(false);
        setIsWhitelistedManufacturer(false);
        return;
      }

      try {
        const info = await getChainInfo();
        if (mounted && info.owner && walletAddress.toLowerCase() === info.owner.toLowerCase()) {
          setIsOwner(true);
        } else if (mounted) {
          setIsOwner(false);
        }

        if (mounted && info.contract_address && isMetaMaskAvailable()) {
          const whitelisted = await checkIsManufacturer(info.contract_address, walletAddress);
          if (mounted) setIsWhitelistedManufacturer(whitelisted);
        }
      } catch (e) {
        // Fallback for offline/mock
      }
    }

    verifyRoles();
    return () => {
      mounted = false;
    };
  }, [walletAddress]);

  // Check window.ethereum initial account
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      eth.request({ method: "eth_accounts" })
        .then((accs: string[]) => {
          if (accs && accs.length > 0) {
            setWalletAddress(accs[0]);
          }
        })
        .catch(() => {});
    }
  }, []);

  const submitApplication = (app: Omit<ManufacturerApplication, "id" | "status" | "submittedAt">) => {
    const newApp: ManufacturerApplication = {
      ...app,
      id: `mfr-${Date.now()}`,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };
    setApplications((prev) => [newApp, ...prev]);
  };

  const updateApplicationStatus = (id: string, status: "approved" | "rejected") => {
    setApplications((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status,
              approvedAt: status === "approved" ? new Date().toISOString() : undefined,
            }
          : a
      )
    );
  };

  const currentManufacturerApp =
    applications.find(
      (a) =>
        walletAddress &&
        a.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    ) ||
    applications.find((a) => a.status === "approved") ||
    applications[0] ||
    null;

  const logout = () => {
    setRole("CONSUMER");
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        setRole,
        walletAddress,
        setWalletAddress,
        isOwner,
        isWhitelistedManufacturer,
        applications,
        submitApplication,
        updateApplicationStatus,
        currentManufacturerApp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};


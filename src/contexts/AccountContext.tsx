import { createContext, useContext, useState, type ReactNode } from "react";
import type { Account } from "../lib/types";

interface AccountContextValue {
  selectedAccount: Account | null;
  setSelectedAccount: (account: Account | null) => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  return (
    <AccountContext.Provider value={{ selectedAccount, setSelectedAccount }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccountContext(): AccountContextValue {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error("useAccountContext must be used within AccountProvider");
  }
  return context;
}

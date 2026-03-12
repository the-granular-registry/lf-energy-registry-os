import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { saveDataToSessionStorage, getSessionStorage, logger } from "../utils";

const AccountContext = createContext();

export const AccountProvider = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState(null);

  useEffect(() => {
    const accountDetail = getSessionStorage("account_detail");
    const accountSummary = getSessionStorage("account_summary");

    if (!!accountDetail && !!accountSummary) {
      const parsed = {
        detail: JSON.parse(accountDetail),
        summary: JSON.parse(accountSummary),
      };
      try {
        setCurrentAccount(parsed);
      } catch (err) {
        logger.error("Error setting current account:", err);
      }
    }
  }, []);

  const saveAccountDetail = useCallback(({ detail, summary }) => {
    setCurrentAccount({ detail, summary });
    // Save the object to sessionStorage as a string
    saveDataToSessionStorage("account_detail", JSON.stringify(detail));
    saveDataToSessionStorage("account_summary", JSON.stringify(summary));
  }, []);

  const value = useMemo(() => ({ currentAccount, saveAccountDetail }), [currentAccount, saveAccountDetail]);

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = () => useContext(AccountContext);

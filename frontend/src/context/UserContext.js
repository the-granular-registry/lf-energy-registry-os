import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { saveDataToSessionStorage, getSessionStorage, logger } from "../utils";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const storedUserData = getSessionStorage("user_data");
    logger.debug("UserContext - retrieved from session storage:", storedUserData);

    if (storedUserData) {
      logger.debug("UserContext - setting user data");
      setUserData(storedUserData);
    } else {
      logger.debug("UserContext - no stored user data found");
    }
  }, []);

  const saveUserData = useCallback((newData) => {
    logger.debug("UserContext - saving user data");
    setUserData(newData);
    saveDataToSessionStorage("user_data", JSON.stringify(newData));
  }, []);

  const value = useMemo(() => ({ userData, saveUserData }), [userData, saveUserData]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

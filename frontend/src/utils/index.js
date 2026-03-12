import Cookies from "js-cookie";

// Logging utility with configurable levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Set to INFO by default - change to DEBUG for development, ERROR for production
const CURRENT_LOG_LEVEL = process.env.NODE_ENV === 'development' ? LOG_LEVELS.ERROR : LOG_LEVELS.ERROR;

export const logger = {
  error: (...args) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.ERROR) {
      console.error(...args);
    }
  },
  warn: (...args) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.WARN) {
      console.warn(...args);
    }
  },
  info: (...args) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
      console.log(...args);
    }
  },
  debug: (...args) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
      console.log(...args);
    }
  },
};

export const saveDataToCookies = (key, data, options = { expires: 7 }) => {
  Cookies.set(key, data, options);
};

export const getCookies = (key) => {
  return Cookies.get(key);
};

export const removeCookies = (key) => {
  Cookies.remove(key);
};

export const removeAllCookies = () => {
  // Get all cookies
  const allCookies = Cookies.get(); // This returns an object of all cookies

  // Iterate over each cookie and remove it
  for (const cookieName in allCookies) {
    if (allCookies.hasOwnProperty(cookieName)) {
      Cookies.remove(cookieName); // Remove each cookie by name
    }
  }
};

// Save data to sessionStorage with size check
export const saveDataToSessionStorage = (key, data) => {
  try {
    logger.debug(`Saving data to sessionStorage for key ${key}`);
    sessionStorage.setItem(key, JSON.stringify(data));
    logger.debug(`Successfully saved data to sessionStorage for key ${key}`);
  } catch (error) {
    logger.error(`Error saving to sessionStorage for key ${key}:`, error);
  }
};

// Get data from sessionStorage
export const getSessionStorage = (key) => {
  try {
    logger.debug(`Retrieving data from sessionStorage for key ${key}`);
    const data = sessionStorage.getItem(key);
    
    // Only parse if data exists and isn't the string "undefined"
    if (data && data !== "undefined") {
      try {
        const parsedData = JSON.parse(data);
        logger.debug(`Parsed data from sessionStorage for key ${key}`);
        return parsedData;
      } catch (parseError) {
        logger.error(`Error parsing data from sessionStorage for key ${key}:`, parseError);
        return data; // Return raw data if parsing fails
      }
    }
    return null;
  } catch (error) {
    logger.error(`Error retrieving from sessionStorage for key ${key}:`, error);
    return null;
  }
};

// Remove data from sessionStorage
export const removeSessionStorage = (key) => {
  sessionStorage.removeItem(key);
};

// Remove all data from sessionStorage
export const removeAllSessionStorage = () => {
  sessionStorage.clear();
};

export const isAuthenticated = () => {
  const token = Cookies.get("access_token");
  return !!token;
};

export const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

export const isEqual = (obj1, obj2) => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

import axios from "axios";
import Cookies from "js-cookie";
import { logger } from "../utils";

const AUTH_LIST = ["/auth/login"];
const CSRF_EXEMPT = ["/csrf-token"];

const baseAPI = axios.create({
  // In prod behind Nginx the API is under /api/, ensure base URL reflects that
  baseURL: (process.env.REACT_APP_API_URL || "") || "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const fetchCSRFToken = async () => {
  try {
    const response = await baseAPI.get("/csrf-token");
    return response.data.csrf_token;
  } catch (error) {
    logger.error("Failed to fetch CSRF token:", error);
    return null;
  }
};

baseAPI.interceptors.request.use(
  async (config) => {
    const isAuthRoute = AUTH_LIST.some((route) => config.url?.includes(route));
    const isCSRFExempt = CSRF_EXEMPT.some((route) =>
      config.url?.includes(route)
    );

    logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);

    // If sending FormData, let the browser set the correct multipart boundary
    if (config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    }

    if (!isAuthRoute) {
      const token = Cookies.get("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        logger.debug("Added Authorization header with token");
      } else {
        logger.warn("No access token found for authenticated route");
      }
    }

    if (!isCSRFExempt && config.method !== "get") {
      const csrfToken = await fetchCSRFToken();
      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
        logger.debug("Added CSRF token to request headers");
      } else {
        logger.warn("No CSRF token available for non-GET request");
      }
    }
    return config;
  },
  (error) => {
    logger.error("Error in request interceptor:", error);
    return Promise.reject(error);
  }
);

baseAPI.interceptors.response.use(
  (response) => {
    logger.debug(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    logger.error("API Error:", error);

    // Check for a network error
    if (error.code === "ERR_NETWORK" || !error.response) {
      // Do NOT force logout on transient network errors; surface to caller
      logger.warn("Network error detected. Not redirecting; surfacing to caller.");
      const surfaced = { status: 0, message: "Network error. Please retry." };
      return Promise.reject(surfaced);
    }

    // Handle authentication errors (unauthorized)
    if (error.response?.status === 401 && window.location.pathname !== "/login") {
      const url = error.config?.url || "";
      const isAuthCheck = url.includes("/users/me") || url.includes("/auth/refresh");
      if (isAuthCheck) {
        logger.error("Auth check failed (401). Redirecting to login.");
        Cookies.remove("access_token", { path: "/" });
        window.location.href = "/login";
      } else {
        logger.warn(`401 from ${url}. Preserving session; surface error to caller.`);
      }
      return Promise.reject(error);
    }

    if (
      error.response?.status === 403 &&
      error.response?.data?.detail?.includes("CSRF")
    ) {
      logger.debug("CSRF token error. Attempting to fetch a new token.");
      const newToken = await fetchCSRFToken();
      if (newToken && error.config) {
        logger.debug("Retrying request with new CSRF token");
        error.config.headers["X-CSRF-Token"] = newToken;
        return baseAPI(error.config);
      }
    }

    // Extract as much error information as possible
    const status = error.response?.status || 500;
    let message = "An unexpected error occurred.";
    let errorDetail = null;
    
    // Try to get detailed error message
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        message = error.response.data;
      } else if (error.response.data.detail) {
        message = error.response.data.detail;
      } else if (error.response.data.message) {
        message = error.response.data.message;
      }
      
      // Save the full error object for debugging
      errorDetail = error.response.data;
    } else if (error.message) {
      message = error.message;
    }

    logger.error(`API Error: Status ${status}, Message: ${message}`);
    
    // For 500 errors, add more context to help debugging
    if (status === 500) {
      logger.error("Server error details:", {
        url: error.config?.url,
        method: error.config?.method,
        errorObject: error,
        responseData: error.response?.data
      });
    }

    return Promise.reject({ status, message, errorDetail });
  }
);

fetchCSRFToken().catch(logger.error);

export default baseAPI;

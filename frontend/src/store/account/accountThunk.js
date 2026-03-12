import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  getAccountAPI,
  getAccountSummaryAPI,
  getAccountDevicesAPI,
  getAccountWhitelistInverseAPI,
  getAccountCertificatesDevicesAPI,
  createAccountAPI,
  updateAccountAPI,
  deleteAccountAPI,
  listAllAccountsAPI,
} from "../../api/accountAPI";
import { logger } from "../../utils";

// Thunk to fetch account details
export const getAccountDetails = createAsyncThunk(
  "account/getDetails",
  async (accountId, { rejectWithValue }) => {
    try {
      const [
        accountResponse,
        accountSummaryResponse,
        devicesResponse,
        certificatesDevicesResponse,
        whiteListResponse,
      ] = await Promise.all([
        getAccountAPI(accountId),
        getAccountSummaryAPI(accountId),
        getAccountDevicesAPI(accountId),
        getAccountCertificatesDevicesAPI(accountId),
        getAccountWhitelistInverseAPI(accountId),
      ]);

      const accountDetail = {
        detail: {
          ...accountResponse.data,
          devices: devicesResponse.data,
          certificateDevices: certificatesDevicesResponse.data,
          whiteListInverse: whiteListResponse.data,
        },
        summary: accountSummaryResponse.data,
      };
      return accountDetail;
    } catch (error) {
      logger.error("Failed to fetch account details:", error);
      return rejectWithValue(error.response?.data || "An error occurred");
    }
  }
);

// Thunk to list all accounts
export const listAllAccounts = createAsyncThunk(
  "account/listAll",
  async (_, { rejectWithValue }) => {
    try {
      logger.debug("Fetching accounts list...");
      const response = await listAllAccountsAPI();
      logger.debug("Accounts list response:", response.data);
      return response.data;
    } catch (error) {
      logger.error("Failed to fetch accounts:", error);
      
      // Handle different types of errors
      if (error.response) {
        const { status, data } = error.response;
        logger.error("Error response:", data);
        logger.error("Error status:", status);
        
        let errorMessage = "Failed to fetch accounts";
        if (data?.detail) {
          errorMessage = Array.isArray(data.detail) 
            ? data.detail[0]?.msg || errorMessage
            : data.detail;
        }
        
        return rejectWithValue({
          message: errorMessage,
          status: status,
          data: data
        });
      } else if (error.request) {
        // Network error
        return rejectWithValue({
          message: "Network error. Please check your connection.",
          status: 0,
          data: null
        });
      } else {
        // Other error
        return rejectWithValue({
          message: error.message || "Failed to fetch accounts",
          status: null,
          data: null
        });
      }
    }
  }
);

// Thunk to create account
export const createAccount = createAsyncThunk(
  "account/create",
  async (accountData, { rejectWithValue }) => {
    try {
      const response = await createAccountAPI(accountData);
      return response.data;
    } catch (error) {
      logger.error("Failed to create account:", error);
      return rejectWithValue(error.response?.data || "Failed to create account");
    }
  }
);

// Thunk to update account
export const updateAccount = createAsyncThunk(
  "account/update",
  async ({ accountId, accountData }, { rejectWithValue }) => {
    try {
      const response = await updateAccountAPI(accountId, accountData);
      return response.data;
    } catch (error) {
      logger.error("Failed to update account:", error);
      return rejectWithValue(error.response?.data || "Failed to update account");
    }
  }
);

// Thunk to delete account
export const deleteAccount = createAsyncThunk(
  "account/delete",
  async (accountId, { rejectWithValue }) => {
    try {
      const response = await deleteAccountAPI(accountId);
      return { accountId, data: response.data };
    } catch (error) {
      logger.error("Failed to delete account:", error);
      return rejectWithValue(error.response?.data || "Failed to delete account");
    }
  }
);

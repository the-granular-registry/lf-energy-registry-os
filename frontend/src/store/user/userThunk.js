import { createAsyncThunk } from "@reduxjs/toolkit";
import { 
  readUserAPI, 
  readCurrentUserAPI, 
  getUsersByAccountAPI,
  createUserAPI,
  updateUserAPI,
  deleteUserAPI,
  changeUserRoleAPI
} from "../../api/userAPI";
import { saveDataToCookies, logger } from "../../utils";
import Cookies from "js-cookie";

export const readUser = createAsyncThunk(
  "user/readUser",
  async (userID, { rejectWithValue }) => {
    try {
      const response = await readUserAPI(userID);
      const userData = {
        accounts: response?.data?.accounts || [],
        userInfo: {
          username: response?.data?.username,
          role: response?.data?.role,
          userID: userID,
          organisation: response?.data?.organisation,
          email: response?.data?.email,
        },
      };

      saveDataToCookies("user_data", JSON.stringify(userData));

      return userData;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const readCurrentUser = createAsyncThunk(
  "user/readCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      logger.debug("Fetching current user data from API");
      const response = await readCurrentUserAPI();
      logger.debug("API response for current user received");

      if (!response.data) {
        logger.error("No data returned from current user API");
        return rejectWithValue({ message: "No user data returned from API", status: 404 });
      }

      const userData = {
        accounts: response?.data?.accounts || [],
        userInfo: {
          username: response?.data?.name,
          role: response?.data?.role,
          userID: response?.data?.id,
          organisation: response?.data?.organisation,
          email: response?.data?.email,
        },
      };

      logger.debug("Processed user data");
      saveDataToCookies("user_data", JSON.stringify(userData));

      return userData;
    } catch (error) {
      logger.error("Error fetching current user:", error);
      
      // Check if this is an authorization error
      if (error.status === 401) {
        logger.warn("User authentication expired or invalid. Redirecting to login.");
        // Ensure token cookie is removed
        Cookies.remove("access_token", { path: "" });
        // Return a specific error for auth issues
        return rejectWithValue({ 
          message: "Your session has expired. Please log in again.", 
          status: 401,
          isAuthError: true 
        });
      }
      
      const message = error.message || "Failed to fetch user data";
      const status = error.status || 500;
      return rejectWithValue({ message, status });
    }
  }
);

export const getUsersByAccount = createAsyncThunk(
  "user/getUsersByAccount",
  async (accountId, { rejectWithValue }) => {
    try {
      const response = await getUsersByAccountAPI(accountId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Failed to fetch users" });
    }
  }
);

export const createUser = createAsyncThunk(
  "user/createUser",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await createUserAPI(userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Failed to create user" });
    }
  }
);

export const updateUser = createAsyncThunk(
  "user/updateUser",
  async ({ userId, userData }, { rejectWithValue }) => {
    try {
      const response = await updateUserAPI(userId, userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Failed to update user" });
    }
  }
);

export const deleteUser = createAsyncThunk(
  "user/deleteUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await deleteUserAPI(userId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Failed to delete user" });
    }
  }
);

export const changeUserRole = createAsyncThunk(
  "user/changeUserRole",
  async ({ userId, role }, { rejectWithValue }) => {
    try {
      const response = await changeUserRoleAPI(userId, role);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Failed to change user role" });
    }
  }
);

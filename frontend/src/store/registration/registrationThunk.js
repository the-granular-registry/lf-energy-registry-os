import { createAsyncThunk, createAction } from "@reduxjs/toolkit";
import { registrationAPI } from "../../api/registrationAPI";
import { setError, clearError } from "../error/errorSlice";

// Reset registration state action
export const resetRegistrationState = createAction('registration/resetRegistrationState');

// Register organization thunk
export const registerOrganization = createAsyncThunk(
  "registration/registerOrganization",
  async (registrationData, { dispatch, rejectWithValue }) => {
    try {
      dispatch(clearError()); // Clear previous errors
      
      const formatted = registrationAPI.formatRegistrationData(registrationData);
      const response = await registrationAPI.registerOrganization(formatted);
      
      // Expecting response structure from our backend API:
      // {
      //   organization: { id, name, status, ... },
      //   user: { id, name, email, ... },
      //   account: { id, account_name, ... },
      //   message: "Registration successful"
      // }
      
      return response.data;
    } catch (error) {
      const status = error.response?.status || 500;
      let message;
      
      // Handle different error response formats
      if (error.response?.data?.detail) {
        // FastAPI validation error format
        if (typeof error.response.data.detail === 'string') {
          message = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Pydantic validation errors
          message = error.response.data.detail
            .map(err => `${err.loc?.[err.loc.length - 1] || 'Field'}: ${err.msg}`)
            .join(', ');
        } else {
          message = 'Validation error occurred';
        }
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      } else {
        message = "Registration failed. Please try again.";
      }

      // Handle specific HTTP status codes
      if (status === 409) {
        message = "Organization name already exists. Please choose a different name.";
      } else if (status === 422) {
        if (!message.includes('validation')) {
          message = `Validation error: ${message}`;
        }
      } else if (status === 500) {
        message = "Server error occurred. Please try again later.";
      } else if (status >= 400 && status < 500) {
        // Client errors
        if (!message) {
          message = "Invalid request. Please check your information and try again.";
        }
      } else if (status >= 500) {
        // Server errors
        message = "Server error occurred. Please try again later.";
      }

      // Store error in global error state
      dispatch(setError({ 
        status: status, 
        message: message,
        context: 'registration'
      }));

      return rejectWithValue(message);
    }
  }
);

// Additional helper thunks for form validation
export const validateRegistrationForm = createAsyncThunk(
  "registration/validateForm",
  async (formData, { rejectWithValue }) => {
    const errors = [];

    // Organization validation
    if (!formData.organization.name?.trim()) {
      errors.push("Organization name is required");
    }
    // Primary contact email derived from user email

    // User validation
    if (!formData.user.name?.trim()) {
      errors.push("User name is required");
    }
    if (!formData.user.email?.trim()) {
      errors.push("User email is required");
    }
    if (formData.user.email && 
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.user.email)) {
      errors.push("User email format is invalid");
    }
    if (!formData.user.password) {
      errors.push("Password is required");
    }
    if (formData.user.password && formData.user.password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    // Account optional

    if (errors.length > 0) {
      return rejectWithValue(errors.join(', '));
    }

    return { isValid: true };
  }
);

// Check organization name availability
export const checkOrganizationNameAvailability = createAsyncThunk(
  "registration/checkNameAvailability",
  async (organizationName, { rejectWithValue }) => {
    try {
      if (!organizationName?.trim()) {
        return { available: true, checked: false };
      }

      // This would call an API endpoint to check availability
      // For now, we'll implement basic validation
      const response = await registrationAPI.checkNameAvailability(organizationName);
      
      return {
        available: response.data.available,
        checked: true,
        name: organizationName
      };
    } catch (error) {
      // If the check fails, we'll assume it's available and let the server handle it
      return rejectWithValue("Unable to check name availability");
    }
  }
); 
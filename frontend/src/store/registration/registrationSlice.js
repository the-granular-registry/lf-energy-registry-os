import { createSlice } from "@reduxjs/toolkit";
import { 
  registerOrganization, 
  resetRegistrationState,
  validateRegistrationForm,
  checkOrganizationNameAvailability
} from "./registrationThunk";

// Initial state
const initialState = {
  isLoading: false,
  isSuccess: false,
  isError: false,
  errorMessage: null,
  registrationData: null,
  formData: {
    organization: {
      name: '',
      address: '',
      organization_type: 'ENERGY_PRODUCER',
      business_registration_number: '',
      website: '',
    },
    user: {
      name: '',
      email: '',
      password: '',
    },
    account: {
      name: '',
    },
  },
  // Additional state for enhanced UX
  validation: {
    isValidating: false,
    errors: {},
  },
  nameAvailability: {
    isChecking: false,
    available: null,
    checkedName: null,
  },
};

const registrationSlice = createSlice({
  name: "registration",
  initialState,
  reducers: {
    // Form data management actions
    updateOrganizationForm: (state, action) => {
      state.formData.organization = {
        ...state.formData.organization,
        ...action.payload,
      };
      // Clear validation errors for updated fields
      Object.keys(action.payload).forEach(field => {
        if (state.validation.errors[`organization.${field}`]) {
          delete state.validation.errors[`organization.${field}`];
        }
      });
    },
    
    updateUserForm: (state, action) => {
      state.formData.user = {
        ...state.formData.user,
        ...action.payload,
      };
      // Clear validation errors for updated fields
      Object.keys(action.payload).forEach(field => {
        if (state.validation.errors[`user.${field}`]) {
          delete state.validation.errors[`user.${field}`];
        }
      });
    },
    
    updateAccountForm: (state, action) => {
      state.formData.account = {
        ...state.formData.account,
        ...action.payload,
      };
      // Clear validation errors for updated fields
      Object.keys(action.payload).forEach(field => {
        if (state.validation.errors[`account.${field}`]) {
          delete state.validation.errors[`account.${field}`];
        }
      });
    },
    
    clearFormData: (state) => {
      state.formData = {
        organization: {
          name: '',
          address: '',
          organization_type: 'ENERGY_PRODUCER',
          business_registration_number: '',
          website: '',
        },
        user: {
          name: '',
          email: '',
          password: '',
        },
        account: {
          name: '',
        },
      };
      state.validation.errors = {};
      state.nameAvailability = {
        isChecking: false,
        available: null,
        checkedName: null,
      };
    },
    
    // Error management
    clearError: (state) => {
      state.isError = false;
      state.errorMessage = null;
    },
    
    // Set field validation errors
    setFieldValidationErrors: (state, action) => {
      state.validation.errors = {
        ...state.validation.errors,
        ...action.payload,
      };
    },
    
    clearFieldValidationErrors: (state) => {
      state.validation.errors = {};
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Register organization cases
      .addCase(registerOrganization.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.isSuccess = false;
        state.errorMessage = null;
      })
      .addCase(registerOrganization.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.errorMessage = null;
        state.registrationData = action.payload;
        // Don't clear form data on success - let the user see what was submitted
      })
      .addCase(registerOrganization.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.isSuccess = false;
        state.registrationData = null;
        
        // Handle different payload types
        if (typeof action.payload === 'object' && action.payload.message) {
          state.errorMessage = action.payload.message;
        } else {
          state.errorMessage = action.payload || 'Registration failed';
        }
      })
      
      // Reset registration state
      .addCase(resetRegistrationState, (state) => {
        state.isLoading = false;
        state.isSuccess = false;
        state.isError = false;
        state.errorMessage = null;
        state.registrationData = null;
        // Preserve form data to allow user to correct errors
      })
      
      // Form validation cases
      .addCase(validateRegistrationForm.pending, (state) => {
        state.validation.isValidating = true;
        state.validation.errors = {};
      })
      .addCase(validateRegistrationForm.fulfilled, (state) => {
        state.validation.isValidating = false;
        state.validation.errors = {};
      })
      .addCase(validateRegistrationForm.rejected, (state, action) => {
        state.validation.isValidating = false;
        // Convert error message to field-specific errors if possible
        const errorMessage = action.payload;
        if (errorMessage) {
          state.validation.errors = { general: errorMessage };
        }
      })
      
      // Name availability check cases
      .addCase(checkOrganizationNameAvailability.pending, (state) => {
        state.nameAvailability.isChecking = true;
      })
      .addCase(checkOrganizationNameAvailability.fulfilled, (state, action) => {
        state.nameAvailability.isChecking = false;
        state.nameAvailability.available = action.payload.available;
        state.nameAvailability.checkedName = action.payload.name;
      })
      .addCase(checkOrganizationNameAvailability.rejected, (state, action) => {
        state.nameAvailability.isChecking = false;
        // If check fails, assume available and let server validate
        state.nameAvailability.available = true;
        state.nameAvailability.checkedName = null;
      });
  },
});

// Export actions
export const {
  updateOrganizationForm,
  updateUserForm,
  updateAccountForm,
  clearFormData,
  clearError,
  setFieldValidationErrors,
  clearFieldValidationErrors,
} = registrationSlice.actions;

// Selectors
export const selectRegistration = (state) => state.registration;
export const selectRegistrationLoading = (state) => state.registration.isLoading;
export const selectRegistrationSuccess = (state) => state.registration.isSuccess;
export const selectRegistrationError = (state) => state.registration.isError;
export const selectRegistrationErrorMessage = (state) => state.registration.errorMessage;
export const selectRegistrationData = (state) => state.registration.registrationData;
export const selectFormData = (state) => state.registration.formData;
export const selectOrganizationFormData = (state) => state.registration.formData.organization;
export const selectUserFormData = (state) => state.registration.formData.user;
export const selectAccountFormData = (state) => state.registration.formData.account;
export const selectValidationErrors = (state) => state.registration.validation.errors;
export const selectNameAvailability = (state) => state.registration.nameAvailability;

// Computed selectors
export const selectIsFormValid = (state) => {
  const { organization, user } = state.registration.formData;
  return (
    organization.name?.trim() &&
    user.name?.trim() &&
    user.email?.trim() &&
    user.password?.length >= 8 &&
    true
  );
};

export const selectCanSubmit = (state) => {
  return (
    selectIsFormValid(state) &&
    !state.registration.isLoading &&
    !state.registration.validation.isValidating &&
    Object.keys(state.registration.validation.errors).length === 0
  );
};

// Export the resetRegistrationState action
export { resetRegistrationState } from './registrationThunk';

export default registrationSlice.reducer; 
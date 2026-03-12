/**
 * Tests for registration Redux slice
 * Following TDD principles - tests written first
 */

import { configureStore } from '@reduxjs/toolkit';
import registrationReducer from '../registrationSlice';
import { registerOrganization, resetRegistrationState } from '../registrationThunk';

// Helper function to create a test store
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      registration: registrationReducer,
    },
    preloadedState: {
      registration: preloadedState,
    },
  });
};

describe('registrationSlice', () => {
  let store;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('initial state', () => {
    test('should have correct initial state', () => {
      const state = store.getState().registration;
      
      expect(state).toEqual({
        isLoading: false,
        isSuccess: false,
        isError: false,
        errorMessage: null,
        registrationData: null,
        formData: {
          organization: {
            name: '',
            address: '',
            primary_contact_email: '',
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
      });
    });
  });

  describe('registerOrganization async thunk', () => {
    test('should handle registration pending state', () => {
      const action = { type: registerOrganization.pending.type };
      const state = registrationReducer(undefined, action);
      
      expect(state.isLoading).toBe(true);
      expect(state.isError).toBe(false);
      expect(state.isSuccess).toBe(false);
      expect(state.errorMessage).toBe(null);
    });

    test('should handle registration success', () => {
      const mockRegistrationData = {
        organization: {
          id: 1,
          name: 'Test Corp',
          status: 'PENDING',
        },
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
        },
        account: {
          id: 1,
          account_name: 'Test Account',
        },
        message: 'Registration successful',
      };

      const action = {
        type: registerOrganization.fulfilled.type,
        payload: mockRegistrationData,
      };
      
      const state = registrationReducer(undefined, action);
      
      expect(state.isLoading).toBe(false);
      expect(state.isSuccess).toBe(true);
      expect(state.isError).toBe(false);
      expect(state.errorMessage).toBe(null);
      expect(state.registrationData).toEqual(mockRegistrationData);
    });

    test('should handle registration failure', () => {
      const errorMessage = 'Organization name already exists';
      const action = {
        type: registerOrganization.rejected.type,
        payload: errorMessage,
      };
      
      const state = registrationReducer(undefined, action);
      
      expect(state.isLoading).toBe(false);
      expect(state.isError).toBe(true);
      expect(state.isSuccess).toBe(false);
      expect(state.errorMessage).toBe(errorMessage);
      expect(state.registrationData).toBe(null);
    });

    test('should handle registration failure with error object', () => {
      const errorObject = {
        message: 'Validation failed',
        details: ['Email is required', 'Name is required'],
      };
      const action = {
        type: registerOrganization.rejected.type,
        payload: errorObject,
      };
      
      const state = registrationReducer(undefined, action);
      
      expect(state.isLoading).toBe(false);
      expect(state.isError).toBe(true);
      expect(state.errorMessage).toBe(errorObject.message);
    });
  });

  describe('resetRegistrationState', () => {
    test('should reset registration state to initial state', () => {
      // Start with a state that has data
      const initialState = {
        isLoading: false,
        isSuccess: true,
        isError: false,
        errorMessage: null,
        registrationData: {
          organization: { id: 1, name: 'Test Corp' },
          user: { id: 1, name: 'Test User' },
          account: { id: 1, account_name: 'Test Account' },
        },
        formData: {
          organization: {
            name: 'Test Corp',
            address: '123 Test St',
            primary_contact_email: 'test@example.com',
            organization_type: 'ENERGY_PRODUCER',
            business_registration_number: 'BR123',
            website: 'https://test.com',
          },
          user: {
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
          },
          account: {
            name: 'Test Account',
          },
        },
      };

      const action = { type: resetRegistrationState.type };
      const state = registrationReducer(initialState, action);
      
      // Should reset to initial state but keep form data
      expect(state.isLoading).toBe(false);
      expect(state.isSuccess).toBe(false);
      expect(state.isError).toBe(false);
      expect(state.errorMessage).toBe(null);
      expect(state.registrationData).toBe(null);
      // Form data should be preserved to allow user to correct errors
      expect(state.formData).toEqual(initialState.formData);
    });
  });

  describe('form data management', () => {
    test('should update organization form data', () => {
      const action = {
        type: 'registration/updateOrganizationForm',
        payload: {
          name: 'Updated Corp',
          address: '456 Updated St',
        },
      };
      
      const state = registrationReducer(undefined, action);
      
      expect(state.formData.organization.name).toBe('Updated Corp');
      expect(state.formData.organization.address).toBe('456 Updated St');
      // Other fields should remain unchanged
      expect(state.formData.organization.organization_type).toBe('ENERGY_PRODUCER');
    });

    test('should update user form data', () => {
      const action = {
        type: 'registration/updateUserForm',
        payload: {
          name: 'Updated User',
          email: 'updated@example.com',
        },
      };
      
      const state = registrationReducer(undefined, action);
      
      expect(state.formData.user.name).toBe('Updated User');
      expect(state.formData.user.email).toBe('updated@example.com');
      // Password should remain unchanged
      expect(state.formData.user.password).toBe('');
    });

    test('should update account form data', () => {
      const action = {
        type: 'registration/updateAccountForm',
        payload: {
          name: 'Updated Account',
        },
      };
      
      const state = registrationReducer(undefined, action);
      
      expect(state.formData.account.name).toBe('Updated Account');
    });

    test('should clear form data', () => {
      const initialState = {
        isLoading: false,
        isSuccess: false,
        isError: false,
        errorMessage: null,
        registrationData: null,
        formData: {
          organization: {
            name: 'Test Corp',
            address: '123 Test St',
            primary_contact_email: 'test@example.com',
            organization_type: 'TRADER',
            business_registration_number: 'BR123',
            website: 'https://test.com',
          },
          user: {
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
          },
          account: {
            name: 'Test Account',
          },
        },
      };

      const action = { type: 'registration/clearFormData' };
      const state = registrationReducer(initialState, action);
      
      // Should reset form data to initial empty state
      expect(state.formData).toEqual({
        organization: {
          name: '',
          address: '',
          primary_contact_email: '',
          organization_type: 'ENERGY_PRODUCER', // Default value
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
      });
    });
  });

  describe('error handling', () => {
    test('should clear error when starting new registration', () => {
      const initialState = {
        isLoading: false,
        isSuccess: false,
        isError: true,
        errorMessage: 'Previous error',
        registrationData: null,
        formData: {
          organization: { name: '', address: '', primary_contact_email: '', organization_type: 'ENERGY_PRODUCER', business_registration_number: '', website: '' },
          user: { name: '', email: '', password: '' },
          account: { name: '' },
        },
      };

      const action = { type: registerOrganization.pending.type };
      const state = registrationReducer(initialState, action);
      
      expect(state.isError).toBe(false);
      expect(state.errorMessage).toBe(null);
    });

    test('should handle network errors gracefully', () => {
      const networkError = 'Network Error: Unable to connect';
      const action = {
        type: registerOrganization.rejected.type,
        payload: networkError,
      };
      
      const state = registrationReducer(undefined, action);
      
      expect(state.isError).toBe(true);
      expect(state.errorMessage).toBe(networkError);
    });
  });

  describe('state persistence', () => {
    test('should maintain form data through registration attempts', () => {
      const formData = {
        organization: {
          name: 'Test Corp',
          address: '123 Test St',
          primary_contact_email: 'test@example.com',
          organization_type: 'ENERGY_PRODUCER',
          business_registration_number: '',
          website: '',
        },
        user: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        },
        account: {
          name: 'Test Account',
        },
      };

      let state = registrationReducer(undefined, {
        type: 'registration/updateOrganizationForm',
        payload: formData.organization,
      });
      
      state = registrationReducer(state, {
        type: 'registration/updateUserForm',
        payload: formData.user,
      });
      
      state = registrationReducer(state, {
        type: 'registration/updateAccountForm',
        payload: formData.account,
      });

      // Form data should be maintained through registration failure
      const errorAction = {
        type: registerOrganization.rejected.type,
        payload: 'Registration failed',
      };
      
      state = registrationReducer(state, errorAction);
      
      expect(state.formData).toEqual(formData);
      expect(state.isError).toBe(true);
    });
  });
}); 
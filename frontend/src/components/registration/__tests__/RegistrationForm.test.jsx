/**
 * Tests for RegistrationForm component
 * Following TDD principles - tests written first
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';

import RegistrationForm from '../RegistrationForm';
import registrationReducer from '../../../store/registration/registrationSlice';
import errorReducer from '../../../store/error/errorSlice';

// Mock the registration API
jest.mock('../../../api/registrationAPI', () => ({
  registrationAPI: {
    registerOrganization: jest.fn(),
    validateFormData: jest.fn(),
    formatRegistrationData: jest.fn(),
  },
}));

// Helper function to create test store
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      registration: registrationReducer,
      error: errorReducer,
    },
    preloadedState,
  });
};

// Helper function to render component with store
const renderWithProviders = (component, store = createTestStore()) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('RegistrationForm', () => {
  let store;
  let user;

  beforeEach(() => {
    store = createTestStore();
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('Form Rendering', () => {
    test('renders all form sections correctly', () => {
      renderWithProviders(<RegistrationForm />);

      // Check for main sections
      expect(screen.getByText(/organization information/i)).toBeInTheDocument();
      expect(screen.getByText(/user information/i)).toBeInTheDocument();
      expect(screen.getByText(/account information/i)).toBeInTheDocument();
    });

    test('renders organization form fields', () => {
      renderWithProviders(<RegistrationForm />);

      // Organization fields
      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/primary contact email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/organization type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/business registration number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/website/i)).toBeInTheDocument();
    });

    test('renders user form fields', () => {
      renderWithProviders(<RegistrationForm />);

      // User fields
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    test('renders account form fields', () => {
      renderWithProviders(<RegistrationForm />);

      // Account fields
      expect(screen.getByLabelText(/account name/i)).toBeInTheDocument();
    });

    test('renders submit button', () => {
      renderWithProviders(<RegistrationForm />);

      const submitButton = screen.getByRole('button', { name: /register organization/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeDisabled(); // Should be disabled initially
    });
  });

  describe('Form Validation', () => {
    test('shows validation errors for required fields', async () => {
      renderWithProviders(<RegistrationForm />);

      const submitButton = screen.getByRole('button', { name: /register organization/i });
      
      // Try to submit empty form
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/organization name is required/i)).toBeInTheDocument();
        // address optional, primary contact derived from user email
        expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email address is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    test('validates email format', async () => {
      renderWithProviders(<RegistrationForm />);

      const primaryEmailInput = screen.getByLabelText(/primary contact email/i);
      const userEmailInput = screen.getByLabelText(/email address/i);

      // Enter invalid email formats
      await user.type(primaryEmailInput, 'invalid-email');
      await user.type(userEmailInput, 'another-invalid-email');
      await user.tab(); // Trigger validation

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    test('validates password strength', async () => {
      renderWithProviders(<RegistrationForm />);

      const passwordInput = screen.getByLabelText(/password/i);

      // Enter weak password
      await user.type(passwordInput, 'weak');
      await user.tab(); // Trigger validation

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    test('enables submit button when form is valid', async () => {
      renderWithProviders(<RegistrationForm />);

      // Fill all required fields with valid data
      await user.type(screen.getByLabelText(/organization name/i), 'Test Corp');
      // address optional
      await user.type(screen.getByLabelText(/full name/i), 'Test User');
      await user.type(screen.getByLabelText(/email address/i), 'user@test.com');
      await user.type(screen.getByLabelText(/password/i), 'securepassword123');
      // Account optional

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /register organization/i });
        expect(submitButton).toBeEnabled();
      });
    });
  });

  describe('Form Submission', () => {
    const fillValidForm = async () => {
      await user.type(screen.getByLabelText(/organization name/i), 'Test Corp');
      // address optional
      await user.type(screen.getByLabelText(/full name/i), 'Test User');
      await user.type(screen.getByLabelText(/email address/i), 'user@test.com');
      await user.type(screen.getByLabelText(/password/i), 'securepassword123');
    };

    test('submits form with correct data', async () => {
      renderWithProviders(<RegistrationForm />);

      await fillValidForm();

      const submitButton = screen.getByRole('button', { name: /register organization/i });
      await user.click(submitButton);

      // Check that form data is correct in store
      const state = store.getState();
      expect(state.registration.formData.organization.name).toBe('Test Corp');
      expect(state.registration.formData.user.email).toBe('user@test.com');
    });

    test('displays loading state during submission', async () => {
      const initialState = {
        registration: {
          isLoading: true,
          isSuccess: false,
          isError: false,
          errorMessage: null,
          registrationData: null,
          formData: {
            organization: { name: '', address: '', primary_contact_email: '', organization_type: 'ENERGY_PRODUCER', business_registration_number: '', website: '' },
            user: { name: '', email: '', password: '' },
            account: { name: '' },
          },
          validation: { isValidating: false, errors: {} },
          nameAvailability: { isChecking: false, available: null, checkedName: null },
        },
      };

      const loadingStore = createTestStore(initialState);
      renderWithProviders(<RegistrationForm />, loadingStore);

      const submitButton = screen.getByRole('button', { name: /registering/i });
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/registering/i)).toBeInTheDocument();
    });

    test('shows success message on successful registration', async () => {
      const successState = {
        registration: {
          isLoading: false,
          isSuccess: true,
          isError: false,
          errorMessage: null,
          registrationData: {
            organization: { id: 1, name: 'Test Corp' },
            user: { id: 1, name: 'Test User' },
            account: { id: 1, account_name: 'Test Account' },
            message: 'Registration successful',
          },
          formData: {
            organization: { name: 'Test Corp', address: '123 Test St', primary_contact_email: 'test@test.com', organization_type: 'ENERGY_PRODUCER', business_registration_number: '', website: '' },
            user: { name: 'Test User', email: 'user@test.com', password: 'password123' },
            account: { name: 'Test Account' },
          },
          validation: { isValidating: false, errors: {} },
          nameAvailability: { isChecking: false, available: null, checkedName: null },
        },
      };

      const successStore = createTestStore(successState);
      renderWithProviders(<RegistrationForm />, successStore);

      expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
      expect(screen.getByText(/organization.*test corp.*successfully registered/i)).toBeInTheDocument();
    });

    test('displays error messages on registration failure', async () => {
      const errorState = {
        registration: {
          isLoading: false,
          isSuccess: false,
          isError: true,
          errorMessage: 'Organization name already exists',
          registrationData: null,
          formData: {
            organization: { name: 'Test Corp', address: '123 Test St', primary_contact_email: 'test@test.com', organization_type: 'ENERGY_PRODUCER', business_registration_number: '', website: '' },
            user: { name: 'Test User', email: 'user@test.com', password: 'password123' },
            account: { name: 'Test Account' },
          },
          validation: { isValidating: false, errors: {} },
          nameAvailability: { isChecking: false, available: null, checkedName: null },
        },
      };

      const errorStore = createTestStore(errorState);
      renderWithProviders(<RegistrationForm />, errorStore);

      expect(screen.getByText(/organization name already exists/i)).toBeInTheDocument();
    });
  });

  describe('User Experience Features', () => {
    test('provides real-time field validation feedback', async () => {
      renderWithProviders(<RegistrationForm />);

      const emailInput = screen.getByLabelText(/primary contact email/i);
      
      // Start typing invalid email
      await user.type(emailInput, 'invalid');
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });

      // Complete valid email
      await user.clear(emailInput);
      await user.type(emailInput, 'valid@email.com');
      
      // Error should disappear
      await waitFor(() => {
        expect(screen.queryByText(/invalid email format/i)).not.toBeInTheDocument();
      });
    });

    test('shows character count for password field', async () => {
      renderWithProviders(<RegistrationForm />);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'test123');

      // Should show character count or strength indicator
      expect(screen.getByText(/7.*characters/i) || screen.getByText(/weak/i)).toBeInTheDocument();
    });

    test('allows organization type selection', async () => {
      renderWithProviders(<RegistrationForm />);

      const orgTypeSelect = screen.getByLabelText(/organization type/i);
      
      // Should have default value
      expect(orgTypeSelect).toHaveValue('ENERGY_PRODUCER');

      // Should allow changing
      await user.selectOptions(orgTypeSelect, 'TRADER');
      expect(orgTypeSelect).toHaveValue('TRADER');
    });

    test('handles form reset correctly', async () => {
      renderWithProviders(<RegistrationForm />);

      // Fill some fields
      await user.type(screen.getByLabelText(/organization name/i), 'Test Corp');
      await user.type(screen.getByLabelText(/full name/i), 'Test User');

      // Find and click reset button if it exists
      const resetButton = screen.queryByRole('button', { name: /reset|clear/i });
      if (resetButton) {
        await user.click(resetButton);

        // Form should be cleared
        expect(screen.getByLabelText(/organization name/i)).toHaveValue('');
        expect(screen.getByLabelText(/full name/i)).toHaveValue('');
      }
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels and roles', () => {
      renderWithProviders(<RegistrationForm />);

      // Form should have proper role
      const form = screen.getByRole('form') || screen.getByTestId('registration-form');
      expect(form).toBeInTheDocument();

      // All inputs should have labels
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toHaveAttribute('aria-label');
      });
    });

    test('supports keyboard navigation', async () => {
      renderWithProviders(<RegistrationForm />);

      const firstInput = screen.getByLabelText(/organization name/i);
      firstInput.focus();

      // Tab through fields
      await user.tab();
      expect(screen.getByLabelText(/address/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/primary contact email/i)).toHaveFocus();
    });

    test('announces validation errors to screen readers', async () => {
      renderWithProviders(<RegistrationForm />);

      const submitButton = screen.getByRole('button', { name: /register organization/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorElements = screen.getAllByRole('alert');
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Responsive Design', () => {
    test('adapts to mobile viewport', () => {
      // Mock window size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(<RegistrationForm />);

      // Form should still be functional in mobile view
      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /register organization/i })).toBeInTheDocument();
    });
  });
}); 
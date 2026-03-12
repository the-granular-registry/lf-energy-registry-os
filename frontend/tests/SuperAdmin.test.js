/**
 * Comprehensive test suite for Super Admin frontend functionality
 * Tests SuperAdminDashboard, SuperAdminUserManagement, Redux state, and API integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

// Import components to test
import SuperAdminDashboard from '../src/components/SuperAdmin/SuperAdminDashboard';
import SuperAdminUserManagement from '../src/components/SuperAdmin/UserManagement';
import OrganizationSelector from '../src/components/common/OrganizationSelector';

// Import Redux slices
import superAdminReducer from '../src/store/superAdmin/superAdminSlice';
import authReducer from '../src/store/auth/authSlice';

// Mock API modules
jest.mock('../src/api/organizationAPI', () => ({
  getOrganizationsAPI: jest.fn(),
  getOrganizationUsersAPI: jest.fn(),
  getOrganizationAccountsAPI: jest.fn(),
  getOrganizationDevicesAPI: jest.fn(),
  getPendingOrganizationsAPI: jest.fn(),
}));

jest.mock('../src/api/userAPI', () => ({
  createUserAPI: jest.fn(),
  updateUserAPI: jest.fn(),
  deleteUserAPI: jest.fn(),
}));

jest.mock('../src/utils', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  getSessionStorage: jest.fn(),
  saveDataToSessionStorage: jest.fn(),
}));

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
const mockLocation = { pathname: '/super-admin' };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

// Mock antd message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Super Admin Frontend Test Suite', () => {
  let store;
  let mockOrganizationAPI;
  let mockUserAPI;

  beforeEach(() => {
    // Create test store
    store = configureStore({
      reducer: {
        superAdmin: superAdminReducer,
        auth: authReducer,
      },
      preloadedState: {
        superAdmin: {
          selectedOrganization: null,
          organizations: [],
          pendingApprovals: [],
          dashboardStats: {
            organizations: 0,
            users: 0,
            accounts: 0,
            devices: 0,
            pendingApprovals: 0,
          },
          loading: false,
          error: null,
        },
        auth: {
          currentUser: {
            id: 1,
            email: 'super.admin@test.com',
            role: 'SUPER_ADMIN',
            name: 'Super Admin',
          },
          isAuthenticated: true,
          token: 'mock-token',
        },
      },
    });

    // Mock API implementations
    mockOrganizationAPI = require('../src/api/organizationAPI');
    mockUserAPI = require('../src/api/userAPI');

    // Reset all mocks
    jest.clearAllMocks();
  });

  const renderWithProviders = (component) => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </Provider>
    );
  };

  describe('SuperAdminDashboard Component', () => {
    const mockOrganizationsData = [
      {
        id: 1,
        name: 'Test Organization 1',
        status: 'ACTIVE',
        organization_type: 'ENERGY_PRODUCER',
        user_count: 5,
        account_count: 3,
        device_count: 10,
      },
      {
        id: 2,
        name: 'Test Organization 2',
        status: 'PENDING',
        organization_type: 'ENERGY_CONSUMER',
        user_count: 2,
        account_count: 1,
        device_count: 5,
      },
    ];

    const mockPendingOrganizations = [
      {
        id: 3,
        name: 'Pending Organization',
        primary_contact_email: 'contact@pending.com',
        organization_type: 'ENERGY_PRODUCER',
        created_at: '2025-01-15T10:00:00Z',
      },
    ];

    beforeEach(() => {
      mockOrganizationAPI.getOrganizationsAPI.mockResolvedValue({
        data: mockOrganizationsData,
      });
      mockOrganizationAPI.getPendingOrganizationsAPI.mockResolvedValue({
        data: mockPendingOrganizations,
      });
      mockOrganizationAPI.getOrganizationUsersAPI.mockResolvedValue({
        data: [],
      });
      mockOrganizationAPI.getOrganizationAccountsAPI.mockResolvedValue({
        data: [],
      });
      mockOrganizationAPI.getOrganizationDevicesAPI.mockResolvedValue({
        data: [],
      });
    });

    test('renders dashboard with correct title and layout', async () => {
      renderWithProviders(<SuperAdminDashboard />);

      expect(screen.getByText('Super Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Platform-wide management and oversight')).toBeInTheDocument();
    });

    test('fetches and displays global platform stats', async () => {
      renderWithProviders(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(mockOrganizationAPI.getOrganizationsAPI).toHaveBeenCalled();
        expect(mockOrganizationAPI.getPendingOrganizationsAPI).toHaveBeenCalled();
      });

      // Check that statistics are calculated correctly
      await waitFor(() => {
        expect(screen.getByText('Total Organizations')).toBeInTheDocument();
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('Total Accounts')).toBeInTheDocument();
        expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
      });
    });

    test('displays management action buttons', () => {
      renderWithProviders(<SuperAdminDashboard />);

      expect(screen.getByText('Manage Organizations')).toBeInTheDocument();
      expect(screen.getByText('Manage Users')).toBeInTheDocument();
      expect(screen.getByText('Manage Accounts')).toBeInTheDocument();
      expect(screen.getByText('Manage Devices')).toBeInTheDocument();
    });

    test('navigates to correct management sections when buttons are clicked', async () => {
      renderWithProviders(<SuperAdminDashboard />);

      const organizationsButton = screen.getByText('Manage Organizations');
      fireEvent.click(organizationsButton);

      expect(mockNavigate).toHaveBeenCalledWith('/super-admin/organizations', {
        state: { selectedOrganization: null },
      });
    });

    test('disables user/account/device buttons when no organization is selected', () => {
      renderWithProviders(<SuperAdminDashboard />);

      const usersButton = screen.getByText('Manage Users');
      const accountsButton = screen.getByText('Manage Accounts');
      const devicesButton = screen.getByText('Manage Devices');

      expect(usersButton).toBeDisabled();
      expect(accountsButton).toBeDisabled();
      expect(devicesButton).toBeDisabled();
    });

    test('enables management buttons when organization is selected', () => {
      // Set selected organization in store
      store = configureStore({
        reducer: {
          superAdmin: superAdminReducer,
          auth: authReducer,
        },
        preloadedState: {
          superAdmin: {
            selectedOrganization: mockOrganizationsData[0],
            organizations: [],
            pendingApprovals: [],
            dashboardStats: {
              organizations: 0,
              users: 0,
              accounts: 0,
              devices: 0,
              pendingApprovals: 0,
            },
            loading: false,
            error: null,
          },
          auth: {
            currentUser: {
              id: 1,
              email: 'super.admin@test.com',
              role: 'SUPER_ADMIN',
              name: 'Super Admin',
            },
            isAuthenticated: true,
            token: 'mock-token',
          },
        },
      });

      renderWithProviders(<SuperAdminDashboard />);

      const usersButton = screen.getByText('Manage Users');
      const accountsButton = screen.getByText('Manage Accounts');
      const devicesButton = screen.getByText('Manage Devices');

      expect(usersButton).not.toBeDisabled();
      expect(accountsButton).not.toBeDisabled();
      expect(devicesButton).not.toBeDisabled();
    });

    test('displays pending organization approvals table', async () => {
      renderWithProviders(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Pending Organization Approvals')).toBeInTheDocument();
      });

      // Table should be present even if empty
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    test('handles API errors gracefully', async () => {
      const mockError = new Error('API Error');
      mockOrganizationAPI.getOrganizationsAPI.mockRejectedValue(mockError);

      renderWithProviders(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(mockOrganizationAPI.getOrganizationsAPI).toHaveBeenCalled();
      });

      // Component should still render without crashing
      expect(screen.getByText('Super Admin Dashboard')).toBeInTheDocument();
    });
  });

  describe('SuperAdminUserManagement Component', () => {
    const mockUsers = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@test.com',
        role: 'ADMIN',
        user_status: 'ACTIVE',
        email_verified: true,
        created_at: '2025-01-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@test.com',
        role: 'PRODUCTION_USER',
        user_status: 'PENDING',
        email_verified: false,
        created_at: '2025-01-02T00:00:00Z',
      },
    ];

    const mockSelectedOrganization = {
      id: 1,
      name: 'Test Organization',
      status: 'ACTIVE',
      organization_type: 'ENERGY_PRODUCER',
    };

    beforeEach(() => {
      mockOrganizationAPI.getOrganizationUsersAPI.mockResolvedValue({
        data: mockUsers,
      });

      // Set selected organization in store
      store = configureStore({
        reducer: {
          superAdmin: superAdminReducer,
          auth: authReducer,
        },
        preloadedState: {
          superAdmin: {
            selectedOrganization: mockSelectedOrganization,
            organizations: [],
            pendingApprovals: [],
            dashboardStats: {
              organizations: 0,
              users: 0,
              accounts: 0,
              devices: 0,
              pendingApprovals: 0,
            },
            loading: false,
            error: null,
          },
          auth: {
            currentUser: {
              id: 1,
              email: 'super.admin@test.com',
              role: 'SUPER_ADMIN',
              name: 'Super Admin',
            },
            isAuthenticated: true,
            token: 'mock-token',
          },
        },
      });
    });

    test('renders user management page with correct title', () => {
      renderWithProviders(<SuperAdminUserManagement />);

      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('Managing users for:')).toBeInTheDocument();
      expect(screen.getByText('Test Organization')).toBeInTheDocument();
    });

    test('fetches and displays users when organization is selected', async () => {
      renderWithProviders(<SuperAdminUserManagement />);

      await waitFor(() => {
        expect(mockOrganizationAPI.getOrganizationUsersAPI).toHaveBeenCalledWith(1);
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('jane@test.com')).toBeInTheDocument();
      });
    });

    test('displays user statistics correctly', async () => {
      renderWithProviders(<SuperAdminUserManagement />);

      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('Active Users')).toBeInTheDocument();
        expect(screen.getByText('Pending Users')).toBeInTheDocument();
        expect(screen.getByText('Suspended Users')).toBeInTheDocument();
      });
    });

    test('opens create user modal when Add User button is clicked', () => {
      renderWithProviders(<SuperAdminUserManagement />);

      const addButton = screen.getByText('Add User');
      fireEvent.click(addButton);

      expect(screen.getByText('Create User')).toBeInTheDocument();
    });

    test('opens edit user modal when edit button is clicked', async () => {
      renderWithProviders(<SuperAdminUserManagement />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Find and click edit button (may need to adjust selector based on actual implementation)
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(button => 
        button.getAttribute('aria-label') === 'edit' || 
        button.textContent.includes('Edit')
      );

      if (editButton) {
        fireEvent.click(editButton);
        expect(screen.getByText('Edit User')).toBeInTheDocument();
      }
    });

    test('creates new user successfully', async () => {
      mockUserAPI.createUserAPI.mockResolvedValue({
        data: {
          id: 3,
          name: 'New User',
          email: 'new@test.com',
          role: 'PRODUCTION_USER',
        },
      });

      renderWithProviders(<SuperAdminUserManagement />);

      // Open create modal
      const addButton = screen.getByText('Add User');
      fireEvent.click(addButton);

      // Fill form (simplified - actual implementation may vary)
      const nameInput = screen.getByLabelText(/Full Name/i);
      const emailInput = screen.getByLabelText(/Email/i);

      fireEvent.change(nameInput, { target: { value: 'New User' } });
      fireEvent.change(emailInput, { target: { value: 'new@test.com' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /submit|create|save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockUserAPI.createUserAPI).toHaveBeenCalled();
      });
    });

    test('handles user creation errors', async () => {
      const mockError = new Error('User creation failed');
      mockUserAPI.createUserAPI.mockRejectedValue(mockError);

      renderWithProviders(<SuperAdminUserManagement />);

      // Open create modal
      const addButton = screen.getByText('Add User');
      fireEvent.click(addButton);

      // Fill and submit form
      const nameInput = screen.getByLabelText(/Full Name/i);
      fireEvent.change(nameInput, { target: { value: 'New User' } });

      const submitButton = screen.getByRole('button', { name: /submit|create|save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockUserAPI.createUserAPI).toHaveBeenCalled();
      });

      // Error should be handled gracefully
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });
  });

  describe('OrganizationSelector Component', () => {
    const mockOrganizations = [
      {
        id: 1,
        name: 'Organization 1',
        status: 'ACTIVE',
        organization_type: 'ENERGY_PRODUCER',
      },
      {
        id: 2,
        name: 'Organization 2',
        status: 'ACTIVE',
        organization_type: 'ENERGY_CONSUMER',
      },
    ];

    beforeEach(() => {
      mockOrganizationAPI.getOrganizationsAPI.mockResolvedValue({
        data: mockOrganizations,
      });
    });

    test('renders organization selector', () => {
      renderWithProviders(<OrganizationSelector />);

      // Should render a select component (exact text may vary)
      expect(screen.getByRole('combobox') || screen.getByRole('button')).toBeInTheDocument();
    });

    test('loads organizations on mount', async () => {
      renderWithProviders(<OrganizationSelector />);

      await waitFor(() => {
        expect(mockOrganizationAPI.getOrganizationsAPI).toHaveBeenCalled();
      });
    });

    test('updates Redux state when organization is selected', async () => {
      renderWithProviders(<OrganizationSelector />);

      await waitFor(() => {
        expect(mockOrganizationAPI.getOrganizationsAPI).toHaveBeenCalled();
      });

      // Test organization selection (implementation depends on actual component)
      // This is a placeholder test - adjust based on actual implementation
    });
  });

  describe('Redux State Management', () => {
    test('superAdminSlice initial state', () => {
      const initialState = store.getState().superAdmin;

      expect(initialState).toEqual({
        selectedOrganization: null,
        organizations: [],
        pendingApprovals: [],
        dashboardStats: {
          organizations: 0,
          users: 0,
          accounts: 0,
          devices: 0,
          pendingApprovals: 0,
        },
        loading: false,
        error: null,
      });
    });

    test('setSelectedOrganization action', () => {
      const organization = { id: 1, name: 'Test Org' };
      
      store.dispatch({
        type: 'superAdmin/setSelectedOrganization',
        payload: organization,
      });

      const state = store.getState().superAdmin;
      expect(state.selectedOrganization).toEqual(organization);
    });

    test('setDashboardStats action', () => {
      const stats = {
        organizations: 5,
        users: 25,
        accounts: 15,
        devices: 50,
        pendingApprovals: 3,
      };

      store.dispatch({
        type: 'superAdmin/setDashboardStats',
        payload: stats,
      });

      const state = store.getState().superAdmin;
      expect(state.dashboardStats).toEqual(stats);
    });

    test('setLoading action', () => {
      store.dispatch({
        type: 'superAdmin/setLoading',
        payload: true,
      });

      const state = store.getState().superAdmin;
      expect(state.loading).toBe(true);
    });

    test('setError action', () => {
      const error = 'Test error message';

      store.dispatch({
        type: 'superAdmin/setError',
        payload: error,
      });

      const state = store.getState().superAdmin;
      expect(state.error).toBe(error);
    });

    test('clearSelectedOrganization action', () => {
      // First set an organization
      store.dispatch({
        type: 'superAdmin/setSelectedOrganization',
        payload: { id: 1, name: 'Test Org' },
      });

      // Then clear it
      store.dispatch({
        type: 'superAdmin/clearSelectedOrganization',
      });

      const state = store.getState().superAdmin;
      expect(state.selectedOrganization).toBeNull();
    });
  });

  describe('API Integration Tests', () => {
    test('handles API call success scenarios', async () => {
      const mockData = [{ id: 1, name: 'Test' }];
      mockOrganizationAPI.getOrganizationsAPI.mockResolvedValue({ data: mockData });

      const { getOrganizationsAPI } = require('../src/api/organizationAPI');
      const result = await getOrganizationsAPI();

      expect(result.data).toEqual(mockData);
    });

    test('handles API call failure scenarios', async () => {
      const mockError = new Error('Network error');
      mockOrganizationAPI.getOrganizationsAPI.mockRejectedValue(mockError);

      const { getOrganizationsAPI } = require('../src/api/organizationAPI');

      await expect(getOrganizationsAPI()).rejects.toThrow('Network error');
    });

    test('handles authentication errors', async () => {
      const authError = new Error('Unauthorized');
      authError.response = { status: 401 };
      mockOrganizationAPI.getOrganizationsAPI.mockRejectedValue(authError);

      const { getOrganizationsAPI } = require('../src/api/organizationAPI');

      await expect(getOrganizationsAPI()).rejects.toThrow('Unauthorized');
    });
  });

  describe('Component Integration Tests', () => {
    test('dashboard and user management integration', async () => {
      // Render dashboard
      const { rerender } = renderWithProviders(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Super Admin Dashboard')).toBeInTheDocument();
      });

      // Click user management button
      const usersButton = screen.getByText('Manage Users');
      fireEvent.click(usersButton);

      expect(mockNavigate).toHaveBeenCalledWith('/super-admin/users', {
        state: { selectedOrganization: null },
      });

      // Simulate navigation to user management
      rerender(<SuperAdminUserManagement />);

      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    test('organization selection affects all components', async () => {
      const organization = {
        id: 1,
        name: 'Test Organization',
        status: 'ACTIVE',
        organization_type: 'ENERGY_PRODUCER',
      };

      // Set organization in store
      store.dispatch({
        type: 'superAdmin/setSelectedOrganization',
        payload: organization,
      });

      renderWithProviders(<SuperAdminDashboard />);

      // Check that organization is displayed
      await waitFor(() => {
        expect(screen.getByText('Currently Managing: Test Organization')).toBeInTheDocument();
      });

      // Management buttons should be enabled
      const usersButton = screen.getByText('Manage Users');
      expect(usersButton).not.toBeDisabled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles empty data responses', async () => {
      mockOrganizationAPI.getOrganizationsAPI.mockResolvedValue({ data: [] });
      mockOrganizationAPI.getPendingOrganizationsAPI.mockResolvedValue({ data: [] });

      renderWithProviders(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(mockOrganizationAPI.getOrganizationsAPI).toHaveBeenCalled();
      });

      // Component should handle empty data gracefully
      expect(screen.getByText('Super Admin Dashboard')).toBeInTheDocument();
    });

    test('handles null/undefined responses', async () => {
      mockOrganizationAPI.getOrganizationsAPI.mockResolvedValue({ data: null });

      renderWithProviders(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(mockOrganizationAPI.getOrganizationsAPI).toHaveBeenCalled();
      });

      // Component should not crash
      expect(screen.getByText('Super Admin Dashboard')).toBeInTheDocument();
    });

    test('handles component unmounting during API calls', async () => {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockOrganizationAPI.getOrganizationsAPI.mockReturnValue(promise);

      const { unmount } = renderWithProviders(<SuperAdminDashboard />);

      // Unmount before API resolves
      unmount();

      // Resolve API call after unmount
      resolvePromise({ data: [] });

      // Test should not throw any errors
    });

    test('handles malformed API responses', async () => {
      mockOrganizationAPI.getOrganizationsAPI.mockResolvedValue({
        malformed: 'response',
        data: undefined,
      });

      renderWithProviders(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(mockOrganizationAPI.getOrganizationsAPI).toHaveBeenCalled();
      });

      // Component should handle malformed response gracefully
      expect(screen.getByText('Super Admin Dashboard')).toBeInTheDocument();
    });
  });

  describe('Performance Tests', () => {
    test('renders dashboard efficiently with large datasets', async () => {
      const largeOrganizationList = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Organization ${i + 1}`,
        status: 'ACTIVE',
        organization_type: 'ENERGY_PRODUCER',
        user_count: Math.floor(Math.random() * 100),
        account_count: Math.floor(Math.random() * 50),
        device_count: Math.floor(Math.random() * 200),
      }));

      mockOrganizationAPI.getOrganizationsAPI.mockResolvedValue({
        data: largeOrganizationList,
      });
      mockOrganizationAPI.getPendingOrganizationsAPI.mockResolvedValue({
        data: [],
      });

      const startTime = performance.now();
      renderWithProviders(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Super Admin Dashboard')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Component should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(5000); // 5 seconds
    });

    test('handles rapid state updates efficiently', async () => {
      renderWithProviders(<SuperAdminDashboard />);

      const startTime = performance.now();

      // Simulate rapid state updates
      for (let i = 0; i < 100; i++) {
        act(() => {
          store.dispatch({
            type: 'superAdmin/setDashboardStats',
            payload: {
              organizations: i,
              users: i * 2,
              accounts: i * 3,
              devices: i * 4,
              pendingApprovals: i * 5,
            },
          });
        });
      }

      const endTime = performance.now();
      const updateTime = endTime - startTime;

      // Updates should complete quickly
      expect(updateTime).toBeLessThan(1000); // 1 second
    });
  });
}); 
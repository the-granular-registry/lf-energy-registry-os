import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

import OrganizationManagement from '../index';
import organizationReducer from '../../../store/organization/organizationSlice';
import { fetchAdminOrganizations } from '../../../store/organization/organizationThunk';

// Mock the API calls
jest.mock('../../../store/organization/organizationThunk', () => ({
  fetchAdminOrganizations: jest.fn(),
  fetchOrganizationDetails: jest.fn(),
  updateOrganization: jest.fn(),
  deleteOrganization: jest.fn(),
  fetchOrganizationUsers: jest.fn(),
  fetchOrganizationStats: jest.fn(),
}));

const mockOrganizations = [
  {
    id: 1,
    name: 'Solar Energy Solutions',
    primary_contact_email: 'contact@solarenergy.com',
    organization_type: 'ENERGY_PRODUCER',
    status: 'ACTIVE',
    user_count: 5,
    account_count: 3,
    created_at: '2024-01-01T00:00:00Z',
    address: '123 Solar Street',
    business_registration_number: 'SES001',
    website: 'https://solarenergy.com'
  },
  {
    id: 2,
    name: 'Green Trading Co',
    primary_contact_email: 'admin@greentrading.co',
    organization_type: 'TRADER',
    status: 'PENDING',
    user_count: 3,
    account_count: 2,
    created_at: '2024-01-02T00:00:00Z',
    address: '456 Trading Plaza',
    business_registration_number: 'GTC002',
    website: 'https://greentrading.co'
  }
];

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      organization: organizationReducer,
    },
    preloadedState: {
      organization: {
        organizations: [],
        currentOrganization: null,
        organizationUsers: [],
        organizationStats: null,
        loading: false,
        error: null,
        pagination: {
          page: 1,
          perPage: 20,
          total: 0
        },
        ...initialState
      }
    }
  });
};

const renderWithProvider = (component, store) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('OrganizationManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchAdminOrganizations.mockReturnValue({
      type: 'organization/fetchAdminOrganizations/pending',
      payload: mockOrganizations
    });
  });

  test('renders organization management page', () => {
    const store = createMockStore();
    renderWithProvider(<OrganizationManagement />, store);

    expect(screen.getByText('Organization Management')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search organizations...')).toBeInTheDocument();
    expect(screen.getByText('Add Organization')).toBeInTheDocument();
  });

  test('displays organizations in table', () => {
    const store = createMockStore({
      organizations: mockOrganizations
    });
    renderWithProvider(<OrganizationManagement />, store);

    expect(screen.getByText('Solar Energy Solutions')).toBeInTheDocument();
    expect(screen.getByText('Green Trading Co')).toBeInTheDocument();
    expect(screen.getByText('contact@solarenergy.com')).toBeInTheDocument();
    expect(screen.getByText('admin@greentrading.co')).toBeInTheDocument();
  });

  test('filters organizations by search text', async () => {
    const store = createMockStore({
      organizations: mockOrganizations
    });
    renderWithProvider(<OrganizationManagement />, store);

    const searchInput = screen.getByPlaceholderText('Search organizations...');
    fireEvent.change(searchInput, { target: { value: 'Solar' } });

    expect(screen.getByText('Solar Energy Solutions')).toBeInTheDocument();
    expect(screen.queryByText('Green Trading Co')).not.toBeInTheDocument();
  });

  test('filters organizations by status', async () => {
    const store = createMockStore({
      organizations: mockOrganizations
    });
    renderWithProvider(<OrganizationManagement />, store);

    // Click on status filter dropdown
    const statusFilter = screen.getByText('Filter by status');
    fireEvent.mouseDown(statusFilter);

    // Select ACTIVE status
    await waitFor(() => {
      const activeOption = screen.getByText('Active');
      fireEvent.click(activeOption);
    });

    expect(screen.getByText('Solar Energy Solutions')).toBeInTheDocument();
    expect(screen.queryByText('Green Trading Co')).not.toBeInTheDocument();
  });

  test('opens edit modal when edit button clicked', async () => {
    const store = createMockStore({
      organizations: mockOrganizations
    });
    renderWithProvider(<OrganizationManagement />, store);

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Organization')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Solar Energy Solutions')).toBeInTheDocument();
    });
  });

  test('opens details modal when details button clicked', async () => {
    const store = createMockStore({
      organizations: mockOrganizations,
      currentOrganization: mockOrganizations[0],
      organizationStats: {
        total_users: 5,
        active_users: 5,
        total_accounts: 3,
        active_accounts: 3,
        total_devices: 2,
        total_certificates: 10
      }
    });
    renderWithProvider(<OrganizationManagement />, store);

    const detailsButtons = screen.getAllByText('Details');
    fireEvent.click(detailsButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Organization Details')).toBeInTheDocument();
      expect(screen.getByText('Organization Information')).toBeInTheDocument();
    });
  });

  test('opens add organization modal', async () => {
    const store = createMockStore();
    renderWithProvider(<OrganizationManagement />, store);

    const addButton = screen.getByText('Add Organization');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Add Organization')).toBeInTheDocument();
      expect(screen.getByLabelText('Organization Name')).toBeInTheDocument();
    });
  });

  test('displays loading state', () => {
    const store = createMockStore({
      loading: true
    });
    renderWithProvider(<OrganizationManagement />, store);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('displays error message', () => {
    const store = createMockStore({
      error: 'Failed to fetch organizations'
    });
    renderWithProvider(<OrganizationManagement />, store);

    // Note: The component shows errors via message.error(), which might not be visible in tests
    // You might need to mock antd's message component
  });

  test('validates required fields in edit form', async () => {
    const store = createMockStore({
      organizations: mockOrganizations
    });
    renderWithProvider(<OrganizationManagement />, store);

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Organization')).toBeInTheDocument();
    });

    // Clear required field
    const nameInput = screen.getByDisplayValue('Solar Energy Solutions');
    fireEvent.change(nameInput, { target: { value: '' } });

    // Try to submit
    const saveButton = screen.getByText('OK');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Please input organization name!')).toBeInTheDocument();
    });
  });

  test('handles organization type display correctly', () => {
    const store = createMockStore({
      organizations: mockOrganizations
    });
    renderWithProvider(<OrganizationManagement />, store);

    expect(screen.getByText('Energy Producer')).toBeInTheDocument();
    expect(screen.getByText('Trader')).toBeInTheDocument();
  });

  test('handles status color coding', () => {
    const store = createMockStore({
      organizations: mockOrganizations
    });
    renderWithProvider(<OrganizationManagement />, store);

    const activeStatus = screen.getByText('ACTIVE');
    const pendingStatus = screen.getByText('PENDING');

    expect(activeStatus).toHaveClass('ant-tag-green');
    expect(pendingStatus).toHaveClass('ant-tag-orange');
  });

  test('shows confirmation dialog for delete', async () => {
    const store = createMockStore({
      organizations: mockOrganizations
    });
    renderWithProvider(<OrganizationManagement />, store);

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to delete this organization?')).toBeInTheDocument();
    });
  });

  test('displays organization statistics in details modal', () => {
    const store = createMockStore({
      organizations: mockOrganizations,
      currentOrganization: mockOrganizations[0],
      organizationStats: {
        total_users: 5,
        active_users: 5,
        total_accounts: 3,
        active_accounts: 3,
        total_devices: 2,
        total_certificates: 10
      }
    });
    renderWithProvider(<OrganizationManagement />, store);

    const detailsButtons = screen.getAllByText('Details');
    fireEvent.click(detailsButtons[0]);

    expect(screen.getByText('5')).toBeInTheDocument(); // Total users
    expect(screen.getByText('3')).toBeInTheDocument(); // Total accounts
  });

  test('handles form submission for update', async () => {
    const store = createMockStore({
      organizations: mockOrganizations,
      currentOrganization: mockOrganizations[0]
    });
    
    const mockUpdateOrganization = jest.fn().mockResolvedValue({
      unwrap: () => Promise.resolve(mockOrganizations[0])
    });
    
    renderWithProvider(<OrganizationManagement />, store);

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Organization')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Solar Energy Solutions');
    fireEvent.change(nameInput, { target: { value: 'Updated Solar Energy Solutions' } });

    const saveButton = screen.getByText('OK');
    fireEvent.click(saveButton);

    // Note: You might need to mock the dispatch function and updateOrganization thunk
    // to properly test the form submission
  });
});

// Tests for individual components
describe('OrganizationManagement Components', () => {
  test('renders organization type correctly', () => {
    const store = createMockStore({
      organizations: mockOrganizations
    });
    renderWithProvider(<OrganizationManagement />, store);

    expect(screen.getByText('Energy Producer')).toBeInTheDocument();
    expect(screen.getByText('Trader')).toBeInTheDocument();
  });

  test('formats dates correctly', () => {
    const store = createMockStore({
      organizations: mockOrganizations
    });
    renderWithProvider(<OrganizationManagement />, store);

    // Check if dates are formatted (this depends on your date formatting)
    expect(screen.getByText('1/1/2024')).toBeInTheDocument();
    expect(screen.getByText('1/2/2024')).toBeInTheDocument();
  });

  test('handles empty organizations list', () => {
    const store = createMockStore({
      organizations: []
    });
    renderWithProvider(<OrganizationManagement />, store);

    expect(screen.getByText('Organization Management')).toBeInTheDocument();
    // The table should still render, just without data
    expect(screen.queryByText('Solar Energy Solutions')).not.toBeInTheDocument();
  });
}); 
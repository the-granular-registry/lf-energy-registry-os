/**
 * Tests for unified OrganizationManagement page RBAC and rendering
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import organizationReducer from '../src/store/organization/organizationSlice';
import OrganizationManagement from '../src/pages/OrganizationManagement/index';

jest.mock('../src/api/organization', () => ({
  getOrganization: jest.fn(),
}));

const renderWithProviders = (ui, preloadedState = {}) => {
  const store = configureStore({
    reducer: {
      organization: organizationReducer,
    },
    preloadedState,
  });

  return render(
    <Provider store={store}>
      <BrowserRouter>{ui}</BrowserRouter>
    </Provider>
  );
};

describe('OrganizationManagement unified page', () => {
  test('renders Super Admin table view when role is SUPER_ADMIN', async () => {
    // Mock UserContext
    jest.doMock('../src/context/UserContext', () => ({
      useUser: () => ({ userData: { userInfo: { role: 'SUPER_ADMIN' }, accounts: [] } }),
    }));

    const { default: Page } = require('../src/pages/OrganizationManagement/index');
    renderWithProviders(<Page />, {
      organization: { organizations: [], currentOrganization: null, organizationUsers: [], organizationStats: null, loading: false, error: null, pagination: { page: 1, perPage: 20, total: 0 } },
    });

    await waitFor(() => {
      expect(screen.getByText('Organization Management')).toBeInTheDocument();
    });
  });

  test('renders Admin card view when role is ADMIN', async () => {
    jest.isolateModules(() => {
      jest.doMock('../src/context/UserContext', () => ({
        useUser: () => ({ userData: { userInfo: { role: 'ADMIN', organisation: 'Org A' }, accounts: [] } }),
      }));

      const { default: Page } = require('../src/pages/OrganizationManagement/index');
      renderWithProviders(<Page />, {
        organization: { organizations: [{ id: 1, name: 'Org A', status: 'ACTIVE', primary_contact_email: 'a@a.com', address: 'x', organization_type: 'TRADER', created_at: new Date().toISOString(), user_count: 1, account_count: 1 }], currentOrganization: null, organizationUsers: [], organizationStats: null, loading: false, error: null, pagination: { page: 1, perPage: 20, total: 0 } },
      });

      expect(screen.getByText('Organization Management')).toBeInTheDocument();
      expect(screen.getByText(/Org A/)).toBeInTheDocument();
    });
  });

  test('renders Regular User read-only cards when user has account orgs', async () => {
    const { getOrganization } = require('../src/api/organization');
    getOrganization.mockResolvedValue({ data: { id: 2, name: 'Org B', status: 'ACTIVE', primary_contact_email: 'b@b.com', address: 'y', organization_type: 'CONSUMER', created_at: new Date().toISOString() } });

    jest.isolateModules(() => {
      jest.doMock('../src/context/UserContext', () => ({
        useUser: () => ({ userData: { userInfo: { role: 'TRADING_USER' }, accounts: [{ id: 1, organization_id: 2 }] } }),
      }));

      const { default: Page } = require('../src/pages/OrganizationManagement/index');
      renderWithProviders(<Page />);

      return waitFor(() => {
        expect(screen.getByText(/Org B/)).toBeInTheDocument();
      });
    });
  });
});



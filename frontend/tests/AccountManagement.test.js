/**
 * Tests for unified Account Management page RBAC and CRUD basics
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import accountReducer from '../src/store/account/accountSlice';
import AccountManagement from '../src/pages/AccountManagement/index';

jest.mock('../src/context/UserContext', () => ({
  useUser: () => ({ userData: { userInfo: { role: 'SUPER_ADMIN', userID: 999 }, accounts: [] } }),
}));

describe('AccountManagement unified page', () => {
  const renderWithProviders = (ui, preloadedState = {}) => {
    const store = configureStore({
      reducer: { account: accountReducer },
      preloadedState,
    });
    return render(
      <Provider store={store}>
        <BrowserRouter>{ui}</BrowserRouter>
      </Provider>
    );
  };

  test('renders and lists accounts', () => {
    const state = {
      account: {
        currentAccount: { id: null, account_name: '', devices: [], whiteListInverse: [] },
        accounts: [
          { id: 1, account_name: 'A1', account_type: 'PRODUCTION', transfer_disabled: false, user_ids: [999] },
          { id: 2, account_name: 'A2', account_type: 'TRADING', transfer_disabled: true, user_ids: [] },
        ],
        devices: [],
        loading: false,
        error: null,
      },
    };
    renderWithProviders(<AccountManagement />, state);
    expect(screen.getByText('Account Management')).toBeInTheDocument();
    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByText('A2')).toBeInTheDocument();
  });
});



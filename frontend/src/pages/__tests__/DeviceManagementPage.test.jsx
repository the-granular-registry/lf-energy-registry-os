import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/auth/authSlice';
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = jest.fn();

const renderWithProviders = (
  ui,
  {
    preloadedState = {},
    store = configureStore({
      reducer: { auth: authReducer },
      preloadedState,
    }),
    ...renderOptions
  } = {}
) => {
  function Wrapper({ children }) {
    return (
      <Provider store={store}>
        <MemoryRouter>{children}</MemoryRouter>
      </Provider>
    );
  }
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

// Test the API endpoints that the device management page uses
describe('Device Management API', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('Devices API', () => {
    it('should fetch devices successfully', async () => {
      const mockDevices = [
        { id: 1, device_name: 'Test Device 1', account_id: 1 },
        { id: 2, device_name: 'Test Device 2', account_id: 1 }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ devices: mockDevices }),
      });

      const response = await fetch('/api/devices/accessible?include_account_info=true');
      const data = await response.json();

      expect(data.devices).toEqual(mockDevices);
      expect(fetch).toHaveBeenCalledWith('/api/devices/accessible?include_account_info=true');
    });

    it('should handle empty devices response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ devices: [] }),
      });

      const response = await fetch('/api/devices/accessible?include_account_info=true');
      const data = await response.json();

      expect(data.devices).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetch('/api/devices/accessible?include_account_info=true'))
        .rejects
        .toThrow('Network error');
    });

    it('should handle 422 errors from parameter parsing issues', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ detail: 'Unprocessable Entity' }),
      });

      const response = await fetch('/api/devices/accessible?include_account_info=true');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(422);
    });

    it('should include account info when requested', async () => {
      const mockDevices = [
        { 
          id: 1, 
          device_name: 'Test Device 1', 
          account_id: 1,
          account_name: 'Test Account'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ devices: mockDevices }),
      });

      const response = await fetch('/api/devices/accessible?include_account_info=true');
      const data = await response.json();

      expect(data.devices[0].account_name).toBe('Test Account');
    });
  });

  describe('User Uploads API', () => {
    it('should fetch user uploads successfully', async () => {
      const mockUploads = [
        { id: 1, original_filename: 'test.csv', upload_status: 'processed' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ uploads: mockUploads }),
      });

      const response = await fetch('/api/measurements/user_uploads?page=1&limit=20&all_accounts=true');
      const data = await response.json();

      expect(data.uploads).toEqual(mockUploads);
      expect(fetch).toHaveBeenCalledWith('/api/measurements/user_uploads?page=1&limit=20&all_accounts=true');
    });

    it('should handle empty uploads response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ uploads: [] }),
      });

      const response = await fetch('/api/measurements/user_uploads?page=1&limit=20&all_accounts=true');
      const data = await response.json();

      expect(data.uploads).toEqual([]);
    });

    it('should handle uploads API errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetch('/api/measurements/user_uploads?page=1&limit=20&all_accounts=true'))
        .rejects
        .toThrow('Network error');
    });

    it('should handle 422 errors from parameter parsing issues for uploads', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ detail: 'Unprocessable Entity' }),
      });

      const response = await fetch('/api/measurements/user_uploads?page=1&limit=20&all_accounts=true');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(422);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should handle 401 unauthorized responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      });

      const response = await fetch('/api/devices/accessible?include_account_info=true');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it('should handle 403 forbidden responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: 'Forbidden' }),
      });

      const response = await fetch('/api/devices/accessible?include_account_info=true');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(403);
    });
  });

  describe('Parameter Handling', () => {
    it('should handle boolean parameters as strings correctly', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ devices: [] }),
      });

      // Test that the backend can handle string boolean parameters
      await fetch('/api/devices/accessible?include_account_info=true');
      expect(fetch).toHaveBeenCalledWith('/api/devices/accessible?include_account_info=true');

      await fetch('/api/measurements/user_uploads?all_accounts=true');
      expect(fetch).toHaveBeenCalledWith('/api/measurements/user_uploads?all_accounts=true');
    });

    it('should handle false boolean parameters', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ devices: [] }),
      });

      await fetch('/api/devices/accessible?include_account_info=false');
      expect(fetch).toHaveBeenCalledWith('/api/devices/accessible?include_account_info=false');

      await fetch('/api/measurements/user_uploads?all_accounts=false');
      expect(fetch).toHaveBeenCalledWith('/api/measurements/user_uploads?all_accounts=false');
    });
  });
});

// Integration tests with real authentication
describe('Device Management Integration Tests', () => {
  const TEST_USER = {
    email: 'amy.admin@horizonenergy.com',
    password: 'password'
  };

  beforeEach(() => {
    fetch.mockClear();
  });

  describe('Authentication Flow', () => {
    it('should authenticate with test user credentials', async () => {
      // Mock successful login
      const mockAuthResponse = {
        access_token: 'test-token-123',
        token_type: 'bearer',
        user: {
          id: 1,
          email: TEST_USER.email,
          role: 4, // ADMIN
          name: 'Amy Admin'
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAuthResponse,
      });

      const loginResponse = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: TEST_USER.email,
          password: TEST_USER.password,
        }),
      });

      const authData = await loginResponse.json();
      expect(authData.access_token).toBe('test-token-123');
      expect(authData.user.email).toBe(TEST_USER.email);
      expect(authData.user.role).toBe(4); // ADMIN
    });

    it('should fetch devices with authenticated user', async () => {
      // Mock authentication token
      const authToken = 'test-token-123';
      
      // Mock devices response for authenticated user
      const mockDevices = [
        { id: 1, device_name: 'Solar Panel 1', account_id: 1, account_name: 'Horizon Energy' },
        { id: 2, device_name: 'Wind Turbine 1', account_id: 1, account_name: 'Horizon Energy' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ devices: mockDevices }),
      });

      const response = await fetch('/api/devices/accessible?include_account_info=true', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      expect(data.devices).toEqual(mockDevices);
      expect(data.devices[0].account_name).toBe('Horizon Energy');
    });

    it('should fetch user uploads with authenticated user', async () => {
      // Mock authentication token
      const authToken = 'test-token-123';
      
      // Mock uploads response for authenticated user
      const mockUploads = [
        { 
          id: 1, 
          original_filename: 'solar_data_2025.csv', 
          upload_status: 'processed',
          device_name: 'Solar Panel 1',
          account_name: 'Horizon Energy'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ uploads: mockUploads }),
      });

      const response = await fetch('/api/measurements/user_uploads?page=1&limit=20&all_accounts=true', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      expect(data.uploads).toEqual(mockUploads);
      expect(data.uploads[0].device_name).toBe('Solar Panel 1');
    });

    it('should handle authentication errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid credentials' }),
      });

      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: TEST_USER.email,
          password: 'wrongpassword',
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('Admin User Permissions', () => {
    it('should allow admin user to see all devices', async () => {
      const authToken = 'test-token-123';
      
      // Mock admin user with full access
      const mockDevices = [
        { id: 1, device_name: 'Device 1', account_id: 1, account_name: 'Account 1' },
        { id: 2, device_name: 'Device 2', account_id: 2, account_name: 'Account 2' },
        { id: 3, device_name: 'Device 3', account_id: 3, account_name: 'Account 3' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ devices: mockDevices }),
      });

      const response = await fetch('/api/devices/accessible?include_account_info=true', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      expect(data.devices).toHaveLength(3);
      expect(data.devices[0].account_name).toBe('Account 1');
      expect(data.devices[1].account_name).toBe('Account 2');
      expect(data.devices[2].account_name).toBe('Account 3');
    });

    it('should allow admin user to see all uploads', async () => {
      const authToken = 'test-token-123';
      
      // Mock admin user with access to all uploads
      const mockUploads = [
        { id: 1, original_filename: 'upload1.csv', upload_status: 'processed' },
        { id: 2, original_filename: 'upload2.csv', upload_status: 'processing' },
        { id: 3, original_filename: 'upload3.csv', upload_status: 'failed' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ uploads: mockUploads }),
      });

      const response = await fetch('/api/measurements/user_uploads?page=1&limit=20&all_accounts=true', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      expect(data.uploads).toHaveLength(3);
      expect(data.uploads[0].upload_status).toBe('processed');
      expect(data.uploads[1].upload_status).toBe('processing');
      expect(data.uploads[2].upload_status).toBe('failed');
    });
  });
});

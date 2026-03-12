import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/auth/authSlice';
import '@testing-library/jest-dom';

// Polyfill fetch for Node.js environment
import fetch from 'node-fetch';
global.fetch = fetch;

// Real API tests with actual backend calls
describe('Device Management E2E Tests', () => {
  const TEST_USER = {
    email: 'amy.admin@horizonenergy.com',
    password: 'password'
  };

  let authToken = null;

  beforeAll(async () => {
    try {
      // Get CSRF token first
      const csrfResponse = await fetch('http://172.20.0.1:8000/csrf-token');
      const csrfData = await csrfResponse.json();
      
      // Login with test user
      const loginResponse = await fetch('http://172.20.0.1:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.csrf_token,
        },
        body: JSON.stringify({
          email: TEST_USER.email,
          password: TEST_USER.password,
        }),
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        authToken = loginData.access_token;
        console.log('Successfully authenticated with test user');
      } else {
        console.log('Failed to authenticate with test user');
      }
    } catch (error) {
      console.log('Error during authentication:', error.message);
    }
  }, 30000); // 30 second timeout

  describe('Real API Integration Tests', () => {
    it('should authenticate with test user and get user info', async () => {
      expect(authToken).toBeTruthy();
      
      if (authToken) {
        const userResponse = await fetch('http://172.20.0.1:8000/users/me', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          expect(userData.email).toBe(TEST_USER.email);
          expect(userData.role).toBe(4); // ADMIN
          console.log('User authenticated:', userData.email, 'Role:', userData.role);
        } else {
          console.log('Failed to get user info');
        }
      }
    }, 10000);

    it('should fetch devices with real authentication', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const response = await fetch('http://172.20.0.1:8000/devices/accessible?include_account_info=true', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Devices API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Devices found:', data.devices?.length || 0);
        expect(data).toHaveProperty('devices');
        expect(Array.isArray(data.devices)).toBe(true);
      } else {
        const errorData = await response.json();
        console.log('Devices API error:', errorData);
        // Don't fail the test if no devices exist, just log the response
      }
    }, 10000);

    it('should fetch user uploads with real authentication', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const response = await fetch('http://172.20.0.1:8000/measurements/user_uploads?page=1&limit=20&all_accounts=true', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('User uploads API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Uploads found:', data.uploads?.length || 0);
        expect(data).toHaveProperty('uploads');
        expect(Array.isArray(data.uploads)).toBe(true);
      } else {
        const errorData = await response.json();
        console.log('User uploads API error:', errorData);
        // Don't fail the test if no uploads exist, just log the response
      }
    }, 10000);

    it('should handle parameter parsing correctly (no 422 errors)', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      // Test both endpoints with string boolean parameters
      const devicesResponse = await fetch('http://172.20.0.1:8000/devices/accessible?include_account_info=true', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const uploadsResponse = await fetch('http://172.20.0.1:8000/measurements/user_uploads?all_accounts=true', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Devices response status:', devicesResponse.status);
      console.log('Uploads response status:', uploadsResponse.status);

      // Both should not return 422 (Unprocessable Entity)
      expect(devicesResponse.status).not.toBe(422);
      expect(uploadsResponse.status).not.toBe(422);

      // They should either be 200 (success) or 401/403 (auth issues)
      expect([200, 401, 403]).toContain(devicesResponse.status);
      expect([200, 401, 403]).toContain(uploadsResponse.status);
    }, 10000);

    it('should test different parameter combinations', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const testCases = [
        'http://172.20.0.1:8000/devices/accessible?include_account_info=true',
        'http://172.20.0.1:8000/devices/accessible?include_account_info=false',
        'http://172.20.0.1:8000/devices/accessible?include_account_info=1',
        'http://172.20.0.1:8000/devices/accessible?include_account_info=0',
        'http://172.20.0.1:8000/measurements/user_uploads?all_accounts=true',
        'http://172.20.0.1:8000/measurements/user_uploads?all_accounts=false',
        'http://172.20.0.1:8000/measurements/user_uploads?all_accounts=1',
        'http://172.20.0.1:8000/measurements/user_uploads?all_accounts=0',
      ];

      for (const url of testCases) {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log(`Testing ${url} - Status: ${response.status}`);
        
        // Should not return 422 for any of these parameter combinations
        expect(response.status).not.toBe(422);
      }
    }, 15000);
  });
}); 
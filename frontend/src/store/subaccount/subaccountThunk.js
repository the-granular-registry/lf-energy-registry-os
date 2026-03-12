import { createAsyncThunk } from '@reduxjs/toolkit';
import subaccountAPI from '../../api/subaccountAPI';

// Create subaccounts for a parent account
export const createSubaccounts = createAsyncThunk(
  'subaccount/createSubaccounts',
  async ({ parentAccountId, subaccounts }, { rejectWithValue }) => {
    try {
      const response = await subaccountAPI.createSubaccounts(parentAccountId, subaccounts);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to create subaccounts');
    }
  }
);

// Fetch subaccounts for a parent account
export const fetchSubaccounts = createAsyncThunk(
  'subaccount/fetchSubaccounts',
  async (parentAccountId, { rejectWithValue }) => {
    try {
      const response = await subaccountAPI.getSubaccounts(parentAccountId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch subaccounts');
    }
  }
);

// Claim a subaccount using invitation token
export const claimSubaccount = createAsyncThunk(
  'subaccount/claimSubaccount',
  async (invitationToken, { rejectWithValue }) => {
    try {
      const response = await subaccountAPI.claimSubaccount(invitationToken);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to claim subaccount');
    }
  }
);

// Fetch user's claimed subaccounts
export const fetchUserSubaccounts = createAsyncThunk(
  'subaccount/fetchUserSubaccounts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await subaccountAPI.getUserSubaccounts();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch user subaccounts');
    }
  }
);

// Generate magic link for a subaccount
export const generateMagicLink = createAsyncThunk(
  'subaccount/generateMagicLink',
  async (subaccountId, { rejectWithValue }) => {
    try {
      const response = await subaccountAPI.generateMagicLink(subaccountId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to generate magic link');
    }
  }
);

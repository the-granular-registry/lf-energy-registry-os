import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  getAdminOrganizations,
  getOrganizationDetails,
  updateOrganizationAPI,
  deleteOrganizationAPI,
  getOrganizationUsers,
  getOrganizationStats,
  createAdminOrganization
} from '../../api/organization';

// Fetch organizations for admin user
export const fetchAdminOrganizations = createAsyncThunk(
  'organization/fetchAdminOrganizations',
  async ({ page = 1, perPage = 20 } = {}, { rejectWithValue }) => {
    try {
      const response = await getAdminOrganizations(page, perPage);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to fetch organizations'
      );
    }
  }
);

// Fetch organization details
export const fetchOrganizationDetails = createAsyncThunk(
  'organization/fetchOrganizationDetails',
  async (organizationId, { rejectWithValue }) => {
    try {
      const response = await getOrganizationDetails(organizationId);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to fetch organization details'
      );
    }
  }
);

// Update organization
export const updateOrganization = createAsyncThunk(
  'organization/updateOrganization',
  async ({ organizationId, updateData }, { rejectWithValue }) => {
    try {
      const response = await updateOrganizationAPI(organizationId, updateData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to update organization'
      );
    }
  }
);

// Delete organization
export const deleteOrganization = createAsyncThunk(
  'organization/deleteOrganization',
  async (organizationId, { rejectWithValue }) => {
    try {
      await deleteOrganizationAPI(organizationId);
      return organizationId; // Return the ID for removal from state
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to delete organization'
      );
    }
  }
);

// Fetch organization users
export const fetchOrganizationUsers = createAsyncThunk(
  'organization/fetchOrganizationUsers',
  async (organizationId, { rejectWithValue }) => {
    try {
      const response = await getOrganizationUsers(organizationId);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to fetch organization users'
      );
    }
  }
);

// Fetch organization statistics
export const fetchOrganizationStats = createAsyncThunk(
  'organization/fetchOrganizationStats',
  async (organizationId, { rejectWithValue }) => {
    try {
      const response = await getOrganizationStats(organizationId);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to fetch organization stats'
      );
    }
  }
);

// Create organization (super admin)
export const createOrganization = createAsyncThunk(
  'organization/createOrganization',
  async (organizationData, { rejectWithValue }) => {
    try {
      const response = await createAdminOrganization(organizationData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to create organization'
      );
    }
  }
); 
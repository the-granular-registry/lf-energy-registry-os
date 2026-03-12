import { createSlice } from '@reduxjs/toolkit';
import {
  fetchAdminOrganizations,
  fetchOrganizationDetails,
  updateOrganization,
  deleteOrganization,
  fetchOrganizationUsers,
  fetchOrganizationStats,
  createOrganization
} from './organizationThunk';

const initialState = {
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
  }
};

const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentOrganization: (state) => {
      state.currentOrganization = null;
      state.organizationUsers = [];
      state.organizationStats = null;
    },
    setOrganizations: (state, action) => {
      state.organizations = action.payload || [];
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch admin organizations
      .addCase(fetchAdminOrganizations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminOrganizations.fulfilled, (state, action) => {
        state.loading = false;
        state.organizations = action.payload;
        state.error = null;
      })
      .addCase(fetchAdminOrganizations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch organizations';
      })
      
      // Fetch organization details
      .addCase(fetchOrganizationDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrganizationDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrganization = action.payload;
        state.error = null;
      })
      .addCase(fetchOrganizationDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch organization details';
      })
      
      // Update organization
      .addCase(updateOrganization.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrganization.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrganization = action.payload;
        
        // Update in organizations list if present
        const index = state.organizations.findIndex(org => org.id === action.payload.id);
        if (index !== -1) {
          state.organizations[index] = action.payload;
        }
        
        state.error = null;
      })
      .addCase(updateOrganization.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to update organization';
      })
      
      // Delete organization
      .addCase(deleteOrganization.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteOrganization.fulfilled, (state, action) => {
        state.loading = false;
        
        // Remove from organizations list
        state.organizations = state.organizations.filter(org => org.id !== action.payload);
        
        // Clear current organization if it was deleted
        if (state.currentOrganization && state.currentOrganization.id === action.payload) {
          state.currentOrganization = null;
          state.organizationUsers = [];
          state.organizationStats = null;
        }
        
        state.error = null;
      })
      .addCase(deleteOrganization.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to delete organization';
      })
      
      // Fetch organization users
      .addCase(fetchOrganizationUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrganizationUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.organizationUsers = action.payload;
        state.error = null;
      })
      .addCase(fetchOrganizationUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch organization users';
      })
      
      // Fetch organization stats
      .addCase(fetchOrganizationStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrganizationStats.fulfilled, (state, action) => {
        state.loading = false;
        state.organizationStats = action.payload;
        state.error = null;
      })
      .addCase(fetchOrganizationStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch organization stats';
      })
      // Create organization
      .addCase(createOrganization.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrganization.fulfilled, (state, action) => {
        state.loading = false;
        state.organizations.push(action.payload);
        state.error = null;
      })
      .addCase(createOrganization.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to create organization';
      });
  }
});

export const { clearError, clearCurrentOrganization, setPagination, setOrganizations } = organizationSlice.actions;

// Selectors
export const selectOrganizations = (state) => state.organization.organizations;
export const selectCurrentOrganization = (state) => state.organization.currentOrganization;
export const selectOrganizationUsers = (state) => state.organization.organizationUsers;
export const selectOrganizationStats = (state) => state.organization.organizationStats;
export const selectOrganizationLoading = (state) => state.organization.loading;
export const selectOrganizationError = (state) => state.organization.error;
export const selectOrganizationPagination = (state) => state.organization.pagination;

export default organizationSlice.reducer; 
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedOrganization: null,
  organizations: [],
  pendingApprovals: [],
  dashboardStats: {
    organizations: 0,
    users: 0,
    accounts: 0,
    devices: 0,
    pendingApprovals: 0
  },
  loading: false,
  error: null
};

const superAdminSlice = createSlice({
  name: 'superAdmin',
  initialState,
  reducers: {
    setSelectedOrganization: (state, action) => {
      state.selectedOrganization = action.payload;
    },
    setOrganizations: (state, action) => {
      state.organizations = action.payload;
    },
    setPendingApprovals: (state, action) => {
      state.pendingApprovals = action.payload;
    },
    setDashboardStats: (state, action) => {
      state.dashboardStats = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearSelectedOrganization: (state) => {
      state.selectedOrganization = null;
    },
    updateApprovalStatus: (state, action) => {
      const { approvalId, status } = action.payload;
      state.pendingApprovals = state.pendingApprovals.filter(
        approval => approval.id !== approvalId
      );
    }
  }
});

export const {
  setSelectedOrganization,
  setOrganizations,
  setPendingApprovals,
  setDashboardStats,
  setLoading,
  setError,
  clearSelectedOrganization,
  updateApprovalStatus
} = superAdminSlice.actions;

export default superAdminSlice.reducer; 
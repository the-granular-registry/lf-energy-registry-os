import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { 
  getPendingApprovalsAPI, 
  getApprovalHistoryAPI, 
  getApprovalDetailsAPI,
  approveRequestAPI, 
  rejectRequestAPI, 
  getApprovalStatsAPI 
} from '../../api/approvalAPI';
import { logger } from '../../utils';

// Async thunks for approval operations
export const fetchPendingApprovals = createAsyncThunk(
  'approval/fetchPendingApprovals',
  async (_, { rejectWithValue }) => {
    try {
      logger.debug('Fetching pending approvals...');
      const response = await getPendingApprovalsAPI();
      return response;
    } catch (error) {
      logger.error('Failed to fetch pending approvals:', error);
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch pending approvals');
    }
  }
);

export const fetchApprovalHistory = createAsyncThunk(
  'approval/fetchApprovalHistory',
  async (params, { rejectWithValue }) => {
    try {
      logger.debug('Fetching approval history with params:', params);
      const response = await getApprovalHistoryAPI(params);
      return response;
    } catch (error) {
      logger.error('Failed to fetch approval history:', error);
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch approval history');
    }
  }
);

export const fetchApprovalDetails = createAsyncThunk(
  'approval/fetchApprovalDetails',
  async (approvalId, { rejectWithValue }) => {
    try {
      logger.debug('Fetching approval details for ID:', approvalId);
      const response = await getApprovalDetailsAPI(approvalId);
      return response;
    } catch (error) {
      logger.error('Failed to fetch approval details:', error);
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch approval details');
    }
  }
);

export const approveRequest = createAsyncThunk(
  'approval/approveRequest',
  async ({ approvalId, data }, { rejectWithValue, dispatch }) => {
    try {
      logger.debug('Approving request:', approvalId, data);
      const response = await approveRequestAPI(approvalId, data);
      
      // Refresh pending approvals after successful approval
      dispatch(fetchPendingApprovals());
      
      return { approvalId, response };
    } catch (error) {
      logger.error('Failed to approve request:', error);
      return rejectWithValue(error.response?.data?.detail || 'Failed to approve request');
    }
  }
);

export const rejectRequest = createAsyncThunk(
  'approval/rejectRequest',
  async ({ approvalId, data }, { rejectWithValue, dispatch }) => {
    try {
      logger.debug('Rejecting request:', approvalId, data);
      const response = await rejectRequestAPI(approvalId, data);
      
      // Refresh pending approvals after successful rejection
      dispatch(fetchPendingApprovals());
      
      return { approvalId, response };
    } catch (error) {
      logger.error('Failed to reject request:', error);
      return rejectWithValue(error.response?.data?.detail || 'Failed to reject request');
    }
  }
);

export const fetchApprovalStats = createAsyncThunk(
  'approval/fetchApprovalStats',
  async (_, { rejectWithValue }) => {
    try {
      logger.debug('Fetching approval statistics...');
      const response = await getApprovalStatsAPI();
      return response;
    } catch (error) {
      logger.error('Failed to fetch approval stats:', error);
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch approval statistics');
    }
  }
);

// Initial state
const initialState = {
  // Data
  pendingApprovals: [],
  approvalHistory: [],
  approvalDetails: null,
  approvalStats: {
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
    byType: {},
    byPriority: {},
    recentActivity: []
  },
  
  // Loading states
  loading: {
    pendingApprovals: false,
    approvalHistory: false,
    approvalDetails: false,
    approvalStats: false,
    approveRequest: false,
    rejectRequest: false
  },
  
  // Error states
  error: {
    pendingApprovals: null,
    approvalHistory: null,
    approvalDetails: null,
    approvalStats: null,
    approveRequest: null,
    rejectRequest: null
  },
  
  // UI state
  filters: {
    type: 'all',
    status: 'all',
    priority: 'all',
    dateRange: null
  },
  
  selectedApproval: null,
  activeTab: 'pending'
};

// Approval slice
const approvalSlice = createSlice({
  name: 'approval',
  initialState,
  reducers: {
    // UI actions
    setSelectedApproval: (state, action) => {
      state.selectedApproval = action.payload;
    },
    
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    resetFilters: (state) => {
      state.filters = {
        type: 'all',
        status: 'all',
        priority: 'all',
        dateRange: null
      };
    },
    
    clearErrors: (state) => {
      state.error = {
        pendingApprovals: null,
        approvalHistory: null,
        approvalDetails: null,
        approvalStats: null,
        approveRequest: null,
        rejectRequest: null
      };
    },
    
    clearApprovalDetails: (state) => {
      state.approvalDetails = null;
    }
  },
  
  extraReducers: (builder) => {
    // Fetch pending approvals
    builder
      .addCase(fetchPendingApprovals.pending, (state) => {
        state.loading.pendingApprovals = true;
        state.error.pendingApprovals = null;
      })
      .addCase(fetchPendingApprovals.fulfilled, (state, action) => {
        state.loading.pendingApprovals = false;
        state.pendingApprovals = action.payload;
        state.error.pendingApprovals = null;
      })
      .addCase(fetchPendingApprovals.rejected, (state, action) => {
        state.loading.pendingApprovals = false;
        state.error.pendingApprovals = action.payload;
      })
      
      // Fetch approval history
      .addCase(fetchApprovalHistory.pending, (state) => {
        state.loading.approvalHistory = true;
        state.error.approvalHistory = null;
      })
      .addCase(fetchApprovalHistory.fulfilled, (state, action) => {
        state.loading.approvalHistory = false;
        state.approvalHistory = action.payload;
        state.error.approvalHistory = null;
      })
      .addCase(fetchApprovalHistory.rejected, (state, action) => {
        state.loading.approvalHistory = false;
        state.error.approvalHistory = action.payload;
      })
      
      // Fetch approval details
      .addCase(fetchApprovalDetails.pending, (state) => {
        state.loading.approvalDetails = true;
        state.error.approvalDetails = null;
      })
      .addCase(fetchApprovalDetails.fulfilled, (state, action) => {
        state.loading.approvalDetails = false;
        state.approvalDetails = action.payload;
        state.error.approvalDetails = null;
      })
      .addCase(fetchApprovalDetails.rejected, (state, action) => {
        state.loading.approvalDetails = false;
        state.error.approvalDetails = action.payload;
      })
      
      // Approve request
      .addCase(approveRequest.pending, (state) => {
        state.loading.approveRequest = true;
        state.error.approveRequest = null;
      })
      .addCase(approveRequest.fulfilled, (state) => {
        state.loading.approveRequest = false;
        state.error.approveRequest = null;
      })
      .addCase(approveRequest.rejected, (state, action) => {
        state.loading.approveRequest = false;
        state.error.approveRequest = action.payload;
      })
      
      // Reject request
      .addCase(rejectRequest.pending, (state) => {
        state.loading.rejectRequest = true;
        state.error.rejectRequest = null;
      })
      .addCase(rejectRequest.fulfilled, (state) => {
        state.loading.rejectRequest = false;
        state.error.rejectRequest = null;
      })
      .addCase(rejectRequest.rejected, (state, action) => {
        state.loading.rejectRequest = false;
        state.error.rejectRequest = action.payload;
      })
      
      // Fetch approval stats
      .addCase(fetchApprovalStats.pending, (state) => {
        state.loading.approvalStats = true;
        state.error.approvalStats = null;
      })
      .addCase(fetchApprovalStats.fulfilled, (state, action) => {
        state.loading.approvalStats = false;
        state.approvalStats = action.payload;
        state.error.approvalStats = null;
      })
      .addCase(fetchApprovalStats.rejected, (state, action) => {
        state.loading.approvalStats = false;
        state.error.approvalStats = action.payload;
      });
  }
});

// Export actions
export const {
  setSelectedApproval,
  setActiveTab,
  setFilters,
  resetFilters,
  clearErrors,
  clearApprovalDetails
} = approvalSlice.actions;

// Selectors
export const selectPendingApprovals = (state) => state.approval.pendingApprovals;
export const selectApprovalHistory = (state) => state.approval.approvalHistory;
export const selectApprovalDetails = (state) => state.approval.approvalDetails;
export const selectApprovalStats = (state) => state.approval.approvalStats;
export const selectApprovalLoading = (state) => state.approval.loading;
export const selectApprovalErrors = (state) => state.approval.error;
export const selectApprovalFilters = (state) => state.approval.filters;
export const selectSelectedApproval = (state) => state.approval.selectedApproval;
export const selectActiveTab = (state) => state.approval.activeTab;

// Filtered selectors
const _selectApprovals = (state) => state.approval.pendingApprovals;
const _selectFilters = (state) => state.approval.filters;

export const selectFilteredPendingApprovals = createSelector(
  [_selectApprovals, _selectFilters],
  (approvals, filters) => {
    return approvals.filter(approval => {
      if (filters.type !== 'all' && approval.request_type !== filters.type) return false;
      if (filters.priority !== 'all' && approval.priority !== filters.priority) return false;
      return true;
    });
  }
);

export const selectFilteredApprovalHistory = (state) => {
  const history = state.approval.approvalHistory;
  const filters = state.approval.filters;
  
  return history.filter(approval => {
    if (filters.type !== 'all' && approval.request_type !== filters.type) return false;
    if (filters.status !== 'all' && approval.status !== filters.status) return false;
    if (filters.priority !== 'all' && approval.priority !== filters.priority) return false;
    if (filters.dateRange) {
      const reviewDate = new Date(approval.reviewed_at);
      const [start, end] = filters.dateRange;
      if (reviewDate < start || reviewDate > end) return false;
    }
    return true;
  });
};

export default approvalSlice.reducer; 
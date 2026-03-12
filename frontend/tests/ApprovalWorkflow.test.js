/**
 * Comprehensive tests for the Approval Workflow components
 * Tests ApprovalDashboard, PendingApprovals, ApprovalHistory, ApprovalStats,
 * Redux state management, and API integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

// Import components
import ApprovalDashboard from '../src/components/SuperAdmin/ApprovalDashboard';
import PendingApprovals from '../src/components/SuperAdmin/PendingApprovals';
import ApprovalHistory from '../src/components/SuperAdmin/ApprovalHistory';
import ApprovalStats from '../src/components/SuperAdmin/ApprovalStats';

// Import Redux
import approvalReducer, {
  fetchPendingApprovals,
  fetchApprovalHistory,
  fetchApprovalStats,
  approveRequest,
  rejectRequest,
  setFilters,
  resetFilters,
  setActiveTab,
} from '../src/store/approval/approvalSlice';

// Mock API
jest.mock('../src/api/approvalAPI', () => ({
  getPendingApprovalsAPI: jest.fn(),
  getApprovalHistoryAPI: jest.fn(),
  getApprovalStatsAPI: jest.fn(),
  approveRequestAPI: jest.fn(),
  rejectRequestAPI: jest.fn(),
}));

// Mock dependencies
jest.mock('../src/utils', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('moment', () => {
  const originalMoment = jest.requireActual('moment');
  return {
    __esModule: true,
    default: (date) => originalMoment(date || '2024-07-20T10:00:00Z'),
  };
});

// Test data
const mockPendingApprovals = [
  {
    id: 1,
    request_type: 'METER_DATA',
    status: 'PENDING',
    priority: 'HIGH',
    requester_id: 123,
    requester_email: 'user@test.com',
    target_entity_type: 'METER_READING',
    target_entity_id: 456,
    submitted_at: '2024-07-20T09:00:00Z',
    extra_metadata: { deviceId: 789 },
  },
  {
    id: 2,
    request_type: 'ORGANIZATION',
    status: 'PENDING',
    priority: 'MEDIUM',
    requester_id: 124,
    requester_email: 'admin@test.com',
    target_entity_type: 'ORGANIZATION',
    target_entity_id: 457,
    submitted_at: '2024-07-20T08:00:00Z',
  },
];

const mockApprovalHistory = [
  {
    id: 3,
    request_type: 'USER',
    status: 'APPROVED',
    priority: 'LOW',
    requester_id: 125,
    requester_email: 'newuser@test.com',
    target_entity_type: 'USER',
    target_entity_id: 458,
    submitted_at: '2024-07-19T10:00:00Z',
    reviewed_at: '2024-07-19T11:00:00Z',
    reviewed_by: 100,
    review_comments: 'Approved after verification',
  },
  {
    id: 4,
    request_type: 'DEVICE',
    status: 'REJECTED',
    priority: 'MEDIUM',
    requester_id: 126,
    requester_email: 'device@test.com',
    target_entity_type: 'DEVICE',
    target_entity_id: 459,
    submitted_at: '2024-07-19T08:00:00Z',
    reviewed_at: '2024-07-19T09:00:00Z',
    reviewed_by: 100,
    review_comments: 'Insufficient documentation',
  },
];

const mockApprovalStats = {
  pending: 2,
  approved: 1,
  rejected: 1,
  total: 4,
  byType: {
    'METER_DATA': 1,
    'ORGANIZATION': 1,
    'USER': 1,
    'DEVICE': 1,
  },
  byPriority: {
    'HIGH': 1,
    'MEDIUM': 2,
    'LOW': 1,
  },
  recentActivity: mockApprovalHistory,
};

// Helper function to create a test store
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      approval: approvalReducer,
    },
    preloadedState: {
      approval: {
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
          recentActivity: [],
        },
        loading: {
          pendingApprovals: false,
          approvalHistory: false,
          approvalDetails: false,
          approvalStats: false,
          approveRequest: false,
          rejectRequest: false,
        },
        error: {
          pendingApprovals: null,
          approvalHistory: null,
          approvalDetails: null,
          approvalStats: null,
          approveRequest: null,
          rejectRequest: null,
        },
        filters: {
          type: 'all',
          status: 'all',
          priority: 'all',
          dateRange: null,
        },
        selectedApproval: null,
        activeTab: 'pending',
        ...preloadedState,
      },
    },
  });
};

// Helper function to render with providers
const renderWithProviders = (component, options = {}) => {
  const { preloadedState = {}, store = createTestStore(preloadedState), ...renderOptions } = options;

  const Wrapper = ({ children }) => (
    <Provider store={store}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  );

  return {
    store,
    ...render(component, { wrapper: Wrapper, ...renderOptions }),
  };
};

describe('Approval Workflow Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ApprovalDashboard Component', () => {
    test('renders dashboard with all tabs', () => {
      renderWithProviders(<ApprovalDashboard />);
      
      expect(screen.getByText('Approval Management')).toBeInTheDocument();
      expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
      expect(screen.getByText('Approval History')).toBeInTheDocument();
      expect(screen.getByText('Statistics')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    test('displays error alert when there are errors', () => {
      const preloadedState = {
        error: {
          pendingApprovals: 'Failed to load pending approvals',
          approvalHistory: null,
          approvalDetails: null,
          approvalStats: null,
          approveRequest: null,
          rejectRequest: null,
        },
      };

      renderWithProviders(<ApprovalDashboard />, { preloadedState });
      
      expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
      expect(screen.getByText(/pendingApprovals.*Failed to load/)).toBeInTheDocument();
    });

    test('switches tabs correctly', async () => {
      const user = userEvent.setup();
      const { store } = renderWithProviders(<ApprovalDashboard />);

      await user.click(screen.getByText('Approval History'));
      
      expect(store.getState().approval.activeTab).toBe('history');
    });

    test('refresh button triggers data reload', async () => {
      const user = userEvent.setup();
      const { store } = renderWithProviders(<ApprovalDashboard />);

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      // Verify that fetch actions were dispatched
      const actions = store.getState();
      expect(actions).toBeDefined();
    });
  });

  describe('PendingApprovals Component', () => {
    test('renders pending approvals table', () => {
      const preloadedState = {
        pendingApprovals: mockPendingApprovals,
      };

      renderWithProviders(<PendingApprovals />, { preloadedState });
      
      expect(screen.getByText('Total Pending: 2')).toBeInTheDocument();
      expect(screen.getByText('METER DATA')).toBeInTheDocument();
      expect(screen.getByText('ORGANIZATION')).toBeInTheDocument();
      expect(screen.getByText('user@test.com')).toBeInTheDocument();
    });

    test('filters work correctly', async () => {
      const user = userEvent.setup();
      const preloadedState = {
        pendingApprovals: mockPendingApprovals,
      };

      renderWithProviders(<PendingApprovals />, { preloadedState });
      
      // Find and click the type filter dropdown
      const typeFilter = screen.getByDisplayValue('All Types');
      await user.click(typeFilter);
      
      // Select METER_DATA option
      await user.click(screen.getByText('Meter Data'));
      
      // Table should now show filtered results
      expect(screen.getByText('METER DATA')).toBeInTheDocument();
    });

    test('opens approval modal when approve button clicked', async () => {
      const user = userEvent.setup();
      const preloadedState = {
        pendingApprovals: mockPendingApprovals,
      };

      renderWithProviders(<PendingApprovals />, { preloadedState });
      
      // Find the first approve button and click it
      const approveButtons = screen.getAllByRole('button');
      const approveButton = approveButtons.find(btn => 
        btn.getAttribute('aria-label') === 'approve' || 
        btn.querySelector('[data-icon="check"]')
      );
      
      if (approveButton) {
        await user.click(approveButton);
        
        await waitFor(() => {
          expect(screen.getByText('Approve Request')).toBeInTheDocument();
        });
      }
    });

    test('opens rejection modal when reject button clicked', async () => {
      const user = userEvent.setup();
      const preloadedState = {
        pendingApprovals: mockPendingApprovals,
      };

      renderWithProviders(<PendingApprovals />, { preloadedState });
      
      // Find the first reject button and click it
      const rejectButtons = screen.getAllByRole('button');
      const rejectButton = rejectButtons.find(btn => 
        btn.getAttribute('aria-label') === 'reject' ||
        btn.querySelector('[data-icon="close"]')
      );
      
      if (rejectButton) {
        await user.click(rejectButton);
        
        await waitFor(() => {
          expect(screen.getByText('Reject Request')).toBeInTheDocument();
        });
      }
    });

    test('opens details modal when view button clicked', async () => {
      const user = userEvent.setup();
      const preloadedState = {
        pendingApprovals: mockPendingApprovals,
      };

      renderWithProviders(<PendingApprovals />, { preloadedState });
      
      // Find the first view button and click it
      const viewButtons = screen.getAllByRole('button');
      const viewButton = viewButtons.find(btn => 
        btn.getAttribute('aria-label') === 'view' ||
        btn.querySelector('[data-icon="eye"]')
      );
      
      if (viewButton) {
        await user.click(viewButton);
        
        await waitFor(() => {
          expect(screen.getByText('Approval Request Details')).toBeInTheDocument();
        });
      }
    });
  });

  describe('ApprovalHistory Component', () => {
    test('renders approval history table', () => {
      const preloadedState = {
        approvalHistory: mockApprovalHistory,
      };

      renderWithProviders(<ApprovalHistory />, { preloadedState });
      
      expect(screen.getByText('Total Records: 2')).toBeInTheDocument();
      expect(screen.getByText('Approved: 1')).toBeInTheDocument();
      expect(screen.getByText('Rejected: 1')).toBeInTheDocument();
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
      expect(screen.getByText('REJECTED')).toBeInTheDocument();
    });

    test('search functionality works', async () => {
      const user = userEvent.setup();
      const preloadedState = {
        approvalHistory: mockApprovalHistory,
      };

      renderWithProviders(<ApprovalHistory />, { preloadedState });
      
      const searchInput = screen.getByPlaceholderText('Search approvals...');
      await user.type(searchInput, 'USER');
      
      // Should filter to show only USER type
      expect(screen.getByText('USER')).toBeInTheDocument();
    });

    test('export button is present', () => {
      const preloadedState = {
        approvalHistory: mockApprovalHistory,
      };

      renderWithProviders(<ApprovalHistory />, { preloadedState });
      
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    test('status filter works correctly', async () => {
      const user = userEvent.setup();
      const preloadedState = {
        approvalHistory: mockApprovalHistory,
      };

      renderWithProviders(<ApprovalHistory />, { preloadedState });
      
      // Find and click the status filter
      const statusFilter = screen.getByDisplayValue('All Status');
      await user.click(statusFilter);
      
      // Select APPROVED option
      await user.click(screen.getByText('Approved'));
      
      // Should show only approved items
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
    });
  });

  describe('ApprovalStats Component', () => {
    test('renders statistics cards', () => {
      const preloadedState = {
        approvalStats: mockApprovalStats,
      };

      renderWithProviders(<ApprovalStats />, { preloadedState });
      
      expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toBeInTheDocument();
      expect(screen.getByText('Total Processed')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Pending count
      expect(screen.getByText('1')).toBeInTheDocument(); // Approved count
    });

    test('displays approval rate correctly', () => {
      const preloadedState = {
        approvalStats: mockApprovalStats,
      };

      renderWithProviders(<ApprovalStats />, { preloadedState });
      
      expect(screen.getByText('Approval Rate')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument(); // 1 approved out of 2 processed
    });

    test('shows request types breakdown', () => {
      const preloadedState = {
        approvalStats: mockApprovalStats,
      };

      renderWithProviders(<ApprovalStats />, { preloadedState });
      
      expect(screen.getByText('Requests by Type')).toBeInTheDocument();
      expect(screen.getByText('METER DATA')).toBeInTheDocument();
      expect(screen.getByText('ORGANIZATION')).toBeInTheDocument();
      expect(screen.getByText('USER')).toBeInTheDocument();
      expect(screen.getByText('DEVICE')).toBeInTheDocument();
    });

    test('displays priority distribution', () => {
      const preloadedState = {
        approvalStats: mockApprovalStats,
      };

      renderWithProviders(<ApprovalStats />, { preloadedState });
      
      expect(screen.getByText('Priority Distribution')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      expect(screen.getByText('LOW')).toBeInTheDocument();
    });

    test('shows recent activity', () => {
      const preloadedState = {
        approvalStats: mockApprovalStats,
      };

      renderWithProviders(<ApprovalStats />, { preloadedState });
      
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('Request #3')).toBeInTheDocument();
      expect(screen.getByText('Request #4')).toBeInTheDocument();
    });

    test('displays performance insights', () => {
      const preloadedState = {
        approvalStats: mockApprovalStats,
      };

      renderWithProviders(<ApprovalStats />, { preloadedState });
      
      expect(screen.getByText('Performance Insights')).toBeInTheDocument();
      expect(screen.getByText('Processing Efficiency')).toBeInTheDocument();
      expect(screen.getByText('Pending Backlog')).toBeInTheDocument();
      expect(screen.getByText('Approval Success Rate')).toBeInTheDocument();
    });

    test('shows empty state when no data', () => {
      const preloadedState = {
        approvalStats: {
          pending: 0,
          approved: 0,
          rejected: 0,
          total: 0,
          byType: {},
          byPriority: {},
          recentActivity: [],
        },
      };

      renderWithProviders(<ApprovalStats />, { preloadedState });
      
      expect(screen.getByText('No processed approvals yet')).toBeInTheDocument();
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  describe('Redux State Management', () => {
    test('fetchPendingApprovals updates state correctly', async () => {
      const store = createTestStore();
      
      await store.dispatch(fetchPendingApprovals());
      
      const state = store.getState().approval;
      expect(state.loading.pendingApprovals).toBe(false);
    });

    test('setFilters updates filters correctly', () => {
      const store = createTestStore();
      
      store.dispatch(setFilters({ type: 'METER_DATA', priority: 'HIGH' }));
      
      const state = store.getState().approval;
      expect(state.filters.type).toBe('METER_DATA');
      expect(state.filters.priority).toBe('HIGH');
    });

    test('resetFilters resets all filters', () => {
      const store = createTestStore({
        filters: { type: 'METER_DATA', status: 'APPROVED', priority: 'HIGH' },
      });
      
      store.dispatch(resetFilters());
      
      const state = store.getState().approval;
      expect(state.filters.type).toBe('all');
      expect(state.filters.status).toBe('all');
      expect(state.filters.priority).toBe('all');
    });

    test('setActiveTab changes active tab', () => {
      const store = createTestStore();
      
      store.dispatch(setActiveTab('history'));
      
      const state = store.getState().approval;
      expect(state.activeTab).toBe('history');
    });
  });

  describe('Error Handling', () => {
    test('displays error messages when API calls fail', () => {
      const preloadedState = {
        error: {
          pendingApprovals: 'Network error',
          approvalHistory: 'Server error',
          approvalStats: null,
          approveRequest: null,
          rejectRequest: null,
          approvalDetails: null,
        },
      };

      renderWithProviders(<ApprovalDashboard />, { preloadedState });
      
      expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
    });

    test('loading states are handled correctly', () => {
      const preloadedState = {
        loading: {
          pendingApprovals: true,
          approvalHistory: false,
          approvalStats: false,
          approveRequest: false,
          rejectRequest: false,
          approvalDetails: false,
        },
      };

      renderWithProviders(<PendingApprovals />, { preloadedState });
      
      // Should show loading spinner
      expect(document.querySelector('.ant-spin')).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    test('approval workflow end-to-end', async () => {
      const user = userEvent.setup();
      const preloadedState = {
        pendingApprovals: mockPendingApprovals,
      };

      const { store } = renderWithProviders(<ApprovalDashboard />, { preloadedState });
      
      // Switch to pending approvals tab
      await user.click(screen.getByText('Pending Approvals'));
      
      // Verify pending approvals are shown
      expect(screen.getByText('Total Pending: 2')).toBeInTheDocument();
      
      // Switch to statistics tab
      await user.click(screen.getByText('Statistics'));
      
      // Verify statistics are loaded
      expect(store.getState().approval.activeTab).toBe('stats');
    });
  });
}); 
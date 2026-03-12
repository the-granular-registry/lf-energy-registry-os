import baseAPI from './baseAPI';
import { logger } from '../utils';

/**
 * Approval API endpoints for super admin approval management
 */

/**
 * Get all pending approval requests
 * @returns {Promise} API response with list of pending approvals
 */
export const getPendingApprovalsAPI = async () => {
  try {
    logger.debug('Fetching pending approvals');
    const response = await baseAPI.get('/approvals/pending');
    logger.debug('Pending approvals fetched successfully:', response.data.length);
    return response.data;
  } catch (error) {
    logger.error('Error fetching pending approvals:', error);
    throw error;
  }
};

/**
 * Get approval history
 * @param {Object} params - Query parameters for filtering
 * @returns {Promise} API response with list of approval history
 */
export const getApprovalHistoryAPI = async (params = {}) => {
  try {
    logger.debug('Fetching approval history with params:', params);
    const response = await baseAPI.get('/approvals/history', { params });
    logger.debug('Approval history fetched successfully:', response.data.length);
    return response.data;
  } catch (error) {
    logger.error('Error fetching approval history:', error);
    throw error;
  }
};

/**
 * Get specific approval request details
 * @param {number} approvalId - The ID of the approval request
 * @returns {Promise} API response with approval details
 */
export const getApprovalDetailsAPI = async (approvalId) => {
  try {
    logger.debug('Fetching approval details for ID:', approvalId);
    const response = await baseAPI.get(`/approvals/${approvalId}`);
    logger.debug('Approval details fetched successfully');
    return response.data;
  } catch (error) {
    logger.error('Error fetching approval details:', error);
    throw error;
  }
};

/**
 * Approve an approval request
 * @param {number} approvalId - The ID of the approval request
 * @param {Object} data - Approval data (comments, etc.)
 * @returns {Promise} API response
 */
export const approveRequestAPI = async (approvalId, data = {}) => {
  try {
    logger.debug('Approving request ID:', approvalId, 'with data:', data);
    const response = await baseAPI.post(`/approvals/${approvalId}/approve`, data);
    logger.debug('Request approved successfully');
    return response.data;
  } catch (error) {
    logger.error('Error approving request:', error);
    throw error;
  }
};

/**
 * Reject an approval request
 * @param {number} approvalId - The ID of the approval request
 * @param {Object} data - Rejection data (comments, etc.)
 * @returns {Promise} API response
 */
export const rejectRequestAPI = async (approvalId, data = {}) => {
  try {
    logger.debug('Rejecting request ID:', approvalId, 'with data:', data);
    const response = await baseAPI.post(`/approvals/${approvalId}/reject`, data);
    logger.debug('Request rejected successfully');
    return response.data;
  } catch (error) {
    logger.error('Error rejecting request:', error);
    throw error;
  }
};

/**
 * Get approval statistics for dashboard
 * @returns {Promise} API response with approval statistics
 */
export const getApprovalStatsAPI = async () => {
  try {
    logger.debug('Fetching approval statistics');
    
    // Since there's no dedicated stats endpoint, we'll fetch both pending and history
    // and calculate stats on the frontend
    const [pendingResponse, historyResponse] = await Promise.all([
      baseAPI.get('/approvals/pending'),
      baseAPI.get('/approvals/history')
    ]);
    
    const pending = pendingResponse.data;
    const history = historyResponse.data;
    
    const stats = {
      pending: pending.length,
      approved: history.filter(item => item.status === 'APPROVED').length,
      rejected: history.filter(item => item.status === 'REJECTED').length,
      total: pending.length + history.length,
      byType: {},
      byPriority: {},
      recentActivity: history.slice(0, 10).sort((a, b) => 
        new Date(b.reviewed_at || b.submitted_at) - new Date(a.reviewed_at || a.submitted_at)
      )
    };
    
    // Calculate by type
    [...pending, ...history].forEach(item => {
      stats.byType[item.request_type] = (stats.byType[item.request_type] || 0) + 1;
    });
    
    // Calculate by priority
    [...pending, ...history].forEach(item => {
      stats.byPriority[item.priority] = (stats.byPriority[item.priority] || 0) + 1;
    });
    
    logger.debug('Approval statistics calculated:', stats);
    return stats;
  } catch (error) {
    logger.error('Error fetching approval statistics:', error);
    throw error;
  }
}; 
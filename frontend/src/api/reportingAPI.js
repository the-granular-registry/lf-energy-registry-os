import baseAPI from './baseAPI';

/**
 * Get organizational summary for inventory report
 * @param {boolean} useCache - Whether to use cached data (default: true)
 * @returns {Promise<Object>} Organizational summary data
 */
export const getInventoryOrganizationalSummaryAPI = async (useCache = true) => {
  try {
    const response = await baseAPI.get('/reporting/inventory/organizational-summary', {
      params: { use_cache: useCache }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching organizational summary:', error);
    throw error;
  }
};

/**
 * Get hierarchical inventory data (Organization → Accounts → Devices)
 * @param {boolean} useCache - Whether to use cached data (default: true)
 * @returns {Promise<Array>} Hierarchical inventory data
 */
export const getInventoryHierarchicalDataAPI = async (useCache = true) => {
  try {
    const response = await baseAPI.get('/reporting/inventory/hierarchical-data', {
      params: { use_cache: useCache }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching hierarchical data:', error);
    throw error;
  }
};

/**
 * Get recent transaction history for inventory report
 * @param {number} limit - Number of transactions to return
 * @param {number} offset - Number of transactions to skip
 * @returns {Promise<Array>} Transaction history data
 */
export const getInventoryTransactionsAPI = async (limit = 10, offset = 0) => {
  try {
    const response = await baseAPI.get('/reporting/inventory/transactions', {
      params: { limit, offset }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

/**
 * Get cache status for reporting data
 * @returns {Promise<Object>} Cache status information
 */
export const getCacheStatusAPI = async () => {
  try {
    const response = await baseAPI.get('/reporting/cache/status');
    return response.data;
  } catch (error) {
    console.error('Error fetching cache status:', error);
    throw error;
  }
};

/**
 * Trigger refresh of reporting statistics
 * @param {boolean} organizationWide - Whether to refresh all organizations (admin only)
 * @returns {Promise<Object>} Refresh job information
 */
export const triggerRefreshAPI = async (organizationWide = false) => {
  try {
    const response = await baseAPI.post('/reporting/refresh', null, {
      params: { organization_wide: organizationWide }
    });
    return response.data;
  } catch (error) {
    console.error('Error triggering refresh:', error);
    throw error;
  }
};

/**
 * Get refresh job history
 * @param {number} limit - Number of history entries to return
 * @param {boolean} allOrganizations - Show all organizations (admin only)
 * @returns {Promise<Array>} Refresh job history
 */
export const getRefreshHistoryAPI = async (limit = 10, allOrganizations = false) => {
  try {
    const response = await baseAPI.get('/reporting/refresh/history', {
      params: { limit, all_organizations: allOrganizations }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching refresh history:', error);
    throw error;
  }
}; 

/**
 * Get certificate history grouped by action type
 * @param {Object} params - Query params { limit, offset, account_id, start_date, end_date }
 * @returns {Promise<Object>} { issuances, retirements, transfers, splits }
 */
export const getCertificateHistoryAPI = async (params = {}) => {
  try {
    const response = await baseAPI.get('/reporting/certificate-history', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching certificate history:', error);
    throw error;
  }
};
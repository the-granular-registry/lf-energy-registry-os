import baseAPI from './baseAPI';

// Account Management APIs
export const getAllAccountsAPI = async (
  organizationId = null,
  accountType = null,
  status = null,
  page = 1,
  size = 20
) => {
  const params = new URLSearchParams();
  if (organizationId) params.append('organization_id', organizationId);
  if (accountType) params.append('account_type', accountType);
  if (status) params.append('status', status);
  params.append('page', String(page));
  params.append('size', String(size));

  const url = `/super-admin/accounts?${params.toString()}`;
  return baseAPI.get(url);
};

export const createAccountAnyOrgAPI = async (accountData, mfaToken) => {
  // Include MFA token in the JSON request body
  const requestData = {
    ...accountData,
    mfa_token: mfaToken || 'placeholder'
  };
  
  return baseAPI.post('/super-admin/accounts/create', requestData);
};

export const deleteAccountAPI = async (accountId, deleteData) => {
  
  return baseAPI.delete(`/super-admin/accounts/${accountId}/delete`, {
    data: deleteData || {}
  });
};

export const activateAccountAPI = async (accountId) => {
  
  return baseAPI.post(`/super-admin/accounts/${accountId}/activate`);
};

export const suspendAccountAPI = async (accountId, reason) => {
  
  const formData = new FormData();
  formData.append('reason', reason);
  return baseAPI.post(`/super-admin/accounts/${accountId}/suspend`, formData);
};

export const addUserToAccountAPI = async (accountId, userId) => {
  
  return baseAPI.post(`/super-admin/accounts/${accountId}/add_user/${userId}`);
};

export const removeUserFromAccountAPI = async (accountId, userId) => {
  
  return baseAPI.delete(`/super-admin/accounts/${accountId}/remove_user/${userId}`);
};

// User Management APIs
export const getAllUsersAPI = async (organizationId = null, status = null) => {
  
  const params = new URLSearchParams();
  
  if (organizationId) params.append('organization_id', organizationId);
  if (status) params.append('status', status);
  
  const queryString = params.toString();
  const url = `/super-admin/users/all${queryString ? `?${queryString}` : ''}`;
  
  return baseAPI.get(url);
};

export const createUserAnyOrgAPI = async (userData, mfaToken) => {
  
  
  const formData = new FormData();
  formData.append('mfa_token', mfaToken);
  Object.keys(userData).forEach(key => {
    if (userData[key] !== null && userData[key] !== undefined) {
      formData.append(key, userData[key]);
    }
  });
  
  return baseAPI.post('/super-admin/users/create', formData);
};

export const updateUserAPI = async (userId, userData) => {
  
  return baseAPI.patch(`/users/update/${userId}`, userData);
};

export const deleteUserAPI = async (userId, deleteData) => {
  
  return baseAPI.delete(`/super-admin/users/${userId}/delete`, {
    data: deleteData
  });
};

export const activateUserAPI = async (userId) => {
  
  return baseAPI.post(`/super-admin/users/${userId}/activate`);
};

export const suspendUserAPI = async (userId, reason) => {
  
  const formData = new FormData();
  formData.append('reason', reason);
  return baseAPI.post(`/super-admin/users/${userId}/suspend`, formData);
};

// Device Management APIs
export const getAllDevicesAPI = async (organizationId = null, accountId = null, status = null) => {
  
  const params = new URLSearchParams();
  
  if (organizationId) params.append('organization_id', organizationId);
  if (accountId) params.append('account_id', accountId);
  if (status) params.append('status', status);
  
  const queryString = params.toString();
  const url = `/super-admin/devices/all${queryString ? `?${queryString}` : ''}`;
  
  return baseAPI.get(url);
};

export const addDeviceToAccountAPI = async (accountId, deviceId) => {
  
  return baseAPI.post(`/super-admin/devices/${deviceId}/assign_account/${accountId}`);
};

export const removeDeviceFromAccountAPI = async (deviceId) => {
  
  return baseAPI.post(`/super-admin/devices/${deviceId}/unassign_account`);
};

export const deleteDeviceAPI = async (deviceId) => {
  
  return baseAPI.delete(`/super-admin/devices/${deviceId}/delete`);
};

// Organization Management APIs
export const createOrganizationAPI = async (orgData, _mfaToken) => {
  // Backend expects JSON at /organizations/admin/create and handles role from JWT
  return baseAPI.post('/organizations/admin/create', orgData);
};

export const updateOrganizationAPI = async (orgId, orgData) => {
  
  return baseAPI.put(`/super-admin/organizations/${orgId}/update`, orgData);
};

export const deleteOrganizationAPI = async (orgId, _deleteData) => {
  
  // Use admin organization delete route which requires super admin role
  return baseAPI.delete(`/organizations/admin/${orgId}`);
};

export const activateOrganizationAPI = async (orgId) => {
  
  return baseAPI.post(`/super-admin/organizations/${orgId}/activate`);
};

export const suspendOrganizationAPI = async (orgId, reason) => {
  
  const formData = new FormData();
  formData.append('reason', reason);
  return baseAPI.post(`/super-admin/organizations/${orgId}/suspend`, formData);
};

// Approval Management APIs
export const getPendingApprovalsAPI = async () => {
  
  return baseAPI.get('/super-admin/approvals/pending');
};

export const getApprovalHistoryAPI = async () => {
  
  return baseAPI.get('/super-admin/approvals/history');
};

export const approveRequestAPI = async (approvalId) => {
  
  return baseAPI.post(`/super-admin/approvals/${approvalId}/approve`);
};

export const rejectRequestAPI = async (approvalId, reason) => {
  
  return baseAPI.post(`/super-admin/approvals/${approvalId}/reject`, {
    reason
  });
};

// MFA APIs
export const generateMFATokenAPI = async (action) => {
  
  const formData = new FormData();
  formData.append('action', action);
  return baseAPI.post('/super-admin/mfa/generate-token', formData);
};

export const verifyMFATokenAPI = async (token, action) => {
  
  const formData = new FormData();
  formData.append('token', token);
  formData.append('action', action);
  return baseAPI.post('/super-admin/mfa/verify-token', formData);
};

// Dashboard Statistics APIs
export const getSuperAdminStatsAPI = async () => {
  
  return baseAPI.get('/super-admin/dashboard/stats');
};

export const getOrganizationStatsAPI = async (organizationId) => {
  
  return baseAPI.get(`/super-admin/dashboard/organization/${organizationId}/stats`);
};

// Audit and Monitoring APIs
export const getAuditLogsAPI = async (startDate = null, endDate = null, userId = null, action = null) => {
  
  const params = new URLSearchParams();
  
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (userId) params.append('user_id', userId);
  if (action) params.append('action', action);
  
  const queryString = params.toString();
  const url = `/super-admin/audit/logs${queryString ? `?${queryString}` : ''}`;
  
  return baseAPI.get(url);
};

export const getSystemHealthAPI = async () => {
  
  return baseAPI.get('/super-admin/system/health');
};

// OIDC Admin APIs
export const listOidcClientsAPI = async () => {
  return baseAPI.get('/super-admin/oidc/clients');
};

export const createOidcClientAPI = async (payload) => {
  // payload: { client_name, redirect_uris: string[], client_type, allowed_scopes, is_active }
  return baseAPI.post('/super-admin/oidc/clients', payload);
};

export const getOidcClientAPI = async (id) => {
  return baseAPI.get(`/super-admin/oidc/clients/${id}`);
};

export const updateOidcClientAPI = async (id, payload) => {
  return baseAPI.patch(`/super-admin/oidc/clients/${id}`, payload);
};

export const rotateOidcClientSecretAPI = async (id) => {
  return baseAPI.post(`/super-admin/oidc/clients/${id}/rotate-secret`);
};

export const disableOidcClientAPI = async (id) => {
  return baseAPI.delete(`/super-admin/oidc/clients/${id}`);
};

// Organization Draft and Invitation APIs
export const createDraftOrganizationAPI = async (orgData) => {
  
  return baseAPI.post('/super-admin/organisations/draft', orgData);
};

export const sendInvitationAPI = async (draftId, invitationData) => {
  
  return baseAPI.post(`/super-admin/organisations/${draftId}/invite`, invitationData);
};

export const getDraftOrganizationsAPI = async (page = 1, size = 50) => {
  
  return baseAPI.get(`/super-admin/organisations/drafts?page=${page}&size=${size}`);
};

export const getInvitationStatusAPI = async (token) => {
  
  return baseAPI.get(`/super-admin/invitations/${token}/status`);
};

// Meter Data Approval APIs
export const getPendingMeterDataApprovalsAPI = async () => {
  return baseAPI.get('/super-admin/meter-data/pending-approvals');
};

export const getMeterDataDetailedReviewAPI = async (meterDataId) => {
  return baseAPI.get(`/super-admin/meter-data/${meterDataId}/detailed-review`);
};

export const approveMeterDataAPI = async (meterDataId, decision, comments, mfaToken) => {
  const formData = new FormData();
  formData.append('decision', decision);
  formData.append('comments', comments || '');
  formData.append('mfa_token', mfaToken || '');
  return baseAPI.post(`/super-admin/meter-data/${meterDataId}/approve`, formData);
};

export const rejectApprovalRequestAPI = async (approvalId) => {
  return baseAPI.post(`/approvals/${approvalId}/reject`);
};

export default {
  // Account Management
  getAllAccountsAPI,
  createAccountAnyOrgAPI,
  deleteAccountAPI,
  activateAccountAPI,
  suspendAccountAPI,
  addUserToAccountAPI,
  removeUserFromAccountAPI,
  
  // User Management
  getAllUsersAPI,
  createUserAnyOrgAPI,
  updateUserAPI,
  deleteUserAPI,
  activateUserAPI,
  suspendUserAPI,
  
  // Device Management
  getAllDevicesAPI,
  addDeviceToAccountAPI,
  removeDeviceFromAccountAPI,
  deleteDeviceAPI,
  
  // Organization Management
  createOrganizationAPI,
  updateOrganizationAPI,
  deleteOrganizationAPI,
  activateOrganizationAPI,
  suspendOrganizationAPI,
  
  // Approval Management
  getPendingApprovalsAPI,
  getApprovalHistoryAPI,
  approveRequestAPI,
  rejectRequestAPI,
  
  // MFA
  generateMFATokenAPI,
  verifyMFATokenAPI,
  
  // Dashboard
  getSuperAdminStatsAPI,
  getOrganizationStatsAPI,
  
  // Audit
  getAuditLogsAPI,
  getSystemHealthAPI,
  
  // Organization Drafts
  createDraftOrganizationAPI,
  sendInvitationAPI,
  getDraftOrganizationsAPI,
  getInvitationStatusAPI,
  
  // Meter Data Approvals
  getPendingMeterDataApprovalsAPI,
  getMeterDataDetailedReviewAPI,
  approveMeterDataAPI,
  rejectApprovalRequestAPI
};

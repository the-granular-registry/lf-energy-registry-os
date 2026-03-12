import baseAPI from "./baseAPI";

// Get all organizations (for super admin)
export const getOrganizationsAPI = () => {
  return baseAPI.get("/organizations/list");
};

// Get organization details
export const getOrganizationDetailsAPI = (organizationId) => {
  return baseAPI.get(`/organizations/${organizationId}`);
};

// Create new organization
export const createOrganizationAPI = (organizationData) => {
  return baseAPI.post("/organizations", organizationData);
};

// Update organization
export const updateOrganizationAPI = (organizationId, organizationData) => {
  return baseAPI.put(`/organizations/${organizationId}`, organizationData);
};

// Get pending organization approvals
export const getPendingOrganizationsAPI = () => {
  return baseAPI.get("/organizations/pending");
};

// Approve organization
export const approveOrganizationAPI = (organizationId, approvalData) => {
  return baseAPI.post(`/organizations/${organizationId}/approve`, approvalData);
};

// Reject organization
export const rejectOrganizationAPI = (organizationId, rejectionData) => {
  return baseAPI.post(`/organizations/${organizationId}/reject`, rejectionData);
};

// Get users in organization
export const getOrganizationUsersAPI = (organizationId) => {
  return baseAPI.get(`/organizations/${organizationId}/users`);
};

// Get organization statistics (includes users, accounts, devices, certificates)
export const getOrganizationStatsAPI = (organizationId) => {
  return baseAPI.get(`/organizations/admin/${organizationId}/stats`);
};

// DEPRECATED: Use getOrganizationStatsAPI or getAllAccountsAPI with organization_id filter
// Get accounts in organization (endpoint not implemented - returns 404)
export const getOrganizationAccountsAPI = (organizationId) => {
  console.warn('getOrganizationAccountsAPI is deprecated - endpoint returns 404. Use getOrganizationStatsAPI or getAllAccountsAPI instead.');
  return baseAPI.get(`/organizations/${organizationId}/accounts`);
};

// DEPRECATED: Use getAllAccessibleDevicesAPI or getOrganizationStatsAPI
// Get devices in organization (endpoint not implemented - returns 404)
export const getOrganizationDevicesAPI = (organizationId) => {
  console.warn('getOrganizationDevicesAPI is deprecated - endpoint returns 404. Use getOrganizationStatsAPI instead.');
  return baseAPI.get(`/organizations/${organizationId}/devices`);
}; 
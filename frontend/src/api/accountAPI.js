import baseAPI from "./baseAPI";

export const getAccountAPI = (account_id) => {
  return baseAPI.get(`/accounts/${account_id}`);
};

export const getAccountSummaryAPI = (account_id) => {
  return baseAPI.get(`/accounts/${account_id}/summary`);
};

export const getAccountDevicesAPI = (account_id) => {
  return baseAPI.get(`/accounts/${account_id}/devices`);
};

export const getAccountCertificatesDevicesAPI = (account_id) => {
  return baseAPI.get(`/accounts/${account_id}/certificates/devices`);
};

export const getAccountWhitelistInverseAPI = (account_id) => {
  return baseAPI.get(`/accounts/${account_id}/whitelist_inverse`);
};

export const getAccountWhitelistAPI = (account_id) => {
  return baseAPI.get(`/accounts/${account_id}/whitelist`);
};

// New CRUD functions for account management
export const createAccountAPI = (accountData) => {
  return baseAPI.post(`/accounts/create`, accountData);
};

export const updateAccountAPI = (accountId, accountData) => {
  return baseAPI.patch(`/accounts/update/${accountId}`, accountData);
};

export const deleteAccountAPI = (accountId) => {
  return baseAPI.delete(`/accounts/delete/${accountId}`);
};

export const listAllAccountsAPI = () => {
  return baseAPI.get(`/accounts/list`);
};

// Get users linked to an account
export const getAccountUsersAPI = (accountId) => {
  return baseAPI.get(`/accounts/${accountId}/users`);
};

// Linked Accounts routes
export const createLinkRequestAPI = (sourceAccountId, payload) => {
  return baseAPI.post(`/api/v1/links/accounts/${sourceAccountId}/requests`, payload);
};

export const listLinkRequestsAPI = (params) => {
  return baseAPI.get(`/api/v1/links/requests`, { params });
};

export const acceptLinkRequestAPI = (requestId, payload) => {
  return baseAPI.post(`/api/v1/links/requests/${requestId}/accept`, payload);
};

export const declineLinkRequestAPI = (requestId) => {
  return baseAPI.post(`/api/v1/links/requests/${requestId}/decline`);
};

export const revokeLinkRequestAPI = (requestId) => {
  return baseAPI.post(`/api/v1/links/requests/${requestId}/revoke`);
};

// Subaccount management
export const createSubAccountAPI = (accountId, subAccountData) => {
  return baseAPI.post(`/api/v1/accounts/${accountId}/sub-accounts`, subAccountData);
};

export const listSubAccountsAPI = (accountId, includeInactive = false) => {
  return baseAPI.get(`/api/v1/accounts/${accountId}/sub-accounts`, {
    params: { include_inactive: includeInactive }
  });
};

export const getSubAccountDetailsAPI = (subAccountId) => {
  return baseAPI.get(`/api/v1/sub-accounts/${subAccountId}`);
};

export const generateInvitationAPI = (subAccountId, invitationData) => {
  return baseAPI.post(`/api/v1/sub-accounts/${subAccountId}/generate-invitation`, invitationData);
};

export const allocateToSubAccountAPI = (subAccountId, allocationData) => {
  return baseAPI.patch(`/api/v1/sub-accounts/${subAccountId}/allocate`, allocationData);
};

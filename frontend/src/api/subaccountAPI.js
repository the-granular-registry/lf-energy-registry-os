import baseAPI from './baseAPI';

// Create subaccounts under a parent account
export const createSubaccounts = async (parentAccountId, subaccounts) => {
  return await baseAPI.post('/subaccounts/batch-create', {
    parent_account_id: parentAccountId,
    subaccounts: subaccounts,
  });
};

// Get all subaccounts for a parent account
export const getSubaccounts = async (parentAccountId) => {
  return await baseAPI.get('/subaccounts/', {
    params: { parent_account_id: parentAccountId },
  });
};

// Get user's claimed subaccounts
export const getUserSubaccounts = async () => {
  return await baseAPI.get('/subaccounts/me');
};

// Claim a subaccount using invitation token
export const claimSubaccount = async (invitationToken) => {
  return await baseAPI.post('/subaccounts/claim', {
    invitation_token: invitationToken,
  });
};

// Update subaccount shares
export const updateSubaccountShares = async (subaccountId, updates) => {
  return await baseAPI.patch(`/subaccounts/${subaccountId}`, updates);
};

// Get subaccount allocation details
export const getSubaccountAllocations = async (subaccountId) => {
  return await baseAPI.get(`/subaccounts/${subaccountId}/allocations`);
};

// Generate magic link for a subaccount
export const generateMagicLink = async (subaccountId) => {
  return await baseAPI.get(`/subaccounts/${subaccountId}/magic-link`);
};

export default {
  createSubaccounts,
  getSubaccounts,
  getUserSubaccounts,
  claimSubaccount,
  updateSubaccountShares,
  getSubaccountAllocations,
  generateMagicLink,
};

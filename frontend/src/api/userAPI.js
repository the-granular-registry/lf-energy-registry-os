import baseAPI from "./baseAPI";

export const readUserAPI = (userID) => {
  return baseAPI.get(`/users/${userID}`);
};

export const readCurrentUserAPI = () => {
  return baseAPI.get(`/users/me`);
};

export const getCurrentUserAccountsAPI = (includeSubaccounts = true) => {
  return baseAPI.get(`/users/me/accounts`, {
    params: { include_subaccounts: includeSubaccounts }
  });
};

export const getCurrentUserCertificatesAPI = (includeSubaccounts = true) => {
  return baseAPI.get(`/users/me/certificates`, {
    params: { include_subaccounts: includeSubaccounts }
  });
};

export const getUsersByAccountAPI = (accountId) => {
  return baseAPI.get(`/accounts/${accountId}/users`);
};

export const createUserAPI = (userData) => {
  // Backend expects role as integer (UserRoles enum). Normalize if string is provided.
  const roleMap = {
    SUPER_ADMIN: 5,
    ADMIN: 4,
    PRODUCTION_USER: 3,
    TRADING_USER: 2,
    AUDIT_USER: 1,
  };
  const normalized = {
    ...userData,
    role: roleMap[userData?.role] ?? userData?.role,
  };
  return baseAPI.post(`/users/create`, normalized);
};

export const updateUserAPI = (userId, userData) => {
  return baseAPI.patch(`/users/update/${userId}`, userData);
};

export const deleteUserAPI = (userId) => {
  return baseAPI.patch(`/users/update/${userId}`, { is_deleted: true });
};

export const changeUserRoleAPI = (userId, role) => {
  // Map string role to integer if needed
  const roleMap = {
    ADMIN: 4,
    PRODUCTION_USER: 3,
    TRADING_USER: 2,
    AUDIT_USER: 1,
  };
  const roleValue = roleMap[role] !== undefined ? roleMap[role] : role;
  return baseAPI.post(`/users/change_role/${userId}?role=${roleValue}`);
};

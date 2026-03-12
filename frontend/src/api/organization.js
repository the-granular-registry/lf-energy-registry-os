import api from './baseAPI';

// Organization API methods
export const getAdminOrganizations = (page = 1, perPage = 20) => {
  return api.get('/organizations/admin/list', {
    params: { page, per_page: perPage }
  });
};

export const getOrganizationDetails = (organizationId) => {
  return api.get(`/organizations/admin/${organizationId}`);
};

export const updateOrganizationAPI = (organizationId, updateData) => {
  return api.put(`/organizations/admin/${organizationId}`, updateData);
};

export const deleteOrganizationAPI = (organizationId) => {
  return api.delete(`/organizations/admin/${organizationId}`);
};

export const getOrganizationUsers = (organizationId) => {
  return api.get(`/organizations/${organizationId}/users`);
};

export const getOrganizationStats = (organizationId) => {
  return api.get(`/organizations/admin/${organizationId}/stats`);
};

export const createOrganization = (organizationData) => {
  return api.post('/organizations/create', organizationData);
};

export const createAdminOrganization = (organizationData) => {
  return api.post('/organizations/admin/create', organizationData);
};

export const getOrganization = (organizationId) => {
  return api.get(`/organizations/${organizationId}`);
};

export const approveOrganization = (organizationId) => {
  return api.post(`/organizations/${organizationId}/approve`);
};

export const rejectOrganization = (organizationId) => {
  return api.post(`/organizations/${organizationId}/reject`);
};

export const listAllOrganizations = () => {
  return api.get('/organizations/list');
}; 
import baseAPI from './baseAPI';
import { logger } from '../utils';

// Super Admin Invitation Management APIs

/**
 * Upload project metadata CSV for draft organisation creation
 * @param {FormData} formData - Form data containing the CSV file
 * @returns {Promise} API response
 */
export const uploadProjectMetadataAPI = async (formData) => {
  try {
    const response = await baseAPI.post('/super-admin/organisations/metadata-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    logger.info('Project metadata uploaded successfully');
    return response.data;
  } catch (error) {
    logger.error('Error uploading project metadata:', error);
    throw error;
  }
};

/**
 * Create draft organisation
 * @param {Object} organisationData - Organisation draft data
 * @returns {Promise} API response
 */
export const createDraftOrganisationAPI = async (organisationData) => {
  try {
    const response = await baseAPI.post('/super-admin/organisations/draft', organisationData);
    logger.info('Draft organisation created successfully');
    return response.data;
  } catch (error) {
    logger.error('Error creating draft organisation:', error);
    throw error;
  }
};

/**
 * Get draft organisations list
 * @param {Object} params - Query parameters
 * @returns {Promise} API response
 */
export const getDraftOrganisationsAPI = async (params = {}) => {
  try {
    const response = await baseAPI.get('/super-admin/organisations/drafts', { params });
    logger.info('Draft organisations fetched successfully');
    return response.data;
  } catch (error) {
    logger.error('Error fetching draft organisations:', error);
    throw error;
  }
};

/**
 * Send invitation email for a draft organisation
 * @param {string} organisationId - Draft organisation ID
 * @param {Object} invitationData - Invitation details
 * @returns {Promise} API response
 */
export const sendInvitationAPI = async (organisationId, invitationData) => {
  try {
    const response = await baseAPI.post(`/super-admin/organisations/${organisationId}/invite`, invitationData);
    logger.info('Invitation sent successfully');
    return response.data;
  } catch (error) {
    logger.error('Error sending invitation:', error);
    throw error;
  }
};

/**
 * Get invitation status
 * @param {string} token - Invitation token
 * @returns {Promise} API response
 */
export const getInvitationStatusAPI = async (token) => {
  try {
    const response = await baseAPI.get(`/super-admin/invitations/${token}/status`);
    logger.info('Invitation status fetched successfully');
    return response.data;
  } catch (error) {
    logger.error('Error fetching invitation status:', error);
    throw error;
  }
};

// User Invitation Claiming APIs

/**
 * Validate invitation token
 * @param {string} token - Invitation token
 * @returns {Promise} API response
 */
export const validateInvitationTokenAPI = async (token) => {
  try {
    const response = await baseAPI.get(`/invitations/${token}/validate`);
    logger.info('Invitation token validated successfully');
    return response.data;
  } catch (error) {
    logger.error('Error validating invitation token:', error);
    throw error;
  }
};

/**
 * Get organisation draft details for an invitation
 * @param {string} token - Invitation token
 * @returns {Promise} API response
 */
export const getOrganisationDraftDetailsAPI = async (token) => {
  try {
    const response = await baseAPI.get(`/invitations/${token}/organisation`);
    logger.info('Organisation draft details fetched successfully');
    return response.data;
  } catch (error) {
    logger.error('Error fetching organisation draft details:', error);
    throw error;
  }
};

/**
 * Claim invitation and create user account
 * @param {string} token - Invitation token
 * @param {Object} claimData - User claim data
 * @returns {Promise} API response
 */
export const claimInvitationAPI = async (token, claimData) => {
  try {
    const response = await baseAPI.post(`/invitations/${token}/claim`, claimData);
    logger.info('Invitation claimed successfully');
    return response.data;
  } catch (error) {
    logger.error('Error claiming invitation:', error);
    throw error;
  }
};

/**
 * Initiate payment for claimed invitation
 * @param {string} token - Invitation token
 * @param {Object} paymentData - Payment data
 * @returns {Promise} API response
 */
export const initiatePaymentAPI = async (token, paymentData) => {
  try {
    const response = await baseAPI.post(`/invitations/${token}/payment`, paymentData);
    logger.info('Payment initiated successfully');
    return response.data;
  } catch (error) {
    logger.error('Error initiating payment:', error);
    throw error;
  }
};

/**
 * Get payment status for invitation
 * @param {string} token - Invitation token
 * @returns {Promise} API response
 */
export const getPaymentStatusAPI = async (token) => {
  try {
    const response = await baseAPI.get(`/invitations/${token}/payment/status`);
    logger.info('Payment status fetched successfully');
    return response.data;
  } catch (error) {
    logger.error('Error fetching payment status:', error);
    throw error;
  }
};

/**
 * Verify 2FA code and complete claiming
 * @param {string} token - Invitation token
 * @param {Object} verificationData - 2FA verification data
 * @returns {Promise} API response
 */
export const verify2FAAPI = async (token, verificationData) => {
  try {
    const response = await baseAPI.post(`/invitations/${token}/verify-2fa`, verificationData);
    logger.info('2FA verification completed successfully');
    return response.data;
  } catch (error) {
    logger.error('Error verifying 2FA:', error);
    throw error;
  }
}; 
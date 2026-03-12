import baseAPI from "./baseAPI";

export const registrationAPI = {
  /**
   * Register a new organization with user and account
   * @param {Object} registrationData - The registration data
   * @param {Object} registrationData.organization - Organization details
   * @param {Object} registrationData.user - User details
   * @param {Object} registrationData.account - Account details
   * @returns {Promise} API response
   */
  registerOrganization: async (registrationData) => {
    try {
      const response = await baseAPI.post(
        "/api/v1/register/organization",
        registrationData
      );
      return response;
    } catch (error) {
      // Re-throw with consistent error structure
      throw error;
    }
  },

  /**
   * Suggest organizations by email domain
   * @param {string} email User email
   */
  suggestOrganizations: async (email) => {
    const response = await baseAPI.get(
      `/api/v1/register/suggest-organizations`,
      { params: { email } }
    );
    return response;
  },

  /**
   * Check if organization name is available
   * @param {string} organizationName - The organization name to check
   * @returns {Promise} API response with availability status
   */
  checkNameAvailability: async (organizationName) => {
    try {
      const response = await baseAPI.get(
        `/api/v1/register/check-name?name=${encodeURIComponent(organizationName)}`
      );
      return response;
    } catch (error) {
      // If endpoint doesn't exist, assume name checking is not implemented
      // Return available = true to let the main registration handle validation
      if (error.response?.status === 404) {
        return {
          data: {
            available: true,
            message: "Name availability check not implemented"
          }
        };
      }
      throw error;
    }
  },

  /**
   * Get registration health status
   * @returns {Promise} API response with health status
   */
  getRegistrationHealth: async () => {
    try {
      const response = await baseAPI.get("/api/v1/register/health");
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Validate registration form data (client-side helper)
   * @param {Object} formData - The form data to validate
   * @returns {Object} Validation result
   */
  validateFormData: (formData) => {
    const errors = {};

    // Organization validation
    if (!formData.organization?.name?.trim()) {
      errors['organization.name'] = 'Organization name is required';
    }
    // address optional; primary contact comes from user email

    // User validation
    if (!formData.user?.name?.trim()) {
      errors['user.name'] = 'User name is required';
    }
    if (!formData.user?.email?.trim()) {
      errors['user.email'] = 'User email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.user.email)) {
      errors['user.email'] = 'Invalid email format';
    }
    if (!formData.user?.password) {
      errors['user.password'] = 'Password is required';
    } else if (formData.user.password.length < 8) {
      errors['user.password'] = 'Password must be at least 8 characters long';
    }

    // Account validation
    if (!formData.account?.name?.trim()) {
      errors['account.name'] = 'Account name is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * Format registration data for API submission
   * @param {Object} formData - Raw form data
   * @returns {Object} Formatted data for API
   */
  formatRegistrationData: (formData) => {
    const payload = {
      organization: {
        name: formData.organization.name?.trim(),
        address: formData.organization.address?.trim() || undefined,
        primary_contact_email: formData.organization.primary_contact_email?.trim(),
        organization_type: formData.organization.organization_type || 'ENERGY_PRODUCER',
        business_registration_number: formData.organization.business_registration_number?.trim() || undefined,
        website: formData.organization.website?.trim() || undefined,
      },
      user: {
        name: formData.user.name?.trim(),
        email: formData.user.email?.trim(),
        password: formData.user.password,
      },
    };
    const accountName = formData.account.name?.trim();
    if (accountName) {
      payload.account = { name: accountName };
    }
    return payload;
  },
}; 
import { createAsyncThunk } from "@reduxjs/toolkit";
import { logger } from "../../utils";
import Cookies from "js-cookie";

// Base SSS API functions
const sssAPI = {
  // Fetch SSS data
  fetchSSSData: async () => {
    const response = await fetch('/api/sss/data', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch SSS data');
    }
    return response.json();
  },

  // Fetch SSS factors
  fetchSSSFactors: async () => {
    const response = await fetch('/api/sss/factors', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch SSS factors');
    }
    return response.json();
  },

  // Fetch SSS resources
  fetchSSSResources: async () => {
    const response = await fetch('/api/sss/resources', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch SSS resources');
    }
    return response.json();
  },

  // Fetch SSS allocations
  fetchSSSAllocations: async () => {
    const response = await fetch('/api/sss/allocations', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch SSS allocations');
    }
    return response.json();
  },

  // Fetch SSS providers
  fetchSSSProviders: async () => {
    const response = await fetch('/api/sss/providers', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch SSS providers');
    }
    return response.json();
  },

  // Fetch SSS customer links
  fetchSSSCustomerLinks: async () => {
    const response = await fetch('/api/sss/customer-links', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch SSS customer links');
    }
    return response.json();
  },

  // Upload SSS data
  uploadSSSData: async (data) => {
    const response = await fetch('/api/sss/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error('Failed to upload SSS data');
    }
    return response.json();
  },

  // Create SSS resource
  createSSSResource: async (resourceData) => {
    const response = await fetch('/api/sss/resources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      },
      body: JSON.stringify(resourceData)
    });
    if (!response.ok) {
      throw new Error('Failed to create SSS resource');
    }
    return response.json();
  },

  // Create SSS factor
  createSSSFactor: async (factorData) => {
    const response = await fetch('/api/sss/factors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      },
      body: JSON.stringify(factorData)
    });
    if (!response.ok) {
      throw new Error('Failed to create SSS factor');
    }
    return response.json();
  },

  // Create SSS allocation
  createSSSAllocation: async (allocationData) => {
    const response = await fetch('/api/sss/allocations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      },
      body: JSON.stringify(allocationData)
    });
    if (!response.ok) {
      throw new Error('Failed to create SSS allocation');
    }
    return response.json();
  },

  // Create SSS provider
  createSSSProvider: async (providerData) => {
    const response = await fetch('/api/sss/providers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      },
      body: JSON.stringify(providerData)
    });
    if (!response.ok) {
      throw new Error('Failed to create SSS provider');
    }
    return response.json();
  },

  // Create SSS customer link
  createSSSCustomerLink: async (linkData) => {
    const response = await fetch('/api/sss/customer-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      },
      body: JSON.stringify(linkData)
    });
    if (!response.ok) {
      throw new Error('Failed to create SSS customer link');
    }
    return response.json();
  },

  // Update SSS resource
  updateSSSResource: async ({ id, resourceData }) => {
    const response = await fetch(`/api/sss/resources/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      },
      body: JSON.stringify(resourceData)
    });
    if (!response.ok) {
      throw new Error('Failed to update SSS resource');
    }
    return response.json();
  },

  // Update SSS factor
  updateSSSFactor: async ({ id, factorData }) => {
    const response = await fetch(`/api/sss/factors/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      },
      body: JSON.stringify(factorData)
    });
    if (!response.ok) {
      throw new Error('Failed to update SSS factor');
    }
    return response.json();
  },

  // Update SSS allocation
  updateSSSAllocation: async ({ id, allocationData }) => {
    const response = await fetch(`/api/sss/allocations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      },
      body: JSON.stringify(allocationData)
    });
    if (!response.ok) {
      throw new Error('Failed to update SSS allocation');
    }
    return response.json();
  },

  // Update SSS provider
  updateSSSProvider: async ({ id, providerData }) => {
    const response = await fetch(`/api/sss/providers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      },
      body: JSON.stringify(providerData)
    });
    if (!response.ok) {
      throw new Error('Failed to update SSS provider');
    }
    return response.json();
  },

  // Delete SSS resource
  deleteSSSResource: async (id) => {
    const response = await fetch(`/api/sss/resources/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to delete SSS resource');
    }
    return response.json();
  },

  // Delete SSS factor
  deleteSSSFactor: async (id) => {
    const response = await fetch(`/api/sss/factors/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to delete SSS factor');
    }
    return response.json();
  },

  // Delete SSS allocation
  deleteSSSAllocation: async (id) => {
    const response = await fetch(`/api/sss/allocations/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to delete SSS allocation');
    }
    return response.json();
  },

  // Delete SSS provider
  deleteSSSProvider: async (id) => {
    const response = await fetch(`/api/sss/providers/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to delete SSS provider');
    }
    return response.json();
  },

  // Delete SSS customer link
  deleteSSSCustomerLink: async (id) => {
    const response = await fetch(`/api/sss/customer-links/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Cookies.get('access_token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to delete SSS customer link');
    }
    return response.json();
  }
};

// Thunks
export const fetchSSSData = createAsyncThunk(
  "sss/fetchSSSData",
  async (_, { rejectWithValue }) => {
    try {
      logger.debug("Fetching SSS data");
      const data = await sssAPI.fetchSSSData();
      logger.debug("SSS data fetched successfully");
      return data;
    } catch (error) {
      logger.error("Error fetching SSS data:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const fetchSSSFactors = createAsyncThunk(
  "sss/fetchSSSFactors",
  async (_, { rejectWithValue }) => {
    try {
      logger.debug("Fetching SSS factors");
      const data = await sssAPI.fetchSSSFactors();
      logger.debug("SSS factors fetched successfully");
      return data;
    } catch (error) {
      logger.error("Error fetching SSS factors:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const fetchSSSResources = createAsyncThunk(
  "sss/fetchSSSResources",
  async (_, { rejectWithValue }) => {
    try {
      logger.debug("Fetching SSS resources");
      const data = await sssAPI.fetchSSSResources();
      logger.debug("SSS resources fetched successfully");
      return data;
    } catch (error) {
      logger.error("Error fetching SSS resources:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const fetchSSSAllocations = createAsyncThunk(
  "sss/fetchSSSAllocations",
  async (_, { rejectWithValue }) => {
    try {
      logger.debug("Fetching SSS allocations");
      const data = await sssAPI.fetchSSSAllocations();
      logger.debug("SSS allocations fetched successfully");
      return data;
    } catch (error) {
      logger.error("Error fetching SSS allocations:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const fetchSSSProviders = createAsyncThunk(
  "sss/fetchSSSProviders",
  async (_, { rejectWithValue }) => {
    try {
      logger.debug("Fetching SSS providers");
      const data = await sssAPI.fetchSSSProviders();
      logger.debug("SSS providers fetched successfully");
      return data;
    } catch (error) {
      logger.error("Error fetching SSS providers:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const fetchSSSCustomerLinks = createAsyncThunk(
  "sss/fetchSSSCustomerLinks",
  async (_, { rejectWithValue }) => {
    try {
      logger.debug("Fetching SSS customer links");
      const data = await sssAPI.fetchSSSCustomerLinks();
      logger.debug("SSS customer links fetched successfully");
      return data;
    } catch (error) {
      logger.error("Error fetching SSS customer links:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const uploadSSSData = createAsyncThunk(
  "sss/uploadSSSData",
  async (data, { rejectWithValue }) => {
    try {
      logger.debug("Uploading SSS data");
      const result = await sssAPI.uploadSSSData(data);
      logger.debug("SSS data uploaded successfully");
      return result;
    } catch (error) {
      logger.error("Error uploading SSS data:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const createSSSResource = createAsyncThunk(
  "sss/createSSSResource",
  async (resourceData, { rejectWithValue }) => {
    try {
      logger.debug("Creating SSS resource");
      const result = await sssAPI.createSSSResource(resourceData);
      logger.debug("SSS resource created successfully");
      return result;
    } catch (error) {
      logger.error("Error creating SSS resource:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const createSSSFactor = createAsyncThunk(
  "sss/createSSSFactor",
  async (factorData, { rejectWithValue }) => {
    try {
      logger.debug("Creating SSS factor");
      const result = await sssAPI.createSSSFactor(factorData);
      logger.debug("SSS factor created successfully");
      return result;
    } catch (error) {
      logger.error("Error creating SSS factor:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const createSSSAllocation = createAsyncThunk(
  "sss/createSSSAllocation",
  async (allocationData, { rejectWithValue }) => {
    try {
      logger.debug("Creating SSS allocation");
      const result = await sssAPI.createSSSAllocation(allocationData);
      logger.debug("SSS allocation created successfully");
      return result;
    } catch (error) {
      logger.error("Error creating SSS allocation:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const createSSSProvider = createAsyncThunk(
  "sss/createSSSProvider",
  async (providerData, { rejectWithValue }) => {
    try {
      logger.debug("Creating SSS provider");
      const result = await sssAPI.createSSSProvider(providerData);
      logger.debug("SSS provider created successfully");
      return result;
    } catch (error) {
      logger.error("Error creating SSS provider:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const createSSSCustomerLink = createAsyncThunk(
  "sss/createSSSCustomerLink",
  async (linkData, { rejectWithValue }) => {
    try {
      logger.debug("Creating SSS customer link");
      const result = await sssAPI.createSSSCustomerLink(linkData);
      logger.debug("SSS customer link created successfully");
      return result;
    } catch (error) {
      logger.error("Error creating SSS customer link:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const updateSSSResource = createAsyncThunk(
  "sss/updateSSSResource",
  async ({ id, resourceData }, { rejectWithValue }) => {
    try {
      logger.debug("Updating SSS resource");
      const result = await sssAPI.updateSSSResource({ id, resourceData });
      logger.debug("SSS resource updated successfully");
      return result;
    } catch (error) {
      logger.error("Error updating SSS resource:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const updateSSSFactor = createAsyncThunk(
  "sss/updateSSSFactor",
  async ({ id, factorData }, { rejectWithValue }) => {
    try {
      logger.debug("Updating SSS factor");
      const result = await sssAPI.updateSSSFactor({ id, factorData });
      logger.debug("SSS factor updated successfully");
      return result;
    } catch (error) {
      logger.error("Error updating SSS factor:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const updateSSSAllocation = createAsyncThunk(
  "sss/updateSSSAllocation",
  async ({ id, allocationData }, { rejectWithValue }) => {
    try {
      logger.debug("Updating SSS allocation");
      const result = await sssAPI.updateSSSAllocation({ id, allocationData });
      logger.debug("SSS allocation updated successfully");
      return result;
    } catch (error) {
      logger.error("Error updating SSS allocation:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const updateSSSProvider = createAsyncThunk(
  "sss/updateSSSProvider",
  async ({ id, providerData }, { rejectWithValue }) => {
    try {
      logger.debug("Updating SSS provider");
      const result = await sssAPI.updateSSSProvider({ id, providerData });
      logger.debug("SSS provider updated successfully");
      return result;
    } catch (error) {
      logger.error("Error updating SSS provider:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const deleteSSSResource = createAsyncThunk(
  "sss/deleteSSSResource",
  async (id, { rejectWithValue }) => {
    try {
      logger.debug("Deleting SSS resource");
      const result = await sssAPI.deleteSSSResource(id);
      logger.debug("SSS resource deleted successfully");
      return result;
    } catch (error) {
      logger.error("Error deleting SSS resource:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const deleteSSSFactor = createAsyncThunk(
  "sss/deleteSSSFactor",
  async (id, { rejectWithValue }) => {
    try {
      logger.debug("Deleting SSS factor");
      const result = await sssAPI.deleteSSSFactor(id);
      logger.debug("SSS factor deleted successfully");
      return result;
    } catch (error) {
      logger.error("Error deleting SSS factor:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const deleteSSSAllocation = createAsyncThunk(
  "sss/deleteSSSAllocation",
  async (id, { rejectWithValue }) => {
    try {
      logger.debug("Deleting SSS allocation");
      const result = await sssAPI.deleteSSSAllocation(id);
      logger.debug("SSS allocation deleted successfully");
      return result;
    } catch (error) {
      logger.error("Error deleting SSS allocation:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const deleteSSSProvider = createAsyncThunk(
  "sss/deleteSSSProvider",
  async (id, { rejectWithValue }) => {
    try {
      logger.debug("Deleting SSS provider");
      const result = await sssAPI.deleteSSSProvider(id);
      logger.debug("SSS provider deleted successfully");
      return result;
    } catch (error) {
      logger.error("Error deleting SSS provider:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const deleteSSSCustomerLink = createAsyncThunk(
  "sss/deleteSSSCustomerLink",
  async (id, { rejectWithValue }) => {
    try {
      logger.debug("Deleting SSS customer link");
      const result = await sssAPI.deleteSSSCustomerLink(id);
      logger.debug("SSS customer link deleted successfully");
      return result;
    } catch (error) {
      logger.error("Error deleting SSS customer link:", error);
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
); 
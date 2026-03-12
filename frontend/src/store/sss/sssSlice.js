import { createSlice } from "@reduxjs/toolkit";
import { 
  fetchSSSData,
  fetchSSSFactors,
  fetchSSSResources,
  fetchSSSAllocations,
  fetchSSSProviders,
  fetchSSSCustomerLinks,
  uploadSSSData,
  createSSSResource,
  createSSSFactor,
  createSSSAllocation,
  createSSSProvider,
  createSSSCustomerLink,
  updateSSSResource,
  updateSSSFactor,
  updateSSSAllocation,
  updateSSSProvider,
  deleteSSSResource,
  deleteSSSFactor,
  deleteSSSAllocation,
  deleteSSSProvider,
  deleteSSSCustomerLink
} from "./sssThunk";

const sssSlice = createSlice({
  name: "sss",
  initialState: {
    sssData: {
      factors: [],
      resources: [],
      allocations: [],
      providers: [],
      customerLinks: [],
      uploadHistory: []
    },
    loading: false,
    error: null,
    lastFetch: null,
  },
  reducers: {
    clearErrors: (state) => {
      state.error = null;
    },
    clearSSSData: (state) => {
      state.sssData = {
        factors: [],
        resources: [],
        allocations: [],
        providers: [],
        customerLinks: [],
        uploadHistory: []
      };
    },
    setSSSData: (state, action) => {
      state.sssData = { ...state.sssData, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch SSS Data
      .addCase(fetchSSSData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSSSData.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.sssData = { ...state.sssData, ...action.payload };
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchSSSData.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload?.message || "Failed to fetch SSS data",
          status: action.payload?.status,
          data: action.payload?.data,
        };
      })

      // Fetch SSS Factors
      .addCase(fetchSSSFactors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSSSFactors.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.sssData.factors = action.payload || [];
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchSSSFactors.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload?.message || "Failed to fetch SSS factors",
          status: action.payload?.status,
          data: action.payload?.data,
        };
      })

      // Fetch SSS Resources
      .addCase(fetchSSSResources.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSSSResources.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.sssData.resources = action.payload || [];
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchSSSResources.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload?.message || "Failed to fetch SSS resources",
          status: action.payload?.status,
          data: action.payload?.data,
        };
      })

      // Fetch SSS Allocations
      .addCase(fetchSSSAllocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSSSAllocations.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.sssData.allocations = action.payload || [];
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchSSSAllocations.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload?.message || "Failed to fetch SSS allocations",
          status: action.payload?.status,
          data: action.payload?.data,
        };
      })

      // Fetch SSS Providers
      .addCase(fetchSSSProviders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSSSProviders.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.sssData.providers = action.payload || [];
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchSSSProviders.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload?.message || "Failed to fetch SSS providers",
          status: action.payload?.status,
          data: action.payload?.data,
        };
      })

      // Fetch SSS Customer Links
      .addCase(fetchSSSCustomerLinks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSSSCustomerLinks.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.sssData.customerLinks = action.payload || [];
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchSSSCustomerLinks.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload?.message || "Failed to fetch SSS customer links",
          status: action.payload?.status,
          data: action.payload?.data,
        };
      })

      // Upload SSS Data
      .addCase(uploadSSSData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadSSSData.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        // Refresh upload history after successful upload
      })
      .addCase(uploadSSSData.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload?.message || "Failed to upload SSS data",
          status: action.payload?.status,
          data: action.payload?.data,
        };
      })

      // Create operations
      .addCase(createSSSResource.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(createSSSFactor.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(createSSSAllocation.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(createSSSProvider.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(createSSSCustomerLink.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })

      // Update operations
      .addCase(updateSSSResource.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(updateSSSFactor.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(updateSSSAllocation.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(updateSSSProvider.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })

      // Delete operations
      .addCase(deleteSSSResource.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(deleteSSSFactor.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(deleteSSSAllocation.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(deleteSSSProvider.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(deleteSSSCustomerLink.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      });
  },
});

export const { clearErrors, clearSSSData, setSSSData } = sssSlice.actions;
export default sssSlice.reducer; 
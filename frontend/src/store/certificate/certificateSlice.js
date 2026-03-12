import { createSlice } from "@reduxjs/toolkit";
import {
  fetchCertificates,
  transferCertificates,
  cancelCertificates,
  splitCertificates,
  updateCertificateCarbonImpact,
  fetchCertificateSummary,
} from "./certificateThunk";

const certificateSlice = createSlice({
  name: "certificates",
  initialState: {
    certificates: [],
    loading: false,
    error: null,
    lastFetch: null,
    summary: null,
    summaryLoading: false,
    summaryError: null,
  },
  reducers: {
    clearErrors: (state) => {
      state.error = null;
    },
    clearCertificates: (state) => {
      state.certificates = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCertificates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCertificates.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.certificates = action.payload.granular_certificate_bundles || [];
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchCertificates.rejected, (state, action) => {
        state.loading = false;
        state.certificates = [];
        state.error = {
          message: action.payload?.message || "Failed to fetch certificates",
          status: action.payload?.status,
          data: action.payload?.data,
        };
      })

      // Transfer certificates
      .addCase(transferCertificates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(transferCertificates.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(transferCertificates.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload?.message || "Failed to transfer certificates",
          status: action.payload?.status,
          data: action.payload?.data,
        };
      })

      // Cancel certificates
      .addCase(cancelCertificates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelCertificates.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(cancelCertificates.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload?.message || "Failed to cancel certificates",
          status: action.payload?.status,
          data: action.payload?.data,
        };
      })

      // Split certificates
      .addCase(splitCertificates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(splitCertificates.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(splitCertificates.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload?.message || "Failed to split certificates",
          status: action.payload?.status,
          data: action.payload?.data,
        };
      })

      // Update certificate carbon impact
      .addCase(updateCertificateCarbonImpact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCertificateCarbonImpact.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(updateCertificateCarbonImpact.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload?.message || "Failed to update carbon impact",
          status: action.payload?.status,
          data: action.payload?.data,
        };
      })

      // Fetch certificate summary
      .addCase(fetchCertificateSummary.pending, (state) => {
        state.summaryLoading = true;
        state.summaryError = null;
      })
      .addCase(fetchCertificateSummary.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.summaryError = null;
        state.summary = action.payload;
      })
      .addCase(fetchCertificateSummary.rejected, (state, action) => {
        state.summaryLoading = false;
        state.summaryError = {
          message: action.payload?.message || "Failed to fetch certificate summary",
          status: action.payload?.status,
          data: action.payload?.data,
        };
      });
  },
});

export const { clearErrors, clearCertificates } = certificateSlice.actions;
export default certificateSlice.reducer;

import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchCertificatesAPI,
  transferCertificateAPI,
  cancelCertificateAPI,
  splitCertificateAPI,
  getCertificateDetailsAPI,
  updateCertificateCarbonImpactAPI,
  getCertificateSummaryAPI,
  tagCertificatesCarbonImpactAPI,
  tagAllUntaggedAPI,
} from "../../api/certificateAPI";

export const fetchCertificates = createAsyncThunk(
  "certificates/fetchCertificates",
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const response = await fetchCertificatesAPI(params);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const transferCertificates = createAsyncThunk(
  "certificates/transferCertificates",
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const response = await transferCertificateAPI(params);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const cancelCertificates = createAsyncThunk(
  "certificates/cancelCertificates",
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const response = await cancelCertificateAPI(params);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const splitCertificates = createAsyncThunk(
  "certificates/splitCertificates",
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const response = await splitCertificateAPI(params);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const getCertificateDetails = createAsyncThunk(
  "certificates/getDetails",
  async (certificateId, { rejectWithValue }) => {
    try {
      const response = await getCertificateDetailsAPI(certificateId);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to fetch certificate details"
      );
    }
  }
);

export const updateCertificateCarbonImpact = createAsyncThunk(
  "certificates/updateCertificateCarbonImpact",
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const { certificate_ids, mber_weight = 0.5 } = params;
      // Use new API to tag selected certificates via WattTime with MBER weight
      const response = await tagCertificatesCarbonImpactAPI(certificate_ids, mber_weight);
      return { 
        updated_count: response?.data?.length || 0,
      };
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const tagAllUntaggedCertificates = createAsyncThunk(
  "certificates/tagAllUntaggedCertificates",
  async (params, { rejectWithValue }) => {
    try {
      const response = await tagAllUntaggedAPI(params);
      return { updated_count: response?.data?.updated_count || 0 };
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

export const fetchCertificateSummary = createAsyncThunk(
  "certificates/fetchCertificateSummary",
  async (accountId, { dispatch, rejectWithValue }) => {
    try {
      const response = await getCertificateSummaryAPI(accountId);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

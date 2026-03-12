/**
 * API client for Net/SOC STAR engine endpoints
 * 
 * This is a parallel API client for the net/SOC STAR engine,
 * separate from the legacy storage API to avoid breaking existing functionality.
 */

import baseAPI from "./baseAPI";

/**
 * Trigger net engine Pass1 (net/SOC ingestion)
 * @param {object} params - { asset_id, file_path, timezone_name }
 * @returns {Promise} - Processing result with upload_id
 */
export const processNetPass1API = (params) => {
  return baseAPI.post("/storage/stars/net/pass1", null, { params });
};

/**
 * Trigger net engine Pass2 (SOC-guided allocation and STAR issuance)
 * @param {string} uploadId - Upload UUID
 * @returns {Promise} - Processing result with STARs created
 */
export const processNetPass2API = (uploadId) => {
  return baseAPI.post(`/storage/stars/net/pass2/${uploadId}`);
};

/**
 * Get net STARs
 * @param {object} params - Query parameters (asset_id, upload_id, etc.)
 * @returns {Promise} - List of net STARs
 */
export const getNetSTARsAPI = (params) => {
  return baseAPI.get("/storage/stars/net", { params });
};

/**
 * List net storage measurement reports (super admin - all)
 * @param {object} params - { page, page_size, device_id, status_filter }
 * @returns {Promise}
 */
export const getNetStorageMeasurementReportsAPI = (params = {}) => {
  return baseAPI.get("/storage-measurements/net/all", { params });
};

/**
 * List net storage measurement reports for current user (access-controlled)
 * @param {object} params - { page, page_size, device_id }
 * @returns {Promise}
 */
export const getNetStorageMeasurementReportsForUserAPI = (params = {}) => {
  return baseAPI.get("/storage-measurements/net/list", { params });
};

/**
 * Get pending net storage measurement reports (super admin only)
 * @param {object} params - { page, page_size, device_id }
 * @returns {Promise}
 */
export const getPendingNetStorageMeasurementReportsAPI = (params = {}) => {
  return baseAPI.get("/storage-measurements/net/pending", { params });
};

/**
 * Get net storage measurement report by ID
 * @param {number} reportId - Report ID (integer, not UUID)
 * @returns {Promise}
 */
export const getNetStorageMeasurementReportAPI = (reportId) => {
  return baseAPI.get(`/storage-measurements/net/reports/${reportId}`);
};

/**
 * Get net storage measurement report by upload ID
 * @param {string} uploadId - Upload UUID
 * @returns {Promise}
 */
export const getNetStorageMeasurementReportByUploadAPI = (uploadId) => {
  return baseAPI.get(`/storage-measurements/net/reports/upload/${uploadId}`);
};

/**
 * Get allocation diagnostics for a net storage measurement report
 * @param {number} reportId - Report ID
 * @returns {Promise}
 */
export const getNetAllocationDiagnosticsAPI = (reportId) => {
  return baseAPI.get(`/storage-measurements/net/reports/${reportId}/allocation-diagnostics`);
};

/**
 * Get net storage records
 * @param {object} params - Query parameters (upload_id, asset_id, etc.)
 * @returns {Promise} - List of net storage records
 */
export const getNetStorageRecordsAPI = (params) => {
  return baseAPI.get("/storage/net/storage-records", { params });
};

/**
 * Get net storage loss records (SLRs)
 * @param {object} params - Query parameters (upload_id, star_id, etc.)
 * @returns {Promise} - List of net SLRs
 */
export const getNetSLRsAPI = (params) => {
  return baseAPI.get("/storage/net/slrs", { params });
};

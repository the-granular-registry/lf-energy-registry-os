/**
 * API client for STAR (Storage Time Allocation Records) endpoints
 */

import baseAPI from "./baseAPI";

/**
 * Upload storage meter data CSV
 * @param {string} deviceId - Storage device UUID
 * @param {File} file - CSV file with meter data
 * @returns {Promise} - Upload response with upload_id
 */
export const uploadStorageMeterDataAPI = (deviceId, file) => {
  const formData = new FormData();
  formData.append("file", file);

  return baseAPI.post(`/storage/${deviceId}/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

/**
 * Trigger Pass 1 processing (hourly aggregation)
 * @param {string} uploadId - Upload UUID
 * @returns {Promise} - Processing result
 */
export const processPass1API = (uploadId) => {
  return baseAPI.post(`/storage/process-pass1/${uploadId}`);
};

/**
 * Trigger Pass 2 processing (FIFO allocation and STAR issuance)
 * @param {string} uploadId - Upload UUID
 * @returns {Promise} - Processing result with STARs created
 */
export const processPass2API = (uploadId) => {
  return baseAPI.post(`/storage/process-pass2/${uploadId}`);
};

/**
 * Get all STARs for the current user's accounts
 * @param {object} params - Query parameters (account_id, asset_id, etc.)
 * @returns {Promise} - List of STARs
 */
export const getSTARsAPI = (params) => {
  return baseAPI.get("/storage/stars", { params });
};

/**
 * Get all storage records (SCRs, SDRs, SLRs) in unified format
 * @param {object} params - Query parameters (asset_id, upload_id, etc.)
 * @returns {Promise} - List of storage records
 */
export const getStorageRecordsAPI = (params) => {
  return baseAPI.get("/storage/storage-records", { params });
};

/**
 * Get aggregated storage record summary (counts and totals)
 * @param {object} params - Query parameters (asset_id, upload_id, start_date, end_date)
 * @returns {Promise} - Summary payload with counts and energy totals
 */
export const getStorageRecordsSummaryAPI = (params) => {
  return baseAPI.get("/storage/storage-records/summary", { params });
};

/**
 * Get STAR details by ID
 * @param {string} starId - STAR UUID
 * @returns {Promise} - STAR details with lineage
 */
export const getSTARDetailsAPI = (starId) => {
  return baseAPI.get(`/storage/stars/${starId}`);
};

/**
 * Get SOC snapshots for an upload or asset
 * @param {object} params - Query parameters (upload_id, asset_id, start_date, end_date)
 * @returns {Promise} - List of SOC snapshots
 */
export const getSOCSnapshotsAPI = (params) => {
  return baseAPI.get("/storage/soc-snapshots", { params });
};

/**
 * Get STAR report with timeseries data
 * @param {string} assetId - Asset UUID
 * @param {object} params - Query parameters (start_date, end_date, upload_id)
 * @returns {Promise} - Report data with charts
 */
export const getSTARReportAPI = (assetId, params) => {
  return baseAPI.get(`/storage/reports/star/${assetId}`, { params });
};

/**
 * Get raw storage meter data (charge/discharge) timeseries
 * @param {object} params - { upload_id?, asset_id?, start_date?, end_date?, limit? }
 */
export const getStorageRawMeterAPI = (params) => {
  return baseAPI.get("/storage/raw-meter", { params });
};

/**
 * Match GC and STAR to create SD-GC
 * @param {string} gcId - Granular Certificate ID
 * @param {string} starId - STAR ID
 * @returns {Promise} - SD-GC creation result
 */
export const matchGCAndSTARAPI = (gcId, starId) => {
  return baseAPI.post("/storage/match-gc-star", {
    gc_id: gcId,
    star_id: starId,
  });
};

/**
 * Get Storage Loss Records (SLRs) for an upload or STAR
 * @param {object} params - Query parameters (upload_id, star_id, asset_id)
 * @returns {Promise} - List of SLRs
 */
export const getSLRsAPI = (params) => {
  return baseAPI.get("/storage/slrs", { params });
};


/**
 * List storage measurement reports (super admin only)
 * @param {object} params - { page, page_size, status_filter, device_id }
 * @returns {Promise}
 */
export const getStorageMeasurementReportsAPI = (params = {}) => {
  // Resolved via Nginx /api prefix; backend router has internal /api/v1 but root_path adds /api already
  return baseAPI.get("/storage-measurements/all", { params });
};

/**
 * List storage measurement reports for current user (access-controlled)
 * @param {object} params - { page, page_size, status_filter, device_id }
 * @returns {Promise}
 */
export const getStorageMeasurementReportsForUserAPI = (params = {}) => {
  return baseAPI.get("/storage-measurements/list", { params });
};

/**
 * Get upload details for a storage measurement report (super admin only)
 * @param {number} reportId - Storage measurement report ID
 * @returns {Promise}
 */
export const getStorageReportUploadDetailsAPI = (reportId) => {
  return baseAPI.get(`/storage-measurements/${reportId}/upload-details`);
};



/**
 * Get merged STAR+GC certificates
 * @param {object} params - { page, per_page, start_date, end_date, device_id }
 * @returns {Promise} - Paginated list of merged certificates
 */
export const getMergedCertificatesAPI = (params) => {
  return baseAPI.get("/v1/storage/merged-certificates", { params });
};

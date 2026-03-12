import baseAPI from "./baseAPI";

/**
 * Submit meter readings CSV file with S3 storage and async processing
 */
export const submitMeterReadingsAPI = (formData) => {
  return baseAPI.post("/measurements/submit_readings_enhanced", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 60000, // 60 second timeout for file uploads
  });
};

/**
 * Submit REC verification document with S3 storage
 */
export const submitRECVerificationAPI = (formData) => {
  return baseAPI.post("/measurements/submit_rec_verification", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 60000, // 60 second timeout for file uploads
  });
};

/**
 * Get upload status and processing results
 */
export const getUploadStatusAPI = (fileUploadId) => {
  return baseAPI.get(`/measurements/upload_status/${fileUploadId}`);
};

/**
 * Download meter readings CSV template
 */
export const downloadMeterReadingsTemplateAPI = () => {
  return baseAPI.get("/measurements/meter_readings_template", {
    responseType: "blob",
  });
};

/**
 * Get list of user's file uploads with pagination and filtering
 */
export const getUserUploadsAPI = (params = {}) => {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.fileType) queryParams.append('file_type', params.fileType);
  if (params.status) queryParams.append('status', params.status);
  if (params.deviceId) queryParams.append('device_id', params.deviceId);
  if (params.allAccounts !== undefined) queryParams.append('all_accounts', params.allAccounts);
  if (params.includeTimeseries !== undefined) queryParams.append('include_timeseries', params.includeTimeseries);
  
  const queryString = queryParams.toString();
  const url = queryString ? `/measurements/user_uploads?${queryString}` : '/measurements/user_uploads';
  
  return baseAPI.get(url);
};

/**
 * Retry failed upload processing
 */
export const retryUploadProcessingAPI = (fileUploadId) => {
  return baseAPI.post(`/measurements/retry_upload/${fileUploadId}`);
};

/**
 * Cancel upload processing (if still in queue)
 */
export const cancelUploadProcessingAPI = (fileUploadId) => {
  return baseAPI.delete(`/measurements/cancel_upload/${fileUploadId}`);
};

/**
 * Get upload statistics for the current user
 */
export const getUploadStatsAPI = () => {
  return baseAPI.get('/measurements/upload_stats');
};

/**
 * Download processed file results (if available)
 */
export const downloadProcessedResultsAPI = (fileUploadId) => {
  return baseAPI.get(`/measurements/download_results/${fileUploadId}`, {
    responseType: "blob",
  });
};

/**
 * Get REC verification status and details
 */
export const getRECVerificationStatusAPI = (recVerificationId) => {
  return baseAPI.get(`/measurements/rec_verification_status/${recVerificationId}`);
};

/**
 * Update REC verification (for admin users)
 */
export const updateRECVerificationAPI = (recVerificationId, updateData) => {
  return baseAPI.patch(`/measurements/rec_verification/${recVerificationId}`, updateData);
};

/**
 * Get list of pending REC verifications (for admin review)
 */
export const getPendingRECVerificationsAPI = (params = {}) => {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.status) queryParams.append('status', params.status);
  
  const queryString = queryParams.toString();
  const url = queryString ? `/measurements/pending_rec_verifications?${queryString}` : '/measurements/pending_rec_verifications';
  
  return baseAPI.get(url);
};

export const aiReprocessPreviewAPI = (formData) => {
  return baseAPI.post("/measurements/legacy/ai_reprocess_preview", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 120000, // allow Bedrock+Lambda orchestration
  });
};

// Optional: submit corrected by S3 key
export const submitReadingsFromS3API = (formData) => {
  return baseAPI.post("/measurements/submit_readings_from_s3", formData, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 60000,
  });
}; 
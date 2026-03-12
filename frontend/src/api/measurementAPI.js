import baseAPI from "./baseAPI";

export const createMeasurementReportAPI = (payload) => {
  return baseAPI.post("/measurements/create", payload);
};

export const getDeviceMeasurementsAPI = (deviceId, params = {}, options = {}) => {
  const searchParams = new URLSearchParams();
  
  // Add query parameters
  if (params.status) searchParams.append('status', params.status);
  if (params.page) searchParams.append('page', params.page);
  if (params.limit) searchParams.append('limit', params.limit);
  
  const queryString = searchParams.toString();
  const url = queryString 
    ? `/measurements/device/${deviceId}/list?${queryString}`
    : `/measurements/device/${deviceId}/list`;
  
  return baseAPI.get(url, options);
};

export const getMeasurementsForDevicesAPI = (deviceIds = [], params = {}, options = {}) => {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.append('status', params.status);
  if (params.page) searchParams.append('page', params.page);
  if (params.limit) searchParams.append('limit', params.limit);
  if (Array.isArray(deviceIds) && deviceIds.length) {
    searchParams.append('device_ids', deviceIds.join(','));
  }
  const queryString = searchParams.toString();
  const url = queryString ? `/measurements/list?${queryString}` : `/measurements/list`;
  return baseAPI.get(url, options);
};

export const getMeasurementDetailsAPI = (deviceId, measurementId, options = {}) => {
  return baseAPI.get(`/measurements/device/${deviceId}/${measurementId}/details`, options);
};

// Super Admin: Get certificate count for measurement report (for cascade delete preview)
export const getMeasurementReportCertificateCountAPI = (measurementReportId) => {
  return baseAPI.get(`/super-admin/deletion/measurement-reports/${measurementReportId}/certificate-count`);
};

// Super Admin: Soft delete a measurement report with optional cascade
export const softDeleteMeasurementReportAPI = (measurementReportId, deletionReason, cascadeToCertificates = true) => {
  const formData = new FormData();
  formData.append('deletion_reason', deletionReason);
  formData.append('cascade_to_certificates', cascadeToCertificates);
  
  return baseAPI.post(`/super-admin/deletion/measurement-reports/${measurementReportId}/soft-delete`, formData);
};

// Super Admin: Restore a soft-deleted measurement report with optional certificate restoration
export const restoreMeasurementReportAPI = (measurementReportId, restoreCertificates = true) => {
  const formData = new FormData();
  formData.append('restore_certificates', restoreCertificates);
  
  return baseAPI.post(`/super-admin/deletion/measurement-reports/${measurementReportId}/restore`, formData);
};

// Super Admin: List soft-deleted measurement reports
export const getDeletedMeasurementReportsAPI = (params = {}) => {
  const searchParams = new URLSearchParams();
  
  if (params.device_id) searchParams.append('device_id', params.device_id);
  if (params.limit) searchParams.append('limit', params.limit);
  if (params.offset) searchParams.append('offset', params.offset);
  
  const queryString = searchParams.toString();
  const url = queryString 
    ? `/super-admin/deletion/measurement-reports/deleted?${queryString}`
    : `/super-admin/deletion/measurement-reports/deleted`;
    
  return baseAPI.get(url);
};



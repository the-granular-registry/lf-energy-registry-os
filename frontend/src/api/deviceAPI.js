import baseAPI from "./baseAPI";

export const createDeviceAPI = (deviceData) => {
  return baseAPI.post("/devices/create", deviceData, {
    timeout: 30000 // 30 second timeout
  });
};

// Removed: super admin device creation API (redundant with standard endpoint)

export const updateDeviceAPI = (deviceId, deviceData) => {
  return baseAPI.patch(`/devices/update/${deviceId}`, deviceData, {
    timeout: 30000 // 30 second timeout
  });
};

export const deleteDeviceAPI = (deviceId) => {
  return baseAPI.delete(`/devices/delete/${deviceId}`);
};

export const submitMeterReadingsAPI = (formData) => {
  return baseAPI.post("/measurements/submit_readings", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const downloadMeterReadingsTemplateAPI = () => {
  return baseAPI.get("/measurements/meter_readings_template", {
    responseType: "blob",
  });
};

export const getAllAccessibleDevicesAPI = (includeAccountInfo = false, options = {}) => {
  const params = new URLSearchParams();
  if (includeAccountInfo) params.append('include_account_info', 'true');
  
  const url = params.toString() ? `/devices/accessible?${params}` : '/devices/accessible';
  return baseAPI.get(url, options);
};

export const getAccessibleDevicesSummaryAPI = () => {
  return baseAPI.get("/devices/accessible/summary");
};

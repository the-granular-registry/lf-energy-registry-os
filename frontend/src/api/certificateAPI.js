import baseAPI from "./baseAPI";

export const fetchCertificatesAPI = (params) => {
  // Add pagination parameters if not provided
  const queryParams = {
    ...params,
    limit: params.limit || 50, // Default to 50 certificates per page
    offset: params.offset || 0
  };
  return baseAPI.post("/certificates/query", queryParams);
};

export const createCertificateAPI = (certificateData) =>
  baseAPI.post("/certificates", certificateData);

export const transferCertificateAPI = (certificateData) =>
  baseAPI.post("/certificates/transfer", certificateData);

export const cancelCertificateAPI = (certificateData) =>
  baseAPI.post("/certificates/cancel", certificateData);

export const splitCertificateAPI = (splitData) =>
  baseAPI.post("/certificates/split", splitData);

export const getCertificateDetailsAPI = (certificateId) => {
  return baseAPI.get(`/certificates/${certificateId}`);
};

export const updateCertificateCarbonImpactAPI = (certificateId, updateData) => {
  return baseAPI.put(`/certificates/${certificateId}`, updateData);
};

export const getCertificateSummaryAPI = (accountId) => {
  return baseAPI.get(`/certificates/account/${accountId}/summary`);
};

export const tagCertificatesCarbonImpactAPI = (certificateIds, mberWeight = 0.5) => {
  return baseAPI.post(`/certificates/carbon-impact/tag`, { 
    certificate_ids: certificateIds,
    mber_weight: mberWeight 
  });
};

export const tagAllUntaggedAPI = (payload) => {
  // payload: { source_id, user_id, device_id?, certificate_period_start?, certificate_period_end?, mber_weight? }
  // Try new bulk path first; if 404, fall back to legacy path.
  return baseAPI
    .post(`/certificates/bulk/carbon-impact/tag-untagged`, payload)
    .catch((err) => {
      if (err?.status === 404 || err?.response?.status === 404) {
        return baseAPI.post(`/certificates/carbon-impact/tag-untagged`, payload);
      }
      throw err;
    });
};

import baseAPI from './baseAPI';

const apiAdmin = {
  async uploadCsvForReformat(formData) {
    return baseAPI.post('/admin/csv-reformat', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000, // 3 minutes for Bedrock + Lambda
    });
  },
};

export default apiAdmin;




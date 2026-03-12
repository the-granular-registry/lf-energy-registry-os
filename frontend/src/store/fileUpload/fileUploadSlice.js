import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  submitMeterReadingsAPI,
  submitRECVerificationAPI,
  getUploadStatusAPI,
  downloadMeterReadingsTemplateAPI,
  aiReprocessPreviewAPI,
  submitReadingsFromS3API,
} from '../../api/fileUploadAPI';

// Async thunks for file upload operations
export const uploadMeterReadings = createAsyncThunk(
  'fileUpload/uploadMeterReadings',
  async ({ file, deviceId, asyncProcessing = true, measurementReportSession, timestampTimezone = 'local', energyUnit = 'Wh' }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('deviceID', deviceId);
      formData.append('async_processing', asyncProcessing.toString());
      // Time handling flags
      const csvInLocal = timestampTimezone === 'local';
      formData.append('csv_in_local_time', String(csvInLocal));
      if (timestampTimezone && timestampTimezone !== 'local' && timestampTimezone !== 'utc') {
        // If a specific IANA TZ was provided, pass it through
        formData.append('csv_timezone', timestampTimezone);
      }
      // Energy unit selection: Wh, kWh, MWh
      if (energyUnit) {
        formData.append('energy_unit', energyUnit);
      }
      if (measurementReportSession) {
        formData.append('measurement_report_session', measurementReportSession);
      }

      const response = await submitMeterReadingsAPI(formData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to upload meter readings');
    }
  }
);

export const uploadRECVerification = createAsyncThunk(
  'fileUpload/uploadEACVerification',
  async ({ file, deviceId, verificationType, recQuantity, recStatus = 'active', rec_registry, eac_device_id, eac_meter_id, num_eacs, measurementReportSession }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('deviceID', deviceId);
      formData.append('verification_type', verificationType);
      formData.append('rec_quantity', recQuantity.toString());
      // Required REC status for backend enum parsing
      formData.append('rec_status', recStatus);
      if (rec_registry) formData.append('rec_registry', rec_registry);
      // Optional EAC metadata if provided
      if (eac_device_id) formData.append('eac_device_id', eac_device_id);
      if (eac_meter_id) formData.append('eac_meter_id', eac_meter_id);
      if (num_eacs !== undefined && num_eacs !== null) formData.append('num_eacs', String(num_eacs));
      if (measurementReportSession) {
        formData.append('measurement_report_session', measurementReportSession);
      }

      const response = await submitRECVerificationAPI(formData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to upload EAC verification');
    }
  }
);

export const checkUploadStatus = createAsyncThunk(
  'fileUpload/checkUploadStatus',
  async (fileUploadId, { rejectWithValue }) => {
    try {
      const response = await getUploadStatusAPI(fileUploadId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to check upload status');
    }
  }
);

export const downloadTemplate = createAsyncThunk(
  'fileUpload/downloadTemplate',
  async (_, { rejectWithValue }) => {
    try {
      const response = await downloadMeterReadingsTemplateAPI();
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'meter_readings_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return 'Template downloaded successfully';
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to download template');
    }
  }
);

// AI reprocess preview (Bedrock + Lambda)
export const aiReprocessMeterCSV = createAsyncThunk(
  'fileUpload/aiReprocessMeterCSV',
  async ({ deviceId, fileUploadId, file }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('deviceID', String(deviceId));
      if (fileUploadId) {
        formData.append('file_upload_id', String(fileUploadId));
      } else if (file) {
        formData.append('file', file);
      } else {
        throw new Error('Provide fileUploadId or file');
      }
      const response = await aiReprocessPreviewAPI(formData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'AI reprocess failed');
    }
  }
);

const initialState = {
  // Upload states
  meterReadingsUpload: {
    loading: false,
    success: false,
    error: null,
    uploadInfo: null,
  },
  recVerificationUpload: {
    loading: false,
    success: false,
    error: null,
    uploadInfo: null,
  },
  
  // Status tracking
  uploadStatuses: {}, // keyed by file_upload_id
  
  // Template download
  templateDownload: {
    loading: false,
    error: null,
  },
  
  // Active uploads being monitored
  activeUploads: [], // array of { fileUploadId, fileName, uploadType, status }
  
  // UI state
  showStatusModal: false,
  selectedUploadId: null,

  // AI reprocess
  aiReprocess: {
    loading: false,
    error: null,
    result: null,
  },
};

const fileUploadSlice = createSlice({
  name: 'fileUpload',
  initialState,
  reducers: {
    // Clear upload states
    clearMeterReadingsUpload: (state) => {
      state.meterReadingsUpload = initialState.meterReadingsUpload;
    },
    clearRECVerificationUpload: (state) => {
      state.recVerificationUpload = initialState.recVerificationUpload;
    },
    clearAllUploads: (state) => {
      state.meterReadingsUpload = initialState.meterReadingsUpload;
      state.recVerificationUpload = initialState.recVerificationUpload;
      state.uploadStatuses = {};
      state.activeUploads = [];
    },
    
    // Add upload to monitoring
    addActiveUpload: (state, action) => {
      const { fileUploadId, fileName, uploadType } = action.payload;
      const existingIndex = state.activeUploads.findIndex(
        upload => upload.fileUploadId === fileUploadId
      );
      
      if (existingIndex === -1) {
        state.activeUploads.push({
          fileUploadId,
          fileName,
          uploadType,
          status: 'uploaded',
          addedAt: new Date().toISOString(),
        });
      }
    },
    
    // Remove upload from monitoring
    removeActiveUpload: (state, action) => {
      const fileUploadId = action.payload;
      state.activeUploads = state.activeUploads.filter(
        upload => upload.fileUploadId !== fileUploadId
      );
    },
    
    // Update upload status in monitoring
    updateActiveUploadStatus: (state, action) => {
      const { fileUploadId, status, processingResult } = action.payload;
      const uploadIndex = state.activeUploads.findIndex(
        upload => upload.fileUploadId === fileUploadId
      );
      
      if (uploadIndex !== -1) {
        state.activeUploads[uploadIndex].status = status;
        if (processingResult) {
          state.activeUploads[uploadIndex].processingResult = processingResult;
        }
        state.activeUploads[uploadIndex].lastUpdated = new Date().toISOString();
      }
    },
    
    // UI state management
    showUploadStatusModal: (state, action) => {
      state.showStatusModal = true;
      state.selectedUploadId = action.payload || null;
    },
    hideUploadStatusModal: (state) => {
      state.showStatusModal = false;
      state.selectedUploadId = null;
    },
  },
  extraReducers: (builder) => {
    // Meter readings upload
    builder
      .addCase(uploadMeterReadings.pending, (state) => {
        state.meterReadingsUpload.loading = true;
        state.meterReadingsUpload.success = false;
        state.meterReadingsUpload.error = null;
      })
      .addCase(uploadMeterReadings.fulfilled, (state, action) => {
        state.meterReadingsUpload.loading = false;
        state.meterReadingsUpload.success = true;
        state.meterReadingsUpload.uploadInfo = action.payload;
      })
      .addCase(uploadMeterReadings.rejected, (state, action) => {
        state.meterReadingsUpload.loading = false;
        state.meterReadingsUpload.success = false;
        state.meterReadingsUpload.error = action.payload;
      });

    // REC verification upload
    builder
      .addCase(uploadRECVerification.pending, (state) => {
        state.recVerificationUpload.loading = true;
        state.recVerificationUpload.success = false;
        state.recVerificationUpload.error = null;
      })
      .addCase(uploadRECVerification.fulfilled, (state, action) => {
        state.recVerificationUpload.loading = false;
        state.recVerificationUpload.success = true;
        state.recVerificationUpload.uploadInfo = action.payload;
      })
      .addCase(uploadRECVerification.rejected, (state, action) => {
        state.recVerificationUpload.loading = false;
        state.recVerificationUpload.success = false;
        state.recVerificationUpload.error = action.payload;
      });

    // Upload status checking
    builder
      .addCase(checkUploadStatus.fulfilled, (state, action) => {
        const { file_upload_id, status, processing_result } = action.payload;
        state.uploadStatuses[file_upload_id] = action.payload;
        
        // Update active uploads if this one is being monitored
        const uploadIndex = state.activeUploads.findIndex(
          upload => upload.fileUploadId === file_upload_id
        );
        if (uploadIndex !== -1) {
          state.activeUploads[uploadIndex].status = status;
          if (processing_result) {
            state.activeUploads[uploadIndex].processingResult = processing_result;
          }
          state.activeUploads[uploadIndex].lastUpdated = new Date().toISOString();
        }
      });

    // Template download
    builder
      .addCase(downloadTemplate.pending, (state) => {
        state.templateDownload.loading = true;
        state.templateDownload.error = null;
      })
      .addCase(downloadTemplate.fulfilled, (state) => {
        state.templateDownload.loading = false;
      })
      .addCase(downloadTemplate.rejected, (state, action) => {
        state.templateDownload.loading = false;
        state.templateDownload.error = action.payload;
      });

    // AI reprocess preview
    builder
      .addCase(aiReprocessMeterCSV.pending, (state) => {
        state.aiReprocess.loading = true;
        state.aiReprocess.error = null;
        state.aiReprocess.result = null;
      })
      .addCase(aiReprocessMeterCSV.fulfilled, (state, action) => {
        state.aiReprocess.loading = false;
        state.aiReprocess.result = action.payload;
      })
      .addCase(aiReprocessMeterCSV.rejected, (state, action) => {
        state.aiReprocess.loading = false;
        state.aiReprocess.error = action.payload;
      });
  },
});

export const {
  clearMeterReadingsUpload,
  clearRECVerificationUpload,
  clearAllUploads,
  addActiveUpload,
  removeActiveUpload,
  updateActiveUploadStatus,
  showUploadStatusModal,
  hideUploadStatusModal,
} = fileUploadSlice.actions;

export default fileUploadSlice.reducer; 
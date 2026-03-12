import { createAsyncThunk } from "@reduxjs/toolkit";
import { createDeviceAPI, updateDeviceAPI, deleteDeviceAPI } from "../../api/deviceAPI";
import { logger } from "../../utils";

export const createDevice = createAsyncThunk(
  "device/createDevice",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createDeviceAPI(payload);
      return response?.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data || { detail: 'Create device failed' });
    }
  }
);

export const updateDevice = createAsyncThunk(
  "device/updateDevice",
  async ({ deviceId, deviceData }, { rejectWithValue }) => {
    try {
      logger.debug("updateDevice thunk called with:", { deviceId, deviceData });
      const response = await updateDeviceAPI(deviceId, deviceData);
      logger.debug("updateDevice API response:", response);
      return response?.data;
    } catch (error) {
      logger.error("updateDevice API error:", error);
      return rejectWithValue(error?.response?.data || { detail: 'Update device failed' });
    }
  }
);

export const deleteDevice = createAsyncThunk(
  "device/deleteDevice",
  async ({ deviceId }, { rejectWithValue }) => {
    try {
      logger.debug("deleteDevice thunk called with:", { deviceId });
      const response = await deleteDeviceAPI(deviceId);
      logger.debug("deleteDevice API response:", response);
      return response?.data;
    } catch (error) {
      logger.error("deleteDevice API error:", error);
      return rejectWithValue(error?.response?.data || { detail: 'Delete device failed' });
    }
  }
);

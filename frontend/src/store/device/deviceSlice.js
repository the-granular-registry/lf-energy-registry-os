import { createSlice } from "@reduxjs/toolkit";
import { createDevice, updateDevice, deleteDevice } from "./deviceThunk";

const deviceSlice = createSlice({
  name: "devices",
  initialState: {
    devices: [],
    loading: false,
    uploadingMeterData: false,
    error: null,
  },
  reducers: {
    setUploadingMeterData: (state, action) => {
      state.uploadingMeterData = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createDevice.pending, (state) => {
        state.loading = true;
      })
      .addCase(createDevice.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        // Do not mutate devices list here; lists are fetched fresh post-create
      })
      .addCase(createDevice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(updateDevice.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateDevice.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(updateDevice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(deleteDevice.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteDevice.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(deleteDevice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { setUploadingMeterData } = deviceSlice.actions;
export default deviceSlice.reducer;

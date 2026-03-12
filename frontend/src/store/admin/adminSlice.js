import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import adminAPI from '@api/adminAPI';

export const uploadCsvForReformat = createAsyncThunk(
  'admin/uploadCsvForReformat',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await adminAPI.uploadCsvForReformat(formData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || error.message || 'Failed to reformat CSV'
      );
    }
  }
);

const initialState = {
  loading: false,
  error: null,
  results: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearResults: (state) => {
      state.results = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadCsvForReformat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadCsvForReformat.fulfilled, (state, action) => {
        state.loading = false;
        state.results = action.payload;
      })
      .addCase(uploadCsvForReformat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearResults } = adminSlice.actions;
export default adminSlice.reducer;




import { createSlice } from '@reduxjs/toolkit';
import {
  createSubaccounts,
  fetchSubaccounts,
  claimSubaccount,
  fetchUserSubaccounts,
  generateMagicLink,
} from './subaccountThunk';

const initialState = {
  subaccounts: [],
  userSubaccounts: [],
  loading: false,
  creating: false,
  claiming: false,
  error: null,
  magicLink: null,
};

const subaccountSlice = createSlice({
  name: 'subaccount',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearMagicLink: (state) => {
      state.magicLink = null;
    },
  },
  extraReducers: (builder) => {
    // Create subaccounts
    builder.addCase(createSubaccounts.pending, (state) => {
      state.creating = true;
      state.error = null;
    });
    builder.addCase(createSubaccounts.fulfilled, (state, action) => {
      state.creating = false;
      // Add new subaccounts to the list
      if (action.payload?.subaccounts) {
        state.subaccounts = [...state.subaccounts, ...action.payload.subaccounts];
      }
    });
    builder.addCase(createSubaccounts.rejected, (state, action) => {
      state.creating = false;
      state.error = action.payload || 'Failed to create subaccounts';
    });

    // Fetch subaccounts
    builder.addCase(fetchSubaccounts.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchSubaccounts.fulfilled, (state, action) => {
      state.loading = false;
      state.subaccounts = action.payload || [];
    });
    builder.addCase(fetchSubaccounts.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to fetch subaccounts';
    });

    // Claim subaccount
    builder.addCase(claimSubaccount.pending, (state) => {
      state.claiming = true;
      state.error = null;
    });
    builder.addCase(claimSubaccount.fulfilled, (state, action) => {
      state.claiming = false;
      // Add claimed subaccount to user's subaccounts
      if (action.payload) {
        state.userSubaccounts = [...state.userSubaccounts, action.payload];
      }
    });
    builder.addCase(claimSubaccount.rejected, (state, action) => {
      state.claiming = false;
      state.error = action.payload || 'Failed to claim subaccount';
    });

    // Fetch user subaccounts
    builder.addCase(fetchUserSubaccounts.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchUserSubaccounts.fulfilled, (state, action) => {
      state.loading = false;
      state.userSubaccounts = action.payload || [];
    });
    builder.addCase(fetchUserSubaccounts.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to fetch user subaccounts';
    });

    // Generate magic link
    builder.addCase(generateMagicLink.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(generateMagicLink.fulfilled, (state, action) => {
      state.loading = false;
      state.magicLink = action.payload;
    });
    builder.addCase(generateMagicLink.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to generate magic link';
    });
  },
});

export const { clearError, clearMagicLink } = subaccountSlice.actions;

export default subaccountSlice.reducer;


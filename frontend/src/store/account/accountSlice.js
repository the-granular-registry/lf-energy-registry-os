import { createSlice } from "@reduxjs/toolkit";
import { 
  getAccountDetails, 
  listAllAccounts, 
  createAccount, 
  updateAccount, 
  deleteAccount 
} from "./accountThunk";

const accountSlice = createSlice({
  name: "account",
  initialState: {
    currentAccount: {
      id: null,
      account_name: "",
      devices: [],
      whiteListInverse: []
    },
    accounts: [], // List of all accounts for management
    devices: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearAccountState: (state) => {
      state.currentAccount = {
        id: null,
        account_name: "",
        devices: [],
      };
      state.error = null;
    },
    setAccountState: (state, action) => {
      state.currentAccount = action.payload
      state.devices = action.payload.devices
      state.error = null;
    },
    clearAccountsList: (state) => {
      state.accounts = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAccountDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAccountDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentAccount = {
          id: action.payload.detail.id,
          account_name: action.payload.detail.account_name,
          devices: action.payload.detail.devices,
          whiteListInverse: action.payload.detail.whiteListInverse
        };
        state.devices = action.payload.detail.devices
      })
      .addCase(getAccountDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.currentAccount = {
          id: null,
          account_name: "",
          devices: [],
          whiteListInverse: []
        };
      })
      .addCase(listAllAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(listAllAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = action.payload;
      })
      .addCase(listAllAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        state.loading = false;
        // Add new account to the list
        state.accounts.push(action.payload);
      })
      .addCase(createAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAccount.fulfilled, (state, action) => {
        state.loading = false;
        // Update account in the list
        const index = state.accounts.findIndex(acc => acc.id === action.payload.id);
        if (index !== -1) {
          state.accounts[index] = action.payload;
        }
        // Update current account if it's the one being updated
        if (state.currentAccount.id === action.payload.id) {
          state.currentAccount = {
            ...state.currentAccount,
            account_name: action.payload.account_name,
            // reflect type/description/transfer flag immediately
            account_type: action.payload.account_type,
            transfer_disabled: action.payload.transfer_disabled,
            description: action.payload.description,
          };
        }
      })
      .addCase(updateAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.loading = false;
        // Remove account from the list
        state.accounts = state.accounts.filter(acc => acc.id !== action.payload.accountId);
        // Clear current account if it's the one being deleted
        if (state.currentAccount.id === action.payload.accountId) {
          state.currentAccount = {
            id: null,
            account_name: "",
            devices: [],
            whiteListInverse: []
          };
        }
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearAccountState, setAccountState, clearAccountsList } = accountSlice.actions;
export default accountSlice.reducer;

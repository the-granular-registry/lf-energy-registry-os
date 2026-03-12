import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./auth/authSlice";
import certificateReducer from "./certificate/certificateSlice";
import accountReducer from "./account/accountSlice";
import userReducer from "./user/userSlice";
import errorReducer from "./error/errorSlice";
import deviceReducer from "./device/deviceSlice";
import sssReducer from "./sss/sssSlice";
import organizationReducer from "./organization/organizationSlice";
import approvalReducer from "./approval/approvalSlice";
import registrationReducer from "./registration/registrationSlice";
import fileUploadReducer from "./fileUpload/fileUploadSlice";
import superAdminReducer from "./superAdmin/superAdminSlice";
import subaccountReducer from "./subaccount/subaccountSlice";
import adminReducer from "./admin/adminSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer, // Auth state
    certificates: certificateReducer, // Certificate state
    account: accountReducer, // Account state
    user: userReducer, // User state
    error: errorReducer, // Error state
    devices: deviceReducer, // Device state
    sss: sssReducer, // SSS state
    organization: organizationReducer, // Organization state
    approval: approvalReducer, // Approval state
    registration: registrationReducer, // Registration state
    fileUpload: fileUploadReducer, // File upload state
    superAdmin: superAdminReducer, // Super Admin state
    subaccount: subaccountReducer, // Subaccount state
    admin: adminReducer, // Admin CSV reformat state
  },
});

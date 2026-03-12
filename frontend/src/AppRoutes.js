import React, { useEffect, useRef } from "react";
import Cookies from "js-cookie";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { message } from "antd";
import { useDispatch } from "react-redux";
import { readCurrentUser } from "@store/user/userThunk";
import { useUser } from "@context/UserContext";
import { logger } from "./utils";

// Import pages
const Login = React.lazy(() => import("@pages/Login/index"));
const RegistrationPage = React.lazy(() => import("@pages/RegistrationPage"));
const SubaccountClaimPage = React.lazy(() => import("@pages/SubaccountClaimPage"));
const Main = React.lazy(() => import("@pages/Main/index"));
const HomeTest = React.lazy(() => import("@pages/HomeTest/index"));
const Certificate = React.lazy(() => import("@components/certificate/index"));
const Device = React.lazy(() => import("@components/device/index"));
// Deprecated: route now points to unified AccountManagement page
const AccountManagement = React.lazy(() => import("@pages/AccountManagement/index"));
// Deprecated: route now points to unified UserManagement page
const UserManagement = React.lazy(() => import("@pages/UserManagement/index"));
const OrganizationManagement = React.lazy(() => import("@pages/OrganizationManagement/index"));
const Settings = React.lazy(() => import("@pages/Settings/index"));
const SSS = React.lazy(() => import("@pages/SSS/SSSPage"));
const SSSUtilityOnboarding = React.lazy(() => import("@pages/SSS/SSSUtilityOnboarding"));

// Super Admin components
const SuperAdminDashboard = React.lazy(() => import("@components/SuperAdmin/SuperAdminDashboard"));
const OIDCClientsPage = React.lazy(() => import("@pages/SuperAdmin/OIDCClientsPage"));
// Deprecated: route now points to unified UserManagement page
const SuperAdminUserManagement = React.lazy(() => import("@pages/UserManagement/index"));
// Deprecated: route now points to unified AccountManagement page
const SuperAdminAccountManagement = React.lazy(() => import("@pages/AccountManagement/index"));
// Deprecated: route now points to unified OrganizationManagement page
const SuperAdminOrganizationManagement = React.lazy(() => import("@pages/OrganizationManagement/index"));
// const DeviceManagement = React.lazy(() => import("@components/SuperAdmin/DeviceManagement"));
const ApprovalDashboard = React.lazy(() => import("@components/SuperAdmin/ApprovalDashboard"));
const CsvReformatTool = React.lazy(() => import("@pages/SuperAdmin/CsvReformatTool/index"));
// Removed measurements page

// Add these
const SSSOnboardingCreateAccount = React.lazy(() => import("@pages/SSS/SSSOnboardingCreateAccount"));
const SSSOnboardingAdminVerification = React.lazy(() => import("@pages/SSS/SSSOnboardingAdminVerification"));
const SSSFactorManagement = React.lazy(() => import("@pages/SSS/components/SSSFactorManagement"));
const SSSResourceManagement = React.lazy(() => import("@pages/SSS/components/SSSResourceManagement"));
const SSSAllocationManagement = React.lazy(() => import("@pages/SSS/components/SSSAllocationManagement"));
const SSSDataUpload = React.lazy(() => import("@pages/SSS/components/SSSDataUpload"));
const SSSEndUserOnboarding = React.lazy(() => import("@pages/SSS/SSSEndUserOnboarding"));
const SSSBaselineMix = React.lazy(() => import("@pages/SSS/components/SSSBaselineMix"));
const SSSCustomerLinks = React.lazy(() => import("@pages/SSS/components/SSSCustomerLinks"));
const Reporting = React.lazy(() => import("@components/reporting/index"));
const Management = React.lazy(() => import("@components/management/index"));
const HourlyMatching = React.lazy(() => import("@components/reporting/HourlyMatching"));
const TimestampReport = React.lazy(() => import("@components/reporting/TimestampReport"));
const InventoryReport = React.lazy(() => import("@components/reporting/InventoryReport"));
const CarbonImpactReport = React.lazy(() => import("@components/reporting/CarbonImpactReport"));
const CFEProgressReport = React.lazy(() => import("@components/reporting/CFEProgressReport"));
const AuditTrailReport = React.lazy(() => import("@components/reporting/AuditTrailReport"));
const ComplianceSummaryReport = React.lazy(() => import("@components/reporting/ComplianceSummaryReport"));
const CertificateHistoryReport = React.lazy(() => import("@components/reporting/TransferHistoryReport"));
const SSSAllocationsReport = React.lazy(() => import("@components/reporting/SSSAllocationsReport"));
const CarbonImpact = React.lazy(() => import("@components/carbon-impact/index"));
const MeasurementReportsPage = React.lazy(() => import("@pages/MeasurementReportsPage"));

// STAR Module pages
const STARCertificatesPage = React.lazy(() => import("@pages/STARCertificatesPage"));
const STARReportPage = React.lazy(() => import("@pages/STARReportPage"));
const StorageMeasurementsReportPage = React.lazy(() => import("@pages/StorageMeasurementsReportPage"));
const NetStorageMeasurementsReportPage = React.lazy(() => import("@pages/NetStorageMeasurementsReportPage"));
const StorageRecordsPage = React.lazy(() => import("@pages/StorageRecordsPage"));
const MergedCertificatesPage = React.lazy(() => import("@pages/MergedCertificatesPage"));

// const Transfer = React.lazy(() => import("./components/Transfer"));

// Super Admin - Data Sources
const DataSourcesIndex = React.lazy(() => import("@pages/SuperAdmin/DataSources/index"));
const WattTimePage = React.lazy(() => import("@pages/SuperAdmin/DataSources/WattTimePage"));
const MBERPage = React.lazy(() => import("@pages/SuperAdmin/DataSources/MBERPage"));
const EIAPage = React.lazy(() => import("@pages/SuperAdmin/DataSources/EIAPage"));

const isAuthenticated = () => {
  const token = Cookies.get("access_token");
  logger.debug("Checking authentication - token exists:", !!token);
  return !!token;
};

// Public routes that should not trigger credential validation
const PUBLIC_PATHS = ["/login", "/register", "/create-account", "/home", "/claim"];

const isPublicPath = (path) => {
  return PUBLIC_PATHS.some((publicPath) => path === publicPath || path.startsWith(`${publicPath}/`));
};

const PrivateRoute = ({ element: Element, ...rest }) => {
  const location = useLocation();
  const isAuth = isAuthenticated();
  logger.debug("PrivateRoute - isAuthenticated:", isAuth);
  if (isAuth) return <Element {...rest} />;
  // If user tries to access root "/" while unauthenticated, send to landing instead of login
  if (location.pathname === "/") return <Navigate to="/login" />;
  return <Navigate to="/login" />;
};

// Component to handle conditional default route based on user role
const DefaultRoute = () => {
  const { userData } = useUser();
  
  // Check if user is Super Admin
  const isSuperAdmin = userData?.userInfo?.role === "SUPER_ADMIN" || 
                      userData?.userInfo?.role === 5;
  
  // Redirect based on role
  return <Navigate to={isSuperAdmin ? "/super-admin" : "/certificates"} replace />;
};

const AppRoutes = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, saveUserData } = useUser();
  const validationInProgress = useRef(false);
  const lastValidationTime = useRef(0);

  // Use refs to access latest values without triggering effect re-runs.
  // This breaks the circular dependency: effect → saveUserData → userData change → effect
  const userDataRef = useRef(userData);
  const saveUserDataRef = useRef(saveUserData);
  useEffect(() => { userDataRef.current = userData; }, [userData]);
  useEffect(() => { saveUserDataRef.current = saveUserData; }, [saveUserData]);

  useEffect(() => {
    const validateCredentials = async () => {
      const now = Date.now();
      const timeSinceLastValidation = now - lastValidationTime.current;
      const recentValidation = timeSinceLastValidation < 30000; // 30 seconds

      if (validationInProgress.current) {
        return;
      }

      if (recentValidation && userDataRef.current) {
        logger.debug("Skipping validation - recent validation exists and user data available");
        return;
      }

      validationInProgress.current = true;

      try {
        logger.debug("Validating credentials for path:", location.pathname);
        const freshUserData = await dispatch(readCurrentUser()).unwrap();
        logger.debug("User data received");
        saveUserDataRef.current(freshUserData);
        lastValidationTime.current = now;
      } catch (err) {
        logger.error("Failed to validate credentials:", err);
        
        // Check if this is an auth error requiring redirect
        if (err?.isAuthError) {
          // This is an authentication error (expired token, etc)
          message.warning(err?.message || "Your session has expired. Please log in again.", 3);
          navigate("/login");
          return;
        }
        
        // For Super Admin users, be more lenient with validation errors
        const currentUserData = userDataRef.current;
        const isSuperAdmin = currentUserData?.userInfo?.role === "SUPER_ADMIN" || currentUserData?.userInfo?.role === 5;
        
        // For other errors, show error message but don't automatically redirect
        // unless server explicitly returns 401 Unauthorized
        if (err?.status === 401) {
          message.error(err?.message || "Authentication failed", 3);
          navigate("/login");
        } else if (err?.status === 500) {
          // For server errors, log but don't show user-facing error messages
          // and don't redirect - let the app continue with cached data
          logger.warn("Server error during validation, continuing with cached data:", err.message);
        } else {
          // For other errors, show error but try to continue
          // Be more lenient for Super Admin users
          if (!isSuperAdmin) {
            message.error(err?.message || "Failed to load user data. Please try again later.", 3);
          } else {
            logger.warn("Validation error for Super Admin, continuing with cached data:", err.message);
          }
        }
      } finally {
        validationInProgress.current = false;
      }
    };

    if (!isPublicPath(location.pathname)) {
      validateCredentials();
    }
  }, [dispatch, location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/landing" element={<Navigate to="/login" replace />} />
              <Route path="/home" element={<HomeTest />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<RegistrationPage />} />
      <Route path="/create-account" element={<RegistrationPage />} />
      <Route path="/claim" element={<SubaccountClaimPage />} />
      <Route path="/" element={<PrivateRoute element={Main} />}>
        <Route index element={<DefaultRoute />} />
        <Route path="/certificates" element={<Certificate />} />
        <Route path="/storage/stars" element={<STARCertificatesPage />} />
        <Route path="/storage/records" element={<StorageRecordsPage />} />
        <Route path="/storage/merged-certificates" element={<MergedCertificatesPage />} />
        <Route path="/reporting/merged-star" element={<MergedCertificatesPage />} />
        <Route path="/reporting/star" element={<STARReportPage />} />
        <Route path="/reporting/storage-measurements" element={<StorageMeasurementsReportPage />} />
        <Route path="/reporting/storage-measurements-net" element={<NetStorageMeasurementsReportPage />} />
        <Route path="/measurement-reports" element={<MeasurementReportsPage />} />
        <Route path="/carbon-impact" element={<CarbonImpact />} />
        <Route path="/devices" element={<Device />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/account-management" element={<AccountManagement />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/organization-management" element={<OrganizationManagement />} />
        <Route path="/management" element={<Management />} />
        <Route path="/reporting" element={<Reporting />} />
        <Route path="/reporting/hourly-matching" element={<HourlyMatching />} />
        <Route path="/reporting/timestamp" element={<TimestampReport />} />
        <Route path="/reporting/inventory" element={<InventoryReport />} />
        <Route path="/reporting/carbon-impact" element={<CarbonImpactReport />} />
        <Route path="/reporting/cfe-progress" element={<CFEProgressReport />} />
        <Route path="/reporting/audit-trail" element={<AuditTrailReport />} />
        <Route path="/reporting/compliance-summary" element={<ComplianceSummaryReport />} />
        <Route path="/reporting/transfer-history" element={<CertificateHistoryReport />} />
        <Route path="/reporting/certificate-history" element={<CertificateHistoryReport />} />
        <Route path="/reporting/sss-allocations" element={<SSSAllocationsReport />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/sss" element={<SSS />} />
        <Route path="/sss/utility-onboarding" element={<SSSUtilityOnboarding />} />
        <Route path="/sss/onboarding/create-account" element={<SSSOnboardingCreateAccount />} />
        <Route path="/sss/onboarding/admin-verification" element={<SSSOnboardingAdminVerification />} />
        <Route path="/sss/onboarding/upload-factors" element={<SSSFactorManagement />} />
        <Route path="/sss/onboarding/manage-resources" element={<SSSResourceManagement />} />
        <Route path="/sss/onboarding/allocate-customers" element={<SSSAllocationManagement />} />
        <Route path="/sss/onboarding/upload-additional" element={<SSSDataUpload />} />

        // Add end user routes
        <Route path="/sss/enduser-onboarding" element={<SSSEndUserOnboarding />} />
        <Route path="/sss/enduser/baseline-mix" element={<SSSBaselineMix />} />
        <Route path="/sss/enduser/customer-links" element={<SSSCustomerLinks />} />

        {/* Super Admin routes */}
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/oidc-clients" element={<OIDCClientsPage />} />
        <Route path="/super-admin/data-sources" element={<DataSourcesIndex />} />
        <Route path="/super-admin/data-sources/watttime" element={<WattTimePage />} />
        <Route path="/super-admin/data-sources/mber" element={<MBERPage />} />
        <Route path="/super-admin/data-sources/eia" element={<EIAPage />} />
        <Route path="/super-admin/certificates" element={<Certificate />} />
        <Route path="/super-admin/users" element={<SuperAdminUserManagement />} />
        {/* Removed: super admin accounts page now unified under /account-management */}
        <Route path="/super-admin/organizations" element={<SuperAdminOrganizationManagement />} />
        <Route path="/super-admin/devices" element={<Device />} />
        <Route path="/super-admin/approvals" element={<ApprovalDashboard />} />
        <Route path="/super-admin/csv-tool" element={<CsvReformatTool />} />
        {/* Removed: super admin measurements page */}

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/certificates" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;

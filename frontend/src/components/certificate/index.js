import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import Cookies from "js-cookie";

import { Button, message, Select, DatePicker, Row, Col, Typography, Tag } from "antd";

import {
  SwapOutlined,
  CloseOutlined,
  DownloadOutlined,
  LaptopOutlined,
  ClockCircleOutlined,
  ScissorOutlined,
  CheckSquareOutlined,
  RollbackOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

import "../../assets/styles/pagination.css";
import "../../assets/styles/filter.css";

import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAccount } from "../../context/AccountContext";
import { useUser } from "../../context/UserContext";
import {
  fetchCertificates,
  getCertificateDetails,
  fetchCertificateSummary,
} from "../../store/certificate/certificateThunk";

import CertificateActionDialog from "./CertificateActionDialog";
import CertificateDetailDialog from "./CertificateDetailDialog";
import CertificateSplitDialog from "./CertificateSplitDialog";
import Summary from "./Summary";
import { getAllAccountsAPI } from "../../api/superAdminAPI";
import { getAllAccessibleDevicesAPI } from "../../api/deviceAPI";
import { listAllAccountsAPI } from "../../api/accountAPI";

import StatusTag from "../common/StatusTag";

import FilterTable from "../common/FilterTable";

import { CERTIFICATE_STATUS } from "../../enum";

import { isEmpty, logger } from "../../utils";

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title } = Typography;

const Certificate = () => {
  dayjs.extend(utc);
  dayjs.extend(timezone);
  const { currentAccount } = useAccount();
  const { userData } = useUser();

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { certificates, summary, summaryLoading } = useSelector((state) => state.certificates);
  const [aggregatedCertificates, setAggregatedCertificates] = useState([]);
  const [allCertificatesForSummary, setAllCertificatesForSummary] = useState([]);
  
  // Ensure certificates is always an array
  const safeCertificates = certificates || [];
  const [isFetching, setIsFetching] = useState(true);
  const [accountOptions, setAccountOptions] = useState([]);
  const [availableDevices, setAvailableDevices] = useState([]);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCertificateData, setSelectedCertificateData] = useState(null);

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [dialogAction, setDialogAction] = useState(null);
  const [totalProduction, setTotalProduction] = useState(null);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [tableSorter, setTableSorter] = useState({ field: "eac_id", order: "ascend" });

  const dialogRef = useRef();
  const splitDialogRef = useRef();
  const fetchInProgressRef = useRef(false);

  // Use userData from context, fallback to cookies if needed
  const userInfo = userData?.userInfo || (() => {
    try {
      const cookieData = Cookies.get("user_data");
      return cookieData ? JSON.parse(cookieData).userInfo : null;
    } catch (error) {
      console.error("Error parsing user data from cookies:", error);
      return null;
    }
  })();

  const deviceOptions = useMemo(() => {
    // Use availableDevices if populated (from filtered accounts), otherwise use currentAccount devices
    const devicesToUse = availableDevices.length > 0 
      ? availableDevices 
      : [
          ...(currentAccount?.detail?.devices || []),
          ...(currentAccount?.detail?.certificateDevices || []),
        ];

    const uniqueDevices = Array.from(
      new Map(devicesToUse.map((device) => [device.id, device])).values()
    );

    return uniqueDevices.map((device) => ({
      value: device.id,
      label: device.device_name || `Device ${device.id}`,
    }));
  }, [
    availableDevices,
    currentAccount?.detail?.devices,
    currentAccount?.detail?.certificateDevices,
  ]);

  // get max bundle period start from the certificates
  const maxBundlePeriodStart = useMemo(() => {
    if (safeCertificates.length === 0) {
      return dayjs(); // Use current date if no certificates
    }
    return safeCertificates.reduce((max, certificate) => {
      const certificatePeriodStart = dayjs(
        certificate.production_starting_interval
      );
      return certificatePeriodStart.isAfter(max) ? certificatePeriodStart : max;
    }, dayjs().subtract(1, "year")); // Default to 1 year ago if no certificates
  }, [safeCertificates]);

  // Calculate the start date to be 30 days before the max period start
  const one_month_ago = maxBundlePeriodStart.subtract(30, "days");

  const defaultFilters = {
    account_id: null,
    device_id: null,
    // Keep filters cleared by default; don't pre-filter to Active.
    certificate_bundle_status: null,
    certificate_period_start: null,
    certificate_period_end: null,
  };

  const [filters, setFilters] = useState(defaultFilters);

  useEffect(() => {
    if (!dialogAction) return;

    dialogRef.current.openDialog(); // Open the dialog from the parent component
  }, [dialogAction]);

  // Determine roles
  const role = userData?.userInfo?.role;
  const isAdmin = role === "ADMIN" || role === 4;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === 5;

  // Load account options for Account filter
  useEffect(() => {
    // Wait until role is resolved to avoid firing the wrong API path on mount.
    if (!role) return;

    const loadAccounts = async () => {
      try {
        if (isSuperAdmin) {
          // Super admin: use super admin endpoint
          const res = await getAllAccountsAPI();
          const list = (res?.data?.accounts || res?.data || []).map((a) => ({
            value: a.id,
            label: a.account_name || `Account ${a.id}`,
          }));
          setAccountOptions(list);
          logger.debug(`Loaded ${list.length} accounts for super admin`);
        } else {
          // Regular users: use standard account list endpoint
          try {
            const res = await listAllAccountsAPI();
            const accounts = res?.data?.accounts || res?.data || [];
            const list = accounts.map((a) => ({
              value: a.id,
              label: a.account_name || `Account ${a.id}`,
            }));
            setAccountOptions(list);
            logger.debug(`Loaded ${list.length} accounts from API`);
          } catch (apiError) {
            // Fallback to userData accounts if API fails
            logger.warn("Failed to load accounts from API, using userData fallback", apiError);
            const list = (userData?.accounts || []).map((a) => ({
              value: a.id,
              label: a.account_name || `Account ${a.id}`,
            }));
            setAccountOptions(list);
            if (apiError?.response?.status >= 400) {
              message.warning("Failed to load accounts. Using cached account list.");
            }
          }
        }
      } catch (error) {
        logger.error("Failed to load accounts:", error);
        // Final fallback to userData
        const list = (userData?.accounts || []).map((a) => ({
          value: a.id,
          label: a.account_name || `Account ${a.id}`,
        }));
        setAccountOptions(list);
        if (error?.response?.status >= 400) {
          message.error("Failed to load accounts. Please refresh the page.");
        }
      }
    };
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, userData?.accounts?.length]);

  // Fetch devices using the supported accessible devices API
  useEffect(() => {
    const fetchDevicesForAccounts = async () => {
      try {
        // Use the supported endpoint: GET /devices/accessible?include_account_info=true
        const response = await getAllAccessibleDevicesAPI(true);
        const allDevices = response?.data?.devices || [];
        
        logger.debug(`Loaded ${allDevices.length} accessible devices from API`);
        
        // If account filter is selected, filter devices for that account
        if (filters.account_id) {
          const filteredDevices = allDevices.filter(
            (device) => device.account_id === filters.account_id
          );
          setAvailableDevices(filteredDevices);
          logger.debug(`Filtered to ${filteredDevices.length} devices for account ${filters.account_id}`);
        } else {
          // Show all accessible devices
          setAvailableDevices(allDevices);
        }
      } catch (error) {
        logger.error("Failed to fetch accessible devices:", error);
        if (error?.response?.status === 404) {
          message.error("Device endpoint not found. Please contact support.");
        } else if (error?.response?.status >= 400) {
          message.warning("Failed to load devices. Device filter may be unavailable.");
        }
        setAvailableDevices([]);
      }
    };

    fetchDevicesForAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.account_id]);

  // Track filter changes with individual dependencies to avoid JSON.stringify issues.
  // Gate on `role` so we don't fire a wasted fetch before user data is loaded.
  useEffect(() => {
    if (!role) return;
    fetchCertificatesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentAccount?.detail?.id, 
    role, 
    filters.account_id,
    filters.device_id,
    filters.certificate_bundle_status,
    filters.certificate_period_start,
    filters.certificate_period_end,
  ]);

  useEffect(() => {
    // Filter out undefined/null records before processing
    const validRecords = selectedRecords.filter(record => record != null);
    
    const totalProduction = validRecords.reduce(
      (sum, record) => sum + (record.energy_precision_wh || record.bundle_quantity || 0),
      0
    );
    const devices = validRecords.reduce((acc, newDevice) => {
      const isDuplicate = acc.some((device) => device === newDevice.device_id);
      return isDuplicate ? acc : [...acc, newDevice.device_id];
    }, []);
    setTotalProduction(totalProduction);
    setSelectedDevices(devices);
  }, [selectedRecords]);

  const fetchCertificatesData = async () => {
    if (!userInfo?.userID) {
      logger.warn("Cannot fetch certificates: user ID not available");
      setIsFetching(false);
      return;
    }

    // Prevent concurrent duplicate fetches
    if (fetchInProgressRef.current) {
      logger.debug("Certificate fetch already in progress, skipping duplicate request");
      return;
    }

    fetchInProgressRef.current = true;
    setIsFetching(true);
    try {
      // Build list of account IDs the user can access
      let accountIds = [];
      
      if (filters.account_id) {
        // Account filter selected (includes both regular and subaccount-linked accounts)
        accountIds = [filters.account_id];
        logger.info(`Fetching certificates for selected account: ${filters.account_id}`);
      } else {
        // No filter - load all accessible accounts
        if (isSuperAdmin) {
          // Load all accounts from admin API
          try {
            const res = await getAllAccountsAPI();
            accountIds = (res?.data?.accounts || res?.data || []).map((a) => a.id);
          } catch (e) {
            logger.error("Failed to load accounts for super admin:", e);
            // Fallback to user-linked accounts if available
            accountIds = (userData?.accounts || []).map((a) => a.id);
          }
        } else if (isAdmin || (userData?.accounts && userData.accounts.length > 0)) {
          accountIds = userData.accounts.map((a) => a.id);
        } else if (currentAccount?.detail?.id) {
          accountIds = [currentAccount.detail.id];
        }
        logger.info(`Fetching certificates for ${accountIds.length} accessible accounts: ${accountIds.join(', ')}`);
      }

      if (!accountIds || accountIds.length === 0) {
        logger.warn("No account IDs available for certificate fetch");
        setAggregatedCertificates([]);
        setAllCertificatesForSummary([]);
        return;
      }

      // Fetch summary data using backend API for each account
      const summaryPromises = accountIds.map(accountId => 
        dispatch(fetchCertificateSummary(accountId)).unwrap().catch(err => {
          logger.error(`Failed to fetch summary for account ${accountId}:`, err);
          return null;
        })
      );
      
      const summaryResults = await Promise.all(summaryPromises);
      const validSummaries = summaryResults.filter(s => s !== null);
      
      // Aggregate summary data
      const aggregatedSummary = validSummaries.reduce((acc, summary) => ({
        total_certificates: (acc.total_certificates || 0) + (summary.total_certificates || 0),
        active_certificates: (acc.active_certificates || 0) + (summary.active_certificates || 0),
        reserved_certificates: (acc.reserved_certificates || 0) + (summary.reserved_certificates || 0),
        cancelled_certificates: (acc.cancelled_certificates || 0) + (summary.cancelled_certificates || 0)
      }), {});
      
      // Fetch ALL certificates (with filters) to calculate total energy
      // This is separate from table data which is paginated
      const energyFetchPromises = accountIds.map(async (accountId) => {
        const body = {
          user_id: userInfo.userID,
          source_id: accountId,
          device_id: filters.device_id,
          certificate_bundle_status:
            filters.certificate_bundle_status ? CERTIFICATE_STATUS[filters.certificate_bundle_status] : null,
          certificate_period_start:
            filters.certificate_period_start?.format("YYYY-MM-DD") || null,
          certificate_period_end:
            filters.certificate_period_end?.format("YYYY-MM-DD") || null,
          limit: 1000,
          offset: 0,
        };
        
        logger.debug(`POST /certificates/query for energy calc - account_id (source_id): ${accountId}, filters:`, {
          device_id: body.device_id,
          status: body.certificate_bundle_status,
          period_start: body.certificate_period_start,
          period_end: body.certificate_period_end,
        });
        
        try {
          // First batch
          const firstBatch = await dispatch(fetchCertificates(body)).unwrap();
          const certificates = firstBatch?.granular_certificate_bundles || [];
          const totalCount = firstBatch?.total_count || certificates.length;
          
          // If more certificates exist, fetch remaining batches
          if (totalCount > 1000) {
            const remainingBatches = [];
            for (let offset = 1000; offset < totalCount; offset += 1000) {
              remainingBatches.push(
                dispatch(fetchCertificates({ ...body, offset }))
                  .unwrap()
                  .then((res) => res?.granular_certificate_bundles || [])
                  .catch(() => [])
              );
            }
            const additionalCerts = await Promise.all(remainingBatches);
            return [...certificates, ...additionalCerts.flat()];
          }
          
          return certificates;
        } catch (err) {
          logger.error(`Failed to fetch certificates for energy calc from account ${accountId}:`, err);
          return [];
        }
      });
      
      const allCertsForEnergy = await Promise.all(energyFetchPromises);
      const flattenedCerts = allCertsForEnergy.flat();
      
      // Calculate total energy from all fetched certificates
      const totalEnergyMWh = flattenedCerts.reduce((sum, cert) => {
        const energyWh = Number(cert.energy_precision_wh || cert.bundle_quantity || 0);
        return sum + (energyWh / 1e6);
      }, 0);
      
      // Add energy to aggregated summary
      aggregatedSummary.total_energy_mwh = totalEnergyMWh;
      
      // Store aggregated summary for hero cards
      setAllCertificatesForSummary([aggregatedSummary]);

      // Build requests per account FOR TABLE (with filters, paginated)
      const requests = accountIds.map((accountId) => {
        const body = {
          user_id: userInfo.userID,
          source_id: accountId,
          device_id: filters.device_id,
          certificate_bundle_status:
            filters.certificate_bundle_status ? CERTIFICATE_STATUS[filters.certificate_bundle_status] : null,
          certificate_period_start:
            filters.certificate_period_start?.format("YYYY-MM-DD") || null,
          certificate_period_end:
            filters.certificate_period_end?.format("YYYY-MM-DD") || null,
          limit: 100, // Keep table paginated for performance
          offset: 0,
          sort_by: tableSorter.field,
          sort_order: tableSorter.order,
        };
        
        logger.debug(`POST /certificates/query for table - account_id (source_id): ${accountId}, filters:`, {
          device_id: body.device_id,
          status: body.certificate_bundle_status,
          period_start: body.certificate_period_start,
          period_end: body.certificate_period_end,
          limit: body.limit,
        });
        
        return dispatch(fetchCertificates(body)).unwrap().then((res) => {
          const bundles = res?.granular_certificate_bundles || [];
          logger.debug(`Received ${bundles.length} certificate bundles for account ${accountId}`);
          return bundles;
        }).catch((err) => {
          logger.error(`Failed to fetch certificates for account ${accountId}:`, err);
          return [];
        });
      });

      const results = await Promise.all(requests);
      const combined = results.flat();
      
      setAggregatedCertificates(combined);
    } catch (error) {
      logger.error("Failed to fetch aggregated certificates:", error);
      message.error(error?.message || "Failed to fetch certificates");
    } finally {
      setIsFetching(false);
      fetchInProgressRef.current = false;
    }
  };

  const handleFilterChange = (key, value) => {
    // If changing account filter, clear device filter as devices may not belong to new account
    if (key === 'account_id') {
      setFilters((prev) => ({ ...prev, [key]: value, device_id: null }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleApplyFilter = () => {
    fetchCertificatesData();
  };

  const handleGetCertificateDetail = async (certificateId) => {
    try {
      const response = await dispatch(
        getCertificateDetails(certificateId)
      ).unwrap();
      setSelectedCertificateData(response);
      setIsDetailModalOpen(true);
    } catch (error) {
      message.error(error?.message || "Failed to fetch certificate details");
    }
  };

  const handleClearFilter = async () => {
    setFilters({
      account_id: null,
      device_id: null,
      certificate_bundle_status: null,
      certificate_period_start: null,
      certificate_period_end: null,
    });
    // Fetch after setting filters to empty
    setTimeout(() => fetchCertificatesData(), 0);
  };

  const getDeviceName = (deviceID) => {
    const allDevices = [
      ...(currentAccount?.detail?.devices || []),
      ...(currentAccount?.detail?.certificateDevices || []),
    ];

    const device = allDevices.find((device) => deviceID === device.id);

    return device?.device_name || `Device ${deviceID}`;
  };

  const getDeviceTimezone = (deviceID) => {
    const allDevices = [
      ...(currentAccount?.detail?.devices || []),
      ...(currentAccount?.detail?.certificateDevices || []),
    ];

    const device = allDevices.find((device) => deviceID === device.id);
    return device?.project_timezone || device?.device_timezone || dayjs.tz.guess();
  };

  const handleDateChange = (dates) => {
    if (!dates) {
      setFilters((prev) => ({
        ...prev,
        certificate_period_start: null,
        certificate_period_end: null,
      }));
      return;
    }

    const [start, end] = dates;
    const daysDiff = end.diff(start, 'days');

    if (daysDiff > 30) {
      // If more than 30 days, adjust the end date to be 30 days from start
      const adjustedEnd = start.add(30, 'days');
      setFilters((prev) => ({
        ...prev,
        certificate_period_start: start,
        certificate_period_end: adjustedEnd,
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        certificate_period_start: start,
        certificate_period_end: end,
      }));
    }
  };

  const onSelectChange = useCallback((newSelectedRowKeys, newSelectedRows) => {
    setSelectedRowKeys(newSelectedRowKeys);
    setSelectedRecords(newSelectedRows);
  }, []);

  const openDialog = (action) => {
    if (action === "split") {
      splitDialogRef.current.openDialog();
    } else {
      setDialogAction(action);
    }
  };

  const closeDialog = () => {
    dialogRef.current.closeDialog(); // Close the dialog from the parent component
  };

  // Handler for withdraw action (super admin only)
  const handleWithdrawCertificates = async () => {
    if (!selectedRecords || selectedRecords.length === 0) {
      message.warning("Please select certificates to withdraw");
      return;
    }

    try {
      const certificateIds = selectedRecords.map(cert => cert.certificate_bundle_id);
      
      // Confirm action
      const confirmed = window.confirm(
        `Are you sure you want to withdraw ${certificateIds.length} certificate(s)?\n\n` +
        `This will temporarily remove them from circulation but can be reversed by changing their status back.`
      );
      
      if (!confirmed) return;

      // Call withdraw API endpoint
      const response = await fetch(`${process.env.REACT_APP_API_URL}/certificates/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`,
        },
        body: JSON.stringify({
          source_id: currentAccount.detail.id,
          user_id: userInfo.userID,
          granular_certificate_bundle_ids: certificateIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to withdraw certificates');
      }

      message.success(`Successfully withdrew ${certificateIds.length} certificate(s)`);
      
      // Clear selection and refresh
      setSelectedRowKeys([]);
      setSelectedRecords([]);
      fetchCertificatesData();
    } catch (error) {
      message.error(error.message || 'Failed to withdraw certificates');
      console.error('Withdraw error:', error);
    }
  };

  // Handler for soft delete action (super admin only)
  const handleSoftDelete = async () => {
    if (!selectedRecords || selectedRecords.length === 0) {
      message.warning("Please select certificates to soft delete");
      return;
    }

    try {
      const certificateIds = selectedRecords.map(cert => cert.certificate_bundle_id);
      
      // Get deletion reason with warning
      const reason = window.prompt(
        `⚠️ SUPER ADMIN ACTION ⚠️\n\n` +
        `You are about to soft delete ${certificateIds.length} certificate(s).\n\n` +
        `This will hide them from ALL users (including regular admins).\n` +
        `Only super admins can view and restore them.\n\n` +
        `Please provide a reason (minimum 10 characters):`
      );

      if (!reason) return; // User cancelled
      
      if (reason.length < 10) {
        message.error('Deletion reason must be at least 10 characters');
        return;
      }

      // Soft delete each certificate
      let successCount = 0;
      let errorCount = 0;

      for (const certId of certificateIds) {
        try {
          const formData = new URLSearchParams();
          formData.append('deletion_reason', reason);

          const response = await fetch(
            `${process.env.REACT_APP_API_URL}/super-admin/deletion/certificates/${certId}/soft-delete`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Cookies.get('access_token')}`,
              },
              body: formData,
            }
          );

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            const errorData = await response.json();
            console.error(`Failed to delete ${certId}:`, errorData);
          }
        } catch (error) {
          errorCount++;
          console.error(`Failed to delete certificate ${certId}:`, error);
        }
      }

      if (successCount > 0) {
        message.success(`Successfully soft deleted ${successCount} certificate(s)`);
      }
      if (errorCount > 0) {
        message.error(`Failed to delete ${errorCount} certificate(s)`);
      }
      
      // Clear selection and refresh
      setSelectedRowKeys([]);
      setSelectedRecords([]);
      fetchCertificatesData();
    } catch (error) {
      message.error(error.message || 'Failed to soft delete certificates');
      console.error('Soft delete error:', error);
    }
  };

  const filterComponents = [
    /* Account Filter */
    <Select
      placeholder="Account"
      options={accountOptions.map(opt => ({
        ...opt,
        label: (
          <span title={`Account ID: ${opt.value}`}>
            {opt.label}
          </span>
        ),
      }))}
      value={filters.account_id}
      onChange={(value) => {
        logger.info(`Account filter changed to: ${value}`);
        handleFilterChange("account_id", value);
      }}
      style={{ width: 200 }}
      allowClear
      showSearch
      optionFilterProp="children"
    ></Select>,
    /* Device Filter */
    <Select
      placeholder="Device"
      // mode="multiple"
      options={deviceOptions}
      value={filters.device_id}
      onChange={(value) => handleFilterChange("device_id", value)}
      style={{ width: 120 }}
      suffixIcon={<LaptopOutlined />}
      allowClear
    ></Select>,
    /* Date range Filter */
    <RangePicker
      value={filters.certificate_period_start && filters.certificate_period_end ? 
        [filters.certificate_period_start, filters.certificate_period_end] : null}
      onChange={(dates) => handleDateChange(dates)}
      allowClear={true}
      format="YYYY-MM-DD"
    />,
    <Select
      // mode="multiple"
      placeholder="Status"
      value={filters.certificate_bundle_status}
      onChange={(value) =>
        handleFilterChange("certificate_bundle_status", value)
      }
      style={{ width: 200 }}
      allowClear
      suffixIcon={<ClockCircleOutlined />}
    >
      {Object.entries(CERTIFICATE_STATUS).map(([key, value]) => (
        <Option key={key} value={key}>
          {value}
        </Option>
      ))}
    </Select>,
  ];

  const columns = [
    {
      title: <span style={{ color: "#80868B", fontFamily: "monospace" }}>Certificate Bundle ID</span>,
      dataIndex: "certificate_bundle_id",
      key: "certificate_bundle_id",
      render: (value) => <span style={{ fontFamily: "monospace" }}>{value}</span>,
      sorter: {
        compare: (a, b) =>
          a.certificate_bundle_id.toString().localeCompare(b.certificate_bundle_id.toString()),
        multiple: 1,
      },
      sortOrder: tableSorter.field === "certificate_bundle_id" ? tableSorter.order : null,
    },
    {
      title: <span style={{ color: "#80868B" }}>Device Name</span>,
      dataIndex: "device_id",
      key: "device_id",
      render: (_, record) => <span>{record.device_name || getDeviceName(record.device_id)}</span>,
      sorter: {
        compare: (a, b) => {
          const an = a.device_name || getDeviceName(a.device_id);
          const bn = b.device_name || getDeviceName(b.device_id);
          return an.localeCompare(bn);
        },
        multiple: 2,
      },
      sortOrder: tableSorter.field === "device_id" ? tableSorter.order : null,
    },
    {
      title: <span style={{ color: "#80868B" }}>Period Start (UTC)</span>,
      dataIndex: "production_starting_interval",
      key: "production_starting_interval",
      render: (text) => {
        const d = dayjs.utc(text);
        return <span style={{ color: "#5F6368" }}>{d.isValid() ? d.format("YYYY-MM-DD HH:mm") : text}</span>;
      },
      sorter: {
        compare: (a, b) => {
          const ta = new Date(a.production_starting_interval).getTime();
          const tb = new Date(b.production_starting_interval).getTime();
          const va = Number.isNaN(ta) ? 0 : ta;
          const vb = Number.isNaN(tb) ? 0 : tb;
          return va - vb;
        },
        multiple: 3,
      },
      sortOrder: tableSorter.field === "production_starting_interval" ? tableSorter.order : null,
    },
    {
      title: <span style={{ color: "#80868B" }}>Period Start (Local)</span>,
      key: "production_starting_interval_local",
      render: (_, record) => {
        const tz = getDeviceTimezone(record.device_id);
        const raw = record.production_starting_interval;
        const d = raw ? dayjs.utc(raw).tz(tz) : null;
        return <span style={{ color: "#5F6368" }}>{d && d.isValid() ? d.format("YYYY-MM-DD HH:mm") : "-"}</span>;
      },
    },
    {
      title: <span style={{ color: "#80868B" }}>Energy (MWh)</span>,
      dataIndex: "bundle_quantity",
      key: "bundle_quantity",
      render: (value, record) => {
        const energyWh = Number(record.energy_precision_wh || record.bundle_quantity || 0);
        const mwh = (energyWh / 1e6).toFixed(6);
        
        // Show badge for ALLOCATED certificates (subaccount allocations)
        if (record.certificate_bundle_status === 'Allocated') {
          return (
            <span>
              {mwh} <Tag color="blue" style={{ fontSize: '10px' }}>Allocated</Tag>
            </span>
          );
        }
        return mwh;
      },
      sorter: {
        compare: (a, b) => {
          const aEnergy = Number(a.energy_precision_wh || a.bundle_quantity || 0);
          const bEnergy = Number(b.energy_precision_wh || b.bundle_quantity || 0);
          return aEnergy - bEnergy;
        },
        multiple: 5,
      },
      sortOrder: tableSorter.field === "bundle_quantity" ? tableSorter.order : null,
    },
    {
      title: <span style={{ color: "#80868B" }}>EAC ID</span>,
      dataIndex: "eac_id",
      key: "eac_id",
      render: (value) => <span style={{ color: "#5F6368" }}>{value || "-"}</span>,
      sorter: {
        compare: (a, b) => (a.eac_id || "").localeCompare(b.eac_id || ""),
        multiple: 6,
      },
      defaultSortOrder: "ascend",
      sortOrder: tableSorter.field === "eac_id" ? tableSorter.order : null,
    },
    {
      title: <span style={{ color: "#80868B" }}>Status</span>,
      dataIndex: "certificate_bundle_status",
      key: "certificate_bundle_status",
      render: (status) => <StatusTag status={String(status || "")} />,
      sorter: {
        compare: (a, b) =>
          String(a.certificate_bundle_status).localeCompare(
            String(b.certificate_bundle_status)
          ),
        multiple: 7,
      },
      sortOrder: tableSorter.field === "certificate_bundle_status" ? tableSorter.order : null,
    },
    {
      title: "",
      render: (_, record) => {
        return (
          <Button
            style={{ color: "#043DDC", fontWeight: "600" }}
            type="link"
            onClick={() => handleGetCertificateDetail(record.certificate_bundle_id)}
          >
            Details
          </Button>
        );
      },
    },
  ];

  // Compute sorted dataset across all pages
  const sortedCertificates = useMemo(() => {
    const source = aggregatedCertificates.length > 0 ? aggregatedCertificates : safeCertificates;

    const copy = [...(source || [])];
    const field = tableSorter.field;
    const order = tableSorter.order === "descend" ? -1 : 1;

    const getComparable = (item) => {
      if (field === "device_id") {
        return String(getDeviceName(item.device_id));
      }
      if (field === "production_starting_interval") {
        const raw = item.production_starting_interval || item.production_Starting_interval || item.production_start_time || item.start_time;
        if (!raw) {
          return 0;
        }
        const d = dayjs(raw);
        if (d.isValid()) {
          return d.valueOf();
        }
        const t = new Date(raw).getTime();
        return Number.isNaN(t) ? 0 : t;
      }
      if (field === "bundle_quantity") {
        return Number(item.energy_precision_wh || item.bundle_quantity || 0);
      }
      if (field === "certificate_bundle_status") {
        return String(item.certificate_bundle_status || "");
      }
      if (field === "certificate_bundle_id") {
        return String(item.certificate_bundle_id || "");
      }
      if (field === "eac_id") {
        return String(item.eac_id || "");
      }
      return String(item[field] ?? "");
    };

    copy.sort((a, b) => {
      const va = getComparable(a);
      const vb = getComparable(b);
      if (typeof va === "number" && typeof vb === "number") {
        // Use 0 as fallback for invalid dates; then apply direction
        return order === 1 ? (va - vb) : (vb - va);
      }
      const cmp = String(va).localeCompare(String(vb));
      return order === 1 ? cmp : -cmp;
    });

    return copy;
  }, [aggregatedCertificates, safeCertificates, tableSorter]);

  const handleSelectAll = useCallback(async () => {
    if (!userInfo?.userID) return;
    
    try {
      // Build list of account IDs the user can access
      let accountIds = [];
      if (isSuperAdmin) {
        try {
          const res = await getAllAccountsAPI();
          accountIds = (res?.data?.accounts || res?.data || []).map((a) => a.id);
        } catch (e) {
          logger.error("Failed to load accounts for super admin:", e);
          accountIds = (userData?.accounts || []).map((a) => a.id);
        }
      } else if (isAdmin || (userData?.accounts && userData.accounts.length > 0)) {
        accountIds = userData.accounts.map((a) => a.id);
      } else if (currentAccount?.detail?.id) {
        accountIds = [currentAccount.detail.id];
      }

      // If an account filter is selected, only fetch for that account
      if (filters.account_id) {
        accountIds = [filters.account_id];
      }

      if (!accountIds || accountIds.length === 0) return;

      // Fetch ALL certificates for selection (not just visible ones)
      const allCertificatesPromises = accountIds.map(async (accountId) => {
        const body = {
          user_id: userInfo.userID,
          source_id: accountId,
          device_id: filters.device_id,
          certificate_bundle_status:
            filters.certificate_bundle_status ? CERTIFICATE_STATUS[filters.certificate_bundle_status] : null,
          certificate_period_start:
            filters.certificate_period_start?.format("YYYY-MM-DD") || null,
          certificate_period_end:
            filters.certificate_period_end?.format("YYYY-MM-DD") || null,
          limit: 1000, // Fetch in batches
          offset: 0,
        };
        
        try {
          // First request to get total count
          const firstBatch = await dispatch(fetchCertificates(body)).unwrap();
          const certificates = firstBatch?.granular_certificate_bundles || [];
          const totalCount = firstBatch?.total_count || certificates.length;
          
          // If there are more certificates, fetch remaining batches
          if (totalCount > 1000) {
            logger.debug(`Fetching ${totalCount} total certificates for selection from account ${accountId}`);
            const remainingBatches = [];
            for (let offset = 1000; offset < totalCount; offset += 1000) {
              remainingBatches.push(
                dispatch(fetchCertificates({ ...body, offset }))
                  .unwrap()
                  .then((res) => res?.granular_certificate_bundles || [])
                  .catch(() => [])
              );
            }
            const additionalCerts = await Promise.all(remainingBatches);
            return [...certificates, ...additionalCerts.flat()];
          }
          
          return certificates;
        } catch (err) {
          logger.error(`Failed to fetch all certificates for selection from account ${accountId}:`, err);
          return [];
        }
      });

      const allCertificatesResults = await Promise.all(allCertificatesPromises);
      const allCertificates = allCertificatesResults.flat();
      
      if (allCertificates.length === 0) return;
      
      const allKeys = allCertificates.map((cert) => cert.certificate_bundle_id);
      const allRecords = allCertificates;
      onSelectChange(allKeys, allRecords);
      
      message.success(`Selected ${allKeys.length} certificate(s)`);
    } catch (error) {
      logger.error("Failed to select all certificates:", error);
      message.error("Failed to select all certificates");
    }
  }, [userInfo, userData, currentAccount, filters, dispatch, onSelectChange]);

  const isCertificatesSelected = selectedRowKeys.length > 0;
  // For Select All, we'll disable it only if we have no certificates to select
  const hasCertificatesToSelect = allCertificatesForSummary.length > 0 && 
    (allCertificatesForSummary[0]?.total_certificates || 0) > 0;

  const btnList = useMemo(
    () => {
      // Base buttons for all users
      const buttons = [
        {
          icon: <CheckSquareOutlined />,
          btnType: "default",
          type: "selectAll",
          disabled: !hasCertificatesToSelect,
          style: { height: "40px" },
          name: "Select All",
          handle: handleSelectAll,
        },
        {
          icon: <CloseOutlined />,
          btnType: "primary",
          type: "cancel",
          disabled: !isCertificatesSelected,
          style: { height: "40px" },
          name: "Retire",
          handle: () => openDialog("cancel"),
        },
        {
          icon: <DownloadOutlined />,
          btnType: "primary",
          type: "reserve",
          disabled: true,
          style: { height: "40px" },
          name: "Reserve",
          handle: () => openDialog("reserve"),
        },
        {
          icon: <SwapOutlined />,
          btnType: "primary",
          type: "transfer",
          disabled: !isCertificatesSelected,
          style: { height: "40px" },
          name: "Transfer",
          handle: () => openDialog("transfer"),
        },
        {
          icon: <ScissorOutlined />,
          btnType: "primary",
          type: "split",
          disabled: !isCertificatesSelected,
          style: { height: "40px" },
          name: "Split",
          handle: () => openDialog("split"),
        },
      ];

      // Super admin-only buttons
      if (isSuperAdmin) {
        buttons.push(
          {
            icon: <RollbackOutlined />,
            btnType: "default",
            type: "withdraw",
            disabled: !isCertificatesSelected,
            style: { 
              height: "40px", 
              backgroundColor: "#faad14", 
              color: "white", 
              borderColor: "#faad14",
              marginLeft: "8px" 
            },
            name: "Withdraw",
            handle: handleWithdrawCertificates,
            title: "Temporarily remove from circulation (Super Admin only)",
          },
          {
            icon: <DeleteOutlined />,
            btnType: "danger",
            type: "soft-delete",
            disabled: !isCertificatesSelected,
            style: { height: "40px" },
            name: "Soft Delete",
            handle: handleSoftDelete,
            title: "Hide from all users - only super admin can restore (Super Admin only)",
          }
        );
      }

      return buttons;
    },
    [isCertificatesSelected, hasCertificatesToSelect, handleSelectAll, isSuperAdmin]
  );

  const handleTableChange = (_pagination, _filters, sorter) => {
    if (!sorter) return;
    // sorter can be array for multiple; handle single case
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    if (s && s.field && s.order) {
      setTableSorter({ field: s.field, order: s.order });
    }
  };

  const tableTitle = useMemo(() => {
    if (filters.account_id) {
      const found = accountOptions.find((a) => a.value === filters.account_id);
      return found?.label || 'Selected Account';
    }
    return aggregatedCertificates.length > 0 ? 'All Accessible Accounts' : (currentAccount?.detail?.account_name || 'Current Account');
  }, [filters.account_id, accountOptions, aggregatedCertificates.length, currentAccount?.detail?.account_name]);

  return (
    <>
      {/* Certificates Page Header with Account Selection */}
      <div style={{ 
        padding: "24px", 
        backgroundColor: "#fff", 
        borderBottom: "1px solid #E8EAED",
        marginBottom: "24px" 
      }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0, color: "#202124" }}>
              Granular Certificates
            </Title>
          </Col>
        </Row>
      </div>

      <FilterTable
        summary={<Summary filteredCertificates={allCertificatesForSummary} isLoading={isFetching} />}
        tableName={tableTitle}
        columns={columns}
        filterComponents={filterComponents}
        tableActionBtns={btnList}
        defaultFilters={defaultFilters}
        filters={filters}
        dataSource={sortedCertificates}
        fetchTableData={fetchCertificatesData}
        onRowsSelected={onSelectChange}
        handleApplyFilter={handleApplyFilter}
        handleClearFilter={handleClearFilter}
        selectedRowKeys={selectedRowKeys}
        selectedRecords={selectedRecords}
        onTableChange={handleTableChange}
        loading={isFetching}
      />

      {/* Dialog component with a ref to control it from outside */}
      <CertificateActionDialog
        dialogAction={dialogAction}
        selectedRowKeys={selectedRowKeys}
        ref={dialogRef}
        totalProduction={totalProduction}
        selectedDevices={selectedDevices}
        updateCertificateActionDialog={setDialogAction}
        getDeviceName={getDeviceName}
        fetchCertificatesData={fetchCertificatesData}
        setSelectedRowKeys={setSelectedRowKeys}
        getCertificateDetail={handleGetCertificateDetail}
      />
      <CertificateSplitDialog
        ref={splitDialogRef}
        selectedRowKeys={selectedRowKeys}
        selectedRecords={selectedRecords}
        userInfo={userInfo}
        updateCertificateActionDialog={setDialogAction}
        setSelectedRowKeys={setSelectedRowKeys}
        fetchCertificatesData={fetchCertificatesData}
        getDeviceName={getDeviceName}
      />
      <CertificateDetailDialog
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        certificateData={selectedCertificateData}
      />
    </>
  );
};

export default Certificate;

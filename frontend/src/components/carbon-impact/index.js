import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import Cookies from "js-cookie";

import { 
  Button, 
  message, 
  Select, 
  DatePicker, 
  Row, 
  Col, 
  Typography, 
  Card, 
  Space,
  Alert,
  Modal,
  InputNumber,
  Form,
  Slider,
  Spin
} from "antd";

import {
  EnvironmentOutlined,
  InfoCircleOutlined,
  LaptopOutlined,
  ClockCircleOutlined,
  TagOutlined,
} from "@ant-design/icons";

import "../../assets/styles/pagination.css";
import "../../assets/styles/filter.css";

import { useDispatch } from "react-redux";
import { useAccount } from "../../context/AccountContext";
import { useUser } from "../../context/UserContext";
import {
  getCertificateDetails,
  updateCertificateCarbonImpact,
  tagAllUntaggedCertificates,
} from "../../store/certificate/certificateThunk";
import { fetchCertificatesAPI } from "../../api/certificateAPI";

import CertificateDetailDialog from "../certificate/CertificateDetailDialog";
import StatusTag from "../common/StatusTag";
import FilterTable from "../common/FilterTable";

import { CERTIFICATE_STATUS } from "../../enum";
import { isEmpty, logger } from "../../utils";
import { getAllAccountsAPI } from "../../api/superAdminAPI";

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text, Paragraph } = Typography;

const CarbonImpact = () => {
  dayjs.extend(utc);
  dayjs.extend(timezone);
  const { currentAccount } = useAccount();
  const { userData } = useUser();

  const dispatch = useDispatch();

  const [allCertificates, setAllCertificates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [accountOptions, setAccountOptions] = useState([]);
  const [allDevicesMap, setAllDevicesMap] = useState(new Map());
  const [availableDevices, setAvailableDevices] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCertificateData, setSelectedCertificateData] = useState(null);
  const [isTaggingModalOpen, setIsTaggingModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [carbonImpactValue, setCarbonImpactValue] = useState(null);
  const [mberWeight, setMberWeight] = useState(0.5);
  const [isTaggingInProgress, setIsTaggingInProgress] = useState(false);

  const [form] = Form.useForm();

  // Use ref to track mounted state and prevent updates after unmount
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const userInfo = useMemo(() => {
    return userData?.userInfo || (() => {
      try {
        const cookieData = Cookies.get("user_data");
        return cookieData ? JSON.parse(cookieData).userInfo : null;
      } catch (_e) {
        return null;
      }
    })();
  }, [userData?.userInfo]);

  const deviceOptions = useMemo(() => {
    // Prioritize availableDevices (from filtered accounts) if populated
    let devicesToUse = [];
    
    if (availableDevices.length > 0) {
      devicesToUse = availableDevices;
    } else {
      // Otherwise build from allDevicesMap which includes devices discovered from certificates
      devicesToUse = Array.from(allDevicesMap.values());
      
      // Also include devices from current account context
      if (currentAccount?.detail?.devices) {
        currentAccount.detail.devices.forEach(dev => {
          if (!allDevicesMap.has(dev.id)) {
            devicesToUse.push(dev);
          }
        });
      }
      if (currentAccount?.detail?.certificateDevices) {
        currentAccount.detail.certificateDevices.forEach(dev => {
          if (!allDevicesMap.has(dev.id)) {
            devicesToUse.push(dev);
          }
        });
      }
    }

    const uniqueDevices = Array.from(
      new Map(devicesToUse.map((device) => [device.id, device])).values()
    );

    return uniqueDevices.map((device) => ({
      value: device.id,
      label: device.device_name || `Device ${device.id}`,
    }));
  }, [availableDevices, allDevicesMap, currentAccount?.detail?.devices, currentAccount?.detail?.certificateDevices]);

  // Get max bundle period start from the certificates
  const maxBundlePeriodStart = useMemo(() => {
    if (allCertificates.length === 0) {
      return dayjs();
    }
    return allCertificates.reduce((max, certificate) => {
      const certificatePeriodStart = dayjs(
        certificate.production_starting_interval
      );
      return certificatePeriodStart.isAfter(max) ? certificatePeriodStart : max;
    }, dayjs().subtract(1, "year"));
  }, [allCertificates]);

  const one_month_ago = maxBundlePeriodStart.subtract(30, "days");

  const defaultFilters = {
    account_id: null,
    device_id: null,
    certificate_bundle_status: null,
    certificate_period_start: null,
    certificate_period_end: null,
    impact_status: null, // null | 'untagged' | 'tagged'
  };

  const [filters, setFilters] = useState(defaultFilters);

  // Determine roles
  const role = userData?.userInfo?.role;
  const isAdmin = role === "ADMIN" || role === 4;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === 5;

  // Memoize account IDs to prevent unnecessary re-renders
  const userAccountIds = useMemo(() => {
    return (userData?.accounts || []).map(a => a.id).sort().join(',');
  }, [userData?.accounts]);

  // Memoized list of account IDs to prevent fetchCertificatesData instability
  const userAccountsList = useMemo(() => {
    return userAccountIds ? userAccountIds.split(',').map(Number).filter(Boolean) : [];
  }, [userAccountIds]);

  const currentAccountId = currentAccount?.detail?.id;

  // Load account options and initial devices
  useEffect(() => {
    const loadAccountsAndDevices = async () => {
      try {
        let accountsList = [];
        
        if (isSuperAdmin) {
          const res = await getAllAccountsAPI();
          accountsList = res?.data?.accounts || res?.data || [];
        } else {
          accountsList = userData?.accounts || [];
        }
        
        const accountOpts = accountsList.map((a) => ({
          value: a.id,
          label: a.account_name || `Account ${a.id}`,
        }));
        
        if (!isMountedRef.current) return;
        setAccountOptions(accountOpts);
        
        // Load devices from currentAccount if available
        const devicesMap = new Map();
        if (currentAccount?.detail?.devices) {
          currentAccount.detail.devices.forEach(dev => {
            devicesMap.set(dev.id, dev);
          });
        }
        if (currentAccount?.detail?.certificateDevices) {
          currentAccount.detail.certificateDevices.forEach(dev => {
            devicesMap.set(dev.id, dev);
          });
        }
        
        if (!isMountedRef.current) return;
        setAllDevicesMap(devicesMap);
      } catch (_e) {
        const list = (userData?.accounts || []).map((a) => ({
          value: a.id,
          label: a.account_name || `Account ${a.id}`,
        }));
        if (isMountedRef.current) {
          setAccountOptions(list);
        }
      }
    };
    loadAccountsAndDevices();
  }, [isSuperAdmin, userAccountIds, currentAccountId, userData?.accounts, currentAccount?.detail]);

  // Fetch devices for filtered account(s)
  useEffect(() => {
    const fetchDevicesForAccounts = async () => {
      try {
        let accountIdsToFetch = [];
        
        // If account filter is selected, fetch devices for that account
        if (filters.account_id) {
          accountIdsToFetch = [filters.account_id];
        } 
        // Otherwise, fetch devices for all accessible accounts
        else if (isSuperAdmin) {
          try {
            const res = await getAllAccountsAPI();
            accountIdsToFetch = (res?.data?.accounts || res?.data || []).map((a) => a.id);
          } catch (e) {
            accountIdsToFetch = (userData?.accounts || []).map((a) => a.id);
          }
        } else if (isAdmin || (userData?.accounts && userData.accounts.length > 0)) {
          accountIdsToFetch = userData.accounts.map((a) => a.id);
        } else if (currentAccountId) {
          accountIdsToFetch = [currentAccountId];
        }

        if (accountIdsToFetch.length === 0) {
          if (isMountedRef.current) {
            setAvailableDevices([]);
          }
          return;
        }

        // Fetch devices from all relevant accounts and de-duplicate
        const requests = accountIdsToFetch.map(async (accountId) => {
          try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/accounts/${accountId}/devices`, {
              headers: {
                'Authorization': `Bearer ${Cookies.get('access_token')}`,
                'Content-Type': 'application/json',
              },
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data || [];
          } catch (error) {
            logger.warn(`Failed to fetch devices for account ${accountId}:`, error);
            return [];
          }
        });

        const results = await Promise.all(requests);
        const allDevices = results.flat();
        
        // De-duplicate devices by ID
        const uniqueDevices = Array.from(
          new Map(allDevices.map((device) => [device.id, device])).values()
        );
        
        if (isMountedRef.current) {
          setAvailableDevices(uniqueDevices);
        }
      } catch (error) {
        logger.error("Failed to fetch devices for accounts:", error);
        if (isMountedRef.current) {
          setAvailableDevices([]);
        }
      }
    };

    fetchDevicesForAccounts();
  }, [filters.account_id, isSuperAdmin, isAdmin, userAccountIds, currentAccountId, userData?.accounts]);

  const fetchCertificatesData = useCallback(async () => {
    if (!userInfo?.userID) {
      return;
    }

    const PAGE_SIZE = 500;

    // Build list of account IDs the user can access
    let accountIds = [];
    
    // If account filter is set, only fetch from that account
    if (filters.account_id) {
      accountIds = [filters.account_id];
    } else {
      // Otherwise fetch from all accessible accounts
      try {
        if (isSuperAdmin) {
          try {
            const res = await getAllAccountsAPI();
            accountIds = (res?.data?.accounts || res?.data || []).map((a) => a.id);
          } catch (e) {
            logger.error("Failed to load accounts for super admin:", e);
            accountIds = userAccountsList;
          }
        } else if (isAdmin || userAccountsList.length > 0) {
          accountIds = userAccountsList;
        } else if (currentAccountId) {
          accountIds = [currentAccountId];
        }
      } catch (error) {
        logger.error("Failed to determine account IDs:", error);
        accountIds = currentAccountId ? [currentAccountId] : [];
      }
    }

    if (!accountIds || accountIds.length === 0) {
      if (isMountedRef.current) {
        setAllCertificates([]);
      }
      return;
    }

    if (isMountedRef.current) {
      setIsLoading(true);
    }

    try {
      // Fetch across accounts and aggregate using direct API calls
      // (avoids Redux state churn that causes table flickering)
      const requests = accountIds.map(async (accountId) => {
        const baseBody = {
          user_id: userInfo.userID,
          source_id: accountId,
          device_id: filters.device_id,
          certificate_bundle_status:
            filters.certificate_bundle_status ? CERTIFICATE_STATUS[filters.certificate_bundle_status] : null,
          certificate_period_start:
            filters.certificate_period_start?.format("YYYY-MM-DD") || null,
          certificate_period_end:
            filters.certificate_period_end?.format("YYYY-MM-DD") || null,
        };

        let offset = 0;
        let acc = [];
        // paginate per account
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const response = await fetchCertificatesAPI({ ...baseBody, limit: PAGE_SIZE, offset });
          const items = response?.data?.granular_certificate_bundles || [];
          acc = acc.concat(items);
          if (!items.length || items.length < PAGE_SIZE) {
            break;
          }
          offset += PAGE_SIZE;
        }
        return acc;
      });

      const results = await Promise.all(requests);
      const flatCertificates = results.flat();
      
      if (!isMountedRef.current) return;
      
      setAllCertificates(flatCertificates);
      
      // Extract unique devices from certificates and update devicesMap using functional update
      setAllDevicesMap(prevMap => {
        const newDevicesMap = new Map(prevMap);
        flatCertificates.forEach(cert => {
          if (cert.device_id && cert.device_name && !newDevicesMap.has(cert.device_id)) {
            newDevicesMap.set(cert.device_id, {
              id: cert.device_id,
              device_name: cert.device_name,
            });
          }
        });
        return newDevicesMap;
      });
    } catch (error) {
      logger.error("Failed to fetch certificates:", error);
      message.error(error?.message || "Failed to fetch certificates");
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [userInfo, filters, isAdmin, isSuperAdmin, currentAccountId, userAccountsList]);

  // Initial data fetch - only run once on mount when user is ready
  useEffect(() => {
    if (isInitialLoad && userInfo?.userID) {
      fetchCertificatesData();
      setIsInitialLoad(false);
    }
  }, [isInitialLoad, userInfo?.userID, fetchCertificatesData]);

  // Re-fetch when filters change (but not on initial load)
  const filterKey = useMemo(() => {
    return JSON.stringify({
      account_id: filters.account_id,
      device_id: filters.device_id,
      certificate_bundle_status: filters.certificate_bundle_status,
      certificate_period_start: filters.certificate_period_start?.format("YYYY-MM-DD"),
      certificate_period_end: filters.certificate_period_end?.format("YYYY-MM-DD"),
      impact_status: filters.impact_status,
    });
  }, [filters]);

  const prevFilterKeyRef = useRef(filterKey);
  
  useEffect(() => {
    // Only fetch if filters actually changed and not on initial load
    if (!isInitialLoad && prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      fetchCertificatesData();
    }
  }, [filterKey, isInitialLoad, fetchCertificatesData]);

  const handleFilterChange = useCallback((key, value) => {
    // If changing account filter, clear device filter as devices may not belong to new account
    if (key === 'account_id') {
      setFilters((prev) => ({ ...prev, [key]: value, device_id: null }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: value }));
    }
  }, []);

  const handleApplyFilter = useCallback(() => {
    // Filter changes are already tracked via useEffect, but we can force a re-fetch
    // by updating the filterKey via a state change if needed
    fetchCertificatesData();
  }, [fetchCertificatesData]);

  const handleGetCertificateDetail = useCallback(async (certificateId) => {
    try {
      const response = await dispatch(
        getCertificateDetails(certificateId)
      ).unwrap();
      setSelectedCertificateData(response);
      setIsDetailModalOpen(true);
    } catch (error) {
      message.error(error?.message || "Failed to fetch certificate details");
    }
  }, [dispatch]);

  const handleClearFilter = useCallback(async () => {
    setFilters({
      account_id: null,
      device_id: null,
      certificate_bundle_status: null,
      certificate_period_start: null,
      certificate_period_end: null,
      impact_status: null,
    });
    // Filter change will trigger re-fetch automatically via useEffect
  }, []);

  const getDeviceName = useCallback((deviceID) => {
    // Check allDevicesMap first
    const device = allDevicesMap.get(deviceID);
    if (device) {
      return device.device_name || `Device ${deviceID}`;
    }
    
    // Fallback to current account devices
    const allDevices = [
      ...(currentAccount?.detail?.devices || []),
      ...(currentAccount?.detail?.certificateDevices || []),
    ];
    const foundDevice = allDevices.find((d) => d.id === deviceID);
    return foundDevice?.device_name || `Device ${deviceID}`;
  }, [allDevicesMap, currentAccount]);

  const getDeviceTimezone = useCallback((deviceID) => {
    // Check allDevicesMap first
    const device = allDevicesMap.get(deviceID);
    if (device) {
      return device.project_timezone || device.device_timezone || dayjs.tz.guess();
    }
    
    // Fallback to current account devices
    const allDevices = [
      ...(currentAccount?.detail?.devices || []),
      ...(currentAccount?.detail?.certificateDevices || []),
    ];
    const foundDevice = allDevices.find((d) => d.id === deviceID);
    return foundDevice?.project_timezone || foundDevice?.device_timezone || dayjs.tz.guess();
  }, [allDevicesMap, currentAccount]);

  const handleDateChange = useCallback((dates) => {
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
  }, []);

  const onSelectChange = useCallback((newSelectedRowKeys, newSelectedRows) => {
    setSelectedRowKeys(newSelectedRowKeys);
    setSelectedRecords(newSelectedRows);
  }, []);

  const handleTagCarbonImpact = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      message.warning("Please select at least one certificate to tag with carbon impact.");
      return;
    }
    setIsTaggingModalOpen(true);
  }, [selectedRowKeys]);

  const handleTaggingSubmit = useCallback(async () => {
    try {
      setIsTaggingInProgress(true);
      
      // Filter to only untagged certificates
      const untaggedRecords = selectedRecords.filter(
        cert => !cert.carbon_impact_mer && !cert.carbon_impact_om && !cert.carbon_impact_bm
      );
      const untaggedIds = untaggedRecords.map(cert => cert.certificate_bundle_id);
      
      if (untaggedIds.length === 0) {
        message.warning("All selected certificates are already tagged with carbon impact data.");
        setIsTaggingModalOpen(false);
        setIsTaggingInProgress(false);
        return;
      }
      
      if (untaggedIds.length < selectedRowKeys.length) {
        message.info(`${selectedRowKeys.length - untaggedIds.length} certificate(s) already tagged. Tagging ${untaggedIds.length} untagged certificate(s).`);
      }
      
      const updateData = {
        certificate_ids: untaggedIds,
        mber_weight: mberWeight,
        user_id: userInfo.userID,
      };

      await dispatch(updateCertificateCarbonImpact(updateData)).unwrap();
      
      message.success(`Successfully tagged ${untaggedIds.length} certificate(s) with carbon impact data.`);
      setIsTaggingModalOpen(false);
      setCarbonImpactValue(null);
      form.resetFields();
      setSelectedRowKeys([]);
      setSelectedRecords([]);
      
      // Refresh the certificates data
      fetchCertificatesData();
    } catch (error) {
      logger.error("Failed to tag certificates with carbon impact:", error);
      message.error(error?.message || "Failed to tag certificates with carbon impact");
    } finally {
      setIsTaggingInProgress(false);
    }
  }, [selectedRowKeys, selectedRecords, mberWeight, userInfo, dispatch, form, fetchCertificatesData]);

  const handleTaggingCancel = useCallback(() => {
    setIsTaggingModalOpen(false);
    setCarbonImpactValue(null);
    form.resetFields();
  }, [form]);

  const isCertificatesSelected = selectedRowKeys.length > 0;

  const sortedCertificates = useMemo(() => {
    if (!allCertificates?.length) return [];
    return [...allCertificates].sort((a, b) =>
      a.issuance_id.toString().localeCompare(b.issuance_id.toString())
    );
  }, [allCertificates]);

  // Filter certificates to show only those without carbon impact or with carbon impact for display
  const certificatesForDisplay = useMemo(() => {
    if (!filters.impact_status) return sortedCertificates;
    if (filters.impact_status === "untagged") {
      return sortedCertificates.filter(
        (c) => !c.carbon_impact_mer && !c.carbon_impact_om && !c.carbon_impact_bm
      );
    }
    if (filters.impact_status === "tagged") {
      return sortedCertificates.filter(
        (c) => c.carbon_impact_mer || c.carbon_impact_om || c.carbon_impact_bm
      );
    }
    return sortedCertificates;
  }, [sortedCertificates, filters.impact_status]);

  const handleSelectAll = useCallback(() => {
    const allKeys = certificatesForDisplay.map(cert => cert.certificate_bundle_id);
    setSelectedRowKeys(allKeys);
    setSelectedRecords(certificatesForDisplay);
    message.success(`Selected ${allKeys.length} certificate(s)`);
  }, [certificatesForDisplay]);

  const btnList = useMemo(
    () => [
      {
        icon: <TagOutlined />,
        btnType: "default",
        type: "select-all",
        disabled: !certificatesForDisplay || certificatesForDisplay.length === 0,
        style: { height: "40px" },
        name: "Select all",
        handle: handleSelectAll,
      },
      {
        icon: <TagOutlined />,
        btnType: "primary",
        type: "tag-carbon",
        disabled: !isCertificatesSelected,
        style: { height: "40px", backgroundColor: "#52c41a", borderColor: "#52c41a" },
        name: "Tag selected",
        handle: handleTagCarbonImpact,
      },
    ],
    [isCertificatesSelected, handleSelectAll, handleTagCarbonImpact, certificatesForDisplay]
  );

  const filterComponents = useMemo(() => [
    <Select
      key="account"
      placeholder="Account"
      options={accountOptions}
      value={filters.account_id}
      onChange={(value) => handleFilterChange("account_id", value)}
      style={{ width: 200 }}
      allowClear
    />,
    <Select
      key="device"
      placeholder="Device"
      options={deviceOptions}
      value={filters.device_id}
      onChange={(value) => handleFilterChange("device_id", value)}
      style={{ width: 200 }}
      suffixIcon={<LaptopOutlined />}
      allowClear
    />,
    <RangePicker
      key="daterange"
      value={filters.certificate_period_start && filters.certificate_period_end ? 
        [filters.certificate_period_start, filters.certificate_period_end] : null}
      onChange={(dates) => handleDateChange(dates)}
      allowClear={true}
      format="YYYY-MM-DD"
    />,
    <Select
      key="status"
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
    <Select
      key="impact"
      placeholder="Impact status"
      value={filters.impact_status}
      onChange={(value) => handleFilterChange("impact_status", value)}
      style={{ width: 180 }}
      allowClear
      suffixIcon={<TagOutlined />}
      options={[
        { label: "Not tagged", value: "untagged" },
        { label: "Tagged", value: "tagged" },
      ]}
    />,
  ], [accountOptions, deviceOptions, filters, handleFilterChange, handleDateChange]);

  const columns = useMemo(() => [
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
      render: (value) => (Number(value || 0) / 1e6).toFixed(6),
      sorter: {
        compare: (a, b) => a.bundle_quantity - b.bundle_quantity,
        multiple: 3,
      },
    },
    {
      title: <span style={{ color: "#80868B" }}>Operating Margin (kgCO2e/MWh)</span>,
      dataIndex: "carbon_impact_om",
      key: "carbon_impact_om",
      render: (value) => (
        <span style={{ color: value ? "#1890ff" : "#8c8c8c" }}>
          {value ? Math.round(value) : "N/A"}
        </span>
      ),
      sorter: {
        compare: (a, b) => (a.carbon_impact_om || 0) - (b.carbon_impact_om || 0),
        multiple: 4,
      },
    },
    {
      title: <span style={{ color: "#80868B" }}>Build Margin (kgCO2e/MWh)</span>,
      dataIndex: "carbon_impact_bm",
      key: "carbon_impact_bm",
      render: (value) => (
        <span style={{ color: value ? "#fa8c16" : "#8c8c8c" }}>
          {value ? Math.round(value) : "N/A"}
        </span>
      ),
      sorter: {
        compare: (a, b) => (a.carbon_impact_bm || 0) - (b.carbon_impact_bm || 0),
        multiple: 5,
      },
    },
    {
      title: <span style={{ color: "#80868B" }}>Combined Margin (kgCO2e/MWh)</span>,
      dataIndex: "carbon_impact_mer",
      key: "carbon_impact_mer",
      render: (value) => (
        <span style={{ color: value ? "#52c41a" : "#8c8c8c", fontWeight: value ? "600" : "normal" }}>
          {value ? Math.round(value) : "Not tagged"}
        </span>
      ),
      sorter: {
        compare: (a, b) => (a.carbon_impact_mer || 0) - (b.carbon_impact_mer || 0),
        multiple: 6,
      },
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
  ], [getDeviceName, getDeviceTimezone, handleGetCertificateDetail]);

  return (
    <>
      {/* Carbon Impact Page Header */}
      <div style={{ 
        padding: "24px", 
        backgroundColor: "#fff", 
        borderBottom: "1px solid #E8EAED",
        marginBottom: "24px" 
      }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size={0}>
              <Title level={3} style={{ margin: 0, color: "#202124" }}>
                <EnvironmentOutlined style={{ marginRight: 8, color: "#52c41a" }} />
                Carbon Impact Management
              </Title>
              <Text type="secondary">
                Tag your Granular Certificates with carbon impact data (opt-in)
              </Text>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Carbon Impact Explanation Section */}
      <div style={{ marginBottom: "24px", padding: "0 24px" }}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Alert
              message="Carbon Impact Tagging - Opt-in Process"
              description={
                <div>
                  <Paragraph style={{ marginBottom: 8 }}>
                    Carbon impact tagging is an <strong>optional feature</strong> that allows you to assign carbon impact values to your Granular Certificates (GCs). 
                    This helps track and communicate the environmental benefits of your renewable energy generation.
                  </Paragraph>
                  <Paragraph style={{ marginBottom: 0 }}>
                    <strong>How it works:</strong> Select certificates below and click "Tag Carbon Impact" to assign carbon impact values in kgCO2e/MWh. 
                    Only certificates you explicitly tag will display carbon impact data.
                  </Paragraph>
                </div>
              }
              type="info"
              icon={<InfoCircleOutlined />}
              showIcon
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={8}>
            <Card size="small" style={{ textAlign: "center" }}>
              <div style={{ color: "#52c41a", fontSize: "24px", marginBottom: 8 }}>
                <EnvironmentOutlined />
              </div>
              <Text strong>Carbon Avoidance</Text>
              <div style={{ marginTop: 4, fontSize: "12px", color: "#8c8c8c" }}>
                Track CO2e emissions avoided through renewable energy
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ textAlign: "center" }}>
              <div style={{ color: "#1890ff", fontSize: "24px", marginBottom: 8 }}>
                <TagOutlined />
              </div>
              <Text strong>Opt-in Tagging</Text>
              <div style={{ marginTop: 4, fontSize: "12px", color: "#8c8c8c" }}>
                Choose which certificates to tag with carbon impact data
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ textAlign: "center" }}>
              <div style={{ color: "#722ed1", fontSize: "24px", marginBottom: 8 }}>
                <InfoCircleOutlined />
              </div>
              <Text strong>Transparent Reporting</Text>
              <div style={{ marginTop: 4, fontSize: "12px", color: "#8c8c8c" }}>
                Enhance your sustainability reporting with precise data
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <FilterTable
        summary={null}
        tableName={useMemo(() => {
          if (filters.account_id) {
            const found = accountOptions.find((a) => a.value === filters.account_id);
            return `${found?.label || 'Selected Account'} - Carbon Impact Management`;
          }
          return allCertificates.length > 0 ? 'All Accessible Accounts - Carbon Impact Management' : `${currentAccount?.detail?.account_name || 'Current Account'} - Carbon Impact Management`;
        }, [filters.account_id, accountOptions, allCertificates.length, currentAccount?.detail?.account_name])}
        columns={columns}
        filterComponents={filterComponents}
        tableActionBtns={btnList}
        defaultFilters={defaultFilters}
        filters={filters}
        dataSource={certificatesForDisplay}
        fetchTableData={fetchCertificatesData}
        onRowsSelected={onSelectChange}
        handleApplyFilter={handleApplyFilter}
        handleClearFilter={handleClearFilter}
        isShowSelection={true}
        selectedRowKeys={selectedRowKeys}
        selectedRecords={selectedRecords}
        loading={isLoading}
      />

      {/* Carbon Impact Tagging Modal */}
      <Modal
        title={
          <Space>
            <TagOutlined style={{ color: "#52c41a" }} />
            Tag Carbon Impact
          </Space>
        }
        open={isTaggingModalOpen}
        onOk={handleTaggingSubmit}
        onCancel={handleTaggingCancel}
        okText="Tag Certificates"
        cancelText="Cancel"
        okButtonProps={{ 
          style: { backgroundColor: "#52c41a", borderColor: "#52c41a" },
          disabled: isTaggingInProgress,
          loading: isTaggingInProgress
        }}
        cancelButtonProps={{
          disabled: isTaggingInProgress
        }}
        closable={!isTaggingInProgress}
        maskClosable={!isTaggingInProgress}
      >
        {isTaggingInProgress ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 20, fontSize: '16px', fontWeight: 500 }}>
              Processing Carbon Impact Data...
            </div>
            <div style={{ marginTop: 10, color: '#666', fontSize: '14px' }}>
              Please wait while we fetch emissions data and tag {selectedRowKeys.length} certificate(s).
              This may take up to 30 seconds for large batches.
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <Text>
                You are about to tag <strong>{selectedRowKeys.length}</strong> certificate(s) with carbon impact data.
              </Text>
            </div>
            
            <Form form={form} layout="vertical">
              <Form.Item
                label="MBER Weight (Hybrid Calculation)"
                name="mber_weight"
                rules={[{ required: false }]}
              >
                <div style={{ marginBottom: 16 }}>
                  <Slider
                    min={0}
                    max={1}
                    step={0.1}
                    value={mberWeight}
                    onChange={setMberWeight}
                    marks={{
                      0: 'WattTime Only',
                      0.5: 'Equal Weight',
                      1: 'MBER Only'
                    }}
                    tooltip={{
                      formatter: (value) => `${(value * 100).toFixed(0)}% MBER`
                    }}
                  />
                  <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                    Formula: Carbon Impact = WattTime × (1 - {mberWeight.toFixed(1)}) + MBER × {mberWeight.toFixed(1)}
                  </div>
                </div>
              </Form.Item>
              
              <Form.Item
                label="Process Description"
                name="confirm"
                rules={[{ required: false }]}
              >
                <div>
                  This action will fetch historical emissions data from WattTime and MBER for the overall date range, 
                  compute hybrid hourly averages using the selected weight, and assign the value that aligns with each certificate's timestamp.
                </div>
              </Form.Item>
            </Form>

            <Alert
              message="Hybrid Carbon Impact Calculation"
              description={`This will query WattTime and MBER data, then compute hybrid hourly averages using the formula: Impact = WattTime × ${(1-mberWeight).toFixed(1)} + MBER × ${mberWeight.toFixed(1)}. If MBER data is unavailable for a time period, it will use 0.`}
              type="info"
              showIcon
              size="small"
            />
          </>
        )}
      </Modal>

      <CertificateDetailDialog
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        certificateData={selectedCertificateData}
      />
    </>
  );
};

export default CarbonImpact; 
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import Cookies from "js-cookie";

import { Button, message, Select, DatePicker, Row, Col, Typography, Tag, Space, Card, Tooltip } from "antd";

import {
  DownloadOutlined,
  LaptopOutlined,
  ClockCircleOutlined,
  CheckSquareOutlined,
  ThunderboltFilled,
  ThunderboltOutlined,
  LinkOutlined,
} from "@ant-design/icons";

import "../assets/styles/pagination.css";
import "../assets/styles/filter.css";

import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAccount } from "../context/AccountContext";
import { useUser } from "../context/UserContext";

import { getAllAccountsAPI } from "../api/superAdminAPI";
import { getAllAccessibleDevicesAPI } from "../api/deviceAPI";
import { listAllAccountsAPI } from "../api/accountAPI";
import { getSTARsAPI, getSTARDetailsAPI } from "../api/storageAPI";
import { getNetSTARsAPI } from "../api/storageNetAPI";

import FilterTable from "../components/common/FilterTable";

import { isEmpty, logger } from "../utils";

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const STARCertificatesPage = () => {
  dayjs.extend(utc);
  dayjs.extend(timezone);
  const { currentAccount } = useAccount();
  const { userData } = useUser();

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [stars, setStars] = useState([]);
  const [aggregatedStars, setAggregatedStars] = useState([]);
  const [allStarsForSummary, setAllStarsForSummary] = useState([]);
  
  const [isFetching, setIsFetching] = useState(false);
  const [accountOptions, setAccountOptions] = useState([]);
  const [availableDevices, setAvailableDevices] = useState([]);

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [tableSorter, setTableSorter] = useState({ field: "charge_hour", order: "ascend" });

  const fetchInProgressRef = useRef(false);

  // UI mode: legacy STAR engine vs net/SOC (incl v3) STARs.
  // v3 seeds `net_star`, so defaulting to net makes seeded data visible on `/storage/stars`.
  const [engineMode, setEngineMode] = useState("net"); // "net" | "legacy"

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
    // availableDevices is already filtered to storage devices only
    const devicesToUse = availableDevices.length > 0 
      ? availableDevices 
      : (currentAccount?.detail?.devices || []).filter((device) => device.is_storage === true);

    const uniqueDevices = Array.from(
      new Map(devicesToUse.map((device) => [device.id, device])).values()
    );

    return uniqueDevices.map((device) => ({
      value: device.id,
      label: device.device_name || device.name || `Device ${device.id}`,
    }));
  }, [
    availableDevices,
    currentAccount?.detail?.devices,
  ]);

  // Build a device ID → name lookup from the full list of available devices.
  const deviceNameMap = useMemo(() => {
    const devicesToUse = availableDevices.length > 0
      ? availableDevices
      : (currentAccount?.detail?.devices || []);
    const map = {};
    devicesToUse.forEach((d) => {
      map[d.id] = d.device_name || d.name || `Device ${d.id}`;
    });
    return map;
  }, [availableDevices, currentAccount?.detail?.devices]);

  const renderTruncatedId = useCallback((value, fontSize = 12) => {
    const fullId = String(value ?? "");
    if (!fullId) return "—";
    const truncated = fullId.length > 12 ? `${fullId.substring(0, 12)}...` : fullId;
    return (
      <Tooltip title={fullId}>
        <span>
          <Text copyable={{ text: fullId }} code style={{ fontSize }}>
            {truncated}
          </Text>
        </span>
      </Tooltip>
    );
  }, []);

  const defaultFilters = {
    account_id: null,
    asset_id: null,
    date_start: null,
    date_end: null,
  };

  const [filters, setFilters] = useState(defaultFilters);

  // Default to current account if available and no filter is set
  useEffect(() => {
    // Only auto-default account filter for legacy STARs. Net STARs are primarily device-scoped.
    if (engineMode !== "legacy") return;
    if (!filters.account_id && currentAccount?.detail?.id && accountOptions.length > 0) {
      const currentAccountExists = accountOptions.some(opt => opt.value === currentAccount.detail.id);
      if (currentAccountExists) {
        logger.info(`Defaulting account filter to current account: ${currentAccount.detail.id}`);
        setFilters((prev) => ({ ...prev, account_id: currentAccount.detail.id }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount?.detail?.id, accountOptions.length, engineMode]);

  // Determine roles
  const role = userData?.userInfo?.role;
  const isAdmin = role === "ADMIN" || role === 4;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === 5;

  // Load account options for Account filter
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        if (isSuperAdmin) {
          const res = await getAllAccountsAPI();
          const list = (res?.data?.accounts || res?.data || []).map((a) => ({
            value: a.id,
            label: a.account_name || `Account ${a.id}`,
          }));
          setAccountOptions(list);
          logger.debug(`Loaded ${list.length} accounts for super admin`);
        } else {
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
            logger.warn("Failed to load accounts from API, using userData fallback", apiError);
            const list = (userData?.accounts || []).map((a) => ({
              value: a.id,
              label: a.account_name || `Account ${a.id}`,
            }));
            setAccountOptions(list);
          }
        }
      } catch (error) {
        logger.error("Failed to load accounts:", error);
        const list = (userData?.accounts || []).map((a) => ({
          value: a.id,
          label: a.account_name || `Account ${a.id}`,
        }));
        setAccountOptions(list);
      }
    };
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, userData?.accounts?.length]);

  // Fetch devices using the supported accessible devices API
  useEffect(() => {
    const fetchDevicesForAccounts = async () => {
      try {
        const response = await getAllAccessibleDevicesAPI(true);
        const allDevices = response?.data?.devices || [];
        
        logger.debug(`Loaded ${allDevices.length} accessible devices from API`);
        
        // Filter to only storage devices first
        const storageDevices = allDevices.filter((device) => device.is_storage === true);
        logger.debug(`Found ${storageDevices.length} storage devices out of ${allDevices.length} total devices`);
        
        if (filters.account_id) {
          const filteredDevices = storageDevices.filter(
            (device) => device.account_id === filters.account_id
          );
          setAvailableDevices(filteredDevices);
          logger.debug(`Filtered to ${filteredDevices.length} storage devices for account ${filters.account_id}`);
        } else {
          setAvailableDevices(storageDevices);
        }
      } catch (error) {
        logger.error("Failed to fetch accessible devices:", error);
        setAvailableDevices([]);
      }
    };

    fetchDevicesForAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.account_id]);

  // Track filter changes
  useEffect(() => {
    fetchStarsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentAccount?.detail?.id, 
    role, 
    engineMode,
    filters.account_id,
    filters.asset_id,
    filters.date_start,
    filters.date_end,
  ]);

  const fetchStarsData = async () => {
    if (!userInfo?.userID) {
      logger.warn("Cannot fetch STARs: user ID not available");
      return;
    }

    if (fetchInProgressRef.current) {
      logger.debug("STAR fetch already in progress, skipping duplicate request");
      return;
    }

    fetchInProgressRef.current = true;
    setIsFetching(true);
    try {
      // Build query parameters
      const params = {};
      
      if (filters.asset_id) {
        params.asset_id = filters.asset_id;
      }
      
      if (filters.date_start) {
        params.start_date = filters.date_start.format("YYYY-MM-DD");
      }
      
      if (filters.date_end) {
        params.end_date = filters.date_end.format("YYYY-MM-DD");
      }

      logger.info(`Fetching STARs (${engineMode}) with params:`, params);

      // Fetch STARs from API
      const response = engineMode === "legacy"
        ? await getSTARsAPI(params)
        : await getNetSTARsAPI(params);

      const rawStars = response?.data?.stars || [];
      const starsData = engineMode === "legacy"
        ? rawStars
        : rawStars.map((s) => ({
            ...s,
            // Normalize field names from net STAR responses.
            asset_id: s.asset_id ?? s.device_id,
            // Normalize the field name expected by this page/table.
            // Net STARs use `charge_timestamp`; legacy uses `charge_hour`.
            charge_hour: s.charge_timestamp,
            // Extract record IDs from allocation_json for display columns.
            scr_id: s.allocation_json?.charging_record_id || s.allocation_json?.scr_id || "",
            sdr_id: s.allocation_json?.discharging_record_id || s.allocation_json?.sdr_id || "",
            slr_id: s.allocation_json?.storage_loss_record_id || s.allocation_json?.slr_label || "",
          }));
      
      logger.debug(`Received ${starsData.length} STARs`);
      
      setStars(starsData);
      setAggregatedStars(starsData);
      
      // Calculate summary statistics
      const totalStars = starsData.length;
      const totalPreLoss = starsData.reduce((sum, s) => sum + parseFloat(s.pre_loss_mwh || 0), 0);
      const totalNet = starsData.reduce((sum, s) => sum + parseFloat(s.net_mwh || 0), 0);
      const totalLoss = starsData.reduce((sum, s) => sum + parseFloat(s.loss_mwh || 0), 0);
      const rte = totalPreLoss > 0 ? (totalNet / totalPreLoss) * 100 : 0;
      
      setAllStarsForSummary([{
        total_stars: totalStars,
        total_pre_loss_mwh: totalPreLoss,
        total_net_mwh: totalNet,
        total_loss_mwh: totalLoss,
        round_trip_efficiency: rte,
      }]);

    } catch (error) {
      logger.error("Failed to fetch STARs:", error);
      message.error(error?.message || "Failed to fetch STARs");
    } finally {
      setIsFetching(false);
      fetchInProgressRef.current = false;
    }
  };

  const handleFilterChange = (key, value) => {
    if (key === 'account_id') {
      setFilters((prev) => ({ ...prev, [key]: value, asset_id: null }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleApplyFilter = () => {
    fetchStarsData();
  };

  const handleClearFilter = async () => {
    setFilters({
      account_id: null,
      asset_id: null,
      date_start: null,
      date_end: null,
    });
    setTimeout(() => fetchStarsData(), 0);
  };

  const handleDateChange = (dates) => {
    if (!dates) {
      setFilters((prev) => ({
        ...prev,
        date_start: null,
        date_end: null,
      }));
      return;
    }

    const [start, end] = dates;
    setFilters((prev) => ({
      ...prev,
      date_start: start,
      date_end: end,
    }));
  };

  const onSelectChange = useCallback((newSelectedRowKeys, newSelectedRows) => {
    setSelectedRowKeys(newSelectedRowKeys);
    setSelectedRecords(newSelectedRows);
  }, []);

  const handleSelectAll = useCallback(async () => {
    if (aggregatedStars.length === 0) return;
    
    const allKeys = aggregatedStars.map((star) => star.id);
    const allRecords = aggregatedStars;
    onSelectChange(allKeys, allRecords);
    
    message.success(`Selected ${allKeys.length} STAR(s)`);
  }, [aggregatedStars, onSelectChange]);

  const handleViewDetails = async (starId) => {
    try {
      const response = await getSTARDetailsAPI(starId);
      logger.debug("STAR details:", response.data);
      message.info("STAR details displayed in console");
      // TODO: Open modal with details
    } catch (error) {
      message.error(error?.message || "Failed to fetch STAR details");
    }
  };

  const filterComponents = [
    <Select
      placeholder="Engine"
      value={engineMode}
      onChange={(value) => {
        setEngineMode(value);
        if (value !== "legacy") {
          setFilters((prev) => ({ ...prev, account_id: null }));
        }
        // Avoid confusing "empty page" moments when switching modes.
        setSelectedRowKeys([]);
        setSelectedRecords([]);
      }}
      style={{ width: 160 }}
      options={[
        { value: "net", label: "Net STARs" },
        { value: "legacy", label: "Legacy STARs" },
      ]}
    />,
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
      disabled={engineMode !== "legacy"}
    />,
    <Select
      placeholder="Asset/Device"
      options={deviceOptions}
      value={filters.asset_id}
      onChange={(value) => handleFilterChange("asset_id", value)}
      style={{ width: 200 }}
      suffixIcon={<LaptopOutlined />}
      allowClear
    />,
    <RangePicker
      value={filters.date_start && filters.date_end ? 
        [filters.date_start, filters.date_end] : null}
      onChange={(dates) => handleDateChange(dates)}
      allowClear={true}
      format="YYYY-MM-DD"
      placeholder={["Charge Start", "Charge End"]}
    />,
  ];

  const columns = [
    {
      title: <span style={{ color: "#80868B" }}>STAR ID</span>,
      dataIndex: "id",
      key: "id",
      sorter: (a, b) => String(a.id ?? "").localeCompare(String(b.id ?? "")),
      sortOrder: tableSorter.field === "id" ? tableSorter.order : null,
      render: (id) => renderTruncatedId(id),
      width: 150,
    },
    {
      title: <span style={{ color: "#80868B" }}>Asset</span>,
      dataIndex: "asset_id",
      key: "asset_id",
      sorter: (a, b) => {
        const nameA = deviceNameMap[a.asset_id] || `Device ${a.asset_id}`;
        const nameB = deviceNameMap[b.asset_id] || `Device ${b.asset_id}`;
        return nameA.localeCompare(nameB);
      },
      sortOrder: tableSorter.field === "asset_id" ? tableSorter.order : null,
      render: (id) => {
        const name = deviceNameMap[id] || `Device ${id}`;
        return (
          <Tooltip title={`Asset ID: ${id}`}>
            <Text style={{ fontSize: 12 }}>{name}</Text>
          </Tooltip>
        );
      },
      width: 150,
    },
    {
      title: <span style={{ color: "#80868B" }}>Charge Hour</span>,
      dataIndex: "charge_hour",
      key: "charge_hour",
      render: (hour) => dayjs(hour).format("YYYY-MM-DD HH:mm"),
      sorter: (a, b) => new Date(a.charge_hour) - new Date(b.charge_hour),
      sortOrder: tableSorter.field === "charge_hour" ? tableSorter.order : null,
      width: 180,
    },
    {
      title: <span style={{ color: "#80868B" }}>Discharge Hour</span>,
      dataIndex: "discharge_timestamp",
      key: "discharge_timestamp",
      render: (ts) => dayjs(ts).format("YYYY-MM-DD HH:mm"),
      sorter: (a, b) => new Date(a.discharge_timestamp) - new Date(b.discharge_timestamp),
      sortOrder: tableSorter.field === "discharge_timestamp" ? tableSorter.order : null,
      width: 180,
    },
    {
      title: <span style={{ color: "#80868B" }}>Time Shift</span>,
      dataIndex: "time_shift",
      key: "time_shift",
      sorter: (a, b) => {
        const shiftA = dayjs(a.discharge_timestamp).diff(dayjs(a.charge_hour), 'hours');
        const shiftB = dayjs(b.discharge_timestamp).diff(dayjs(b.charge_hour), 'hours');
        const safeA = Number.isFinite(shiftA) ? shiftA : 0;
        const safeB = Number.isFinite(shiftB) ? shiftB : 0;
        return safeA - safeB;
      },
      sortOrder: tableSorter.field === "time_shift" ? tableSorter.order : null,
      render: (_, record) => {
        const hours = dayjs(record.discharge_timestamp).diff(dayjs(record.charge_hour), 'hours');
        const safeHours = Number.isFinite(hours) ? hours : 0;
        return <Tag color="blue">{safeHours}h</Tag>;
      },
      width: 100,
    },
    {
      title: <span style={{ color: "#80868B" }}>Charging Energy</span>,
      dataIndex: "pre_loss_mwh",
      key: "pre_loss_mwh",
      render: (mwh) => (
        <Space style={{ whiteSpace: "nowrap", minWidth: 120 }}>
          <Text strong>{parseFloat(mwh).toFixed(6)}</Text>
          <Text type="secondary">MWh</Text>
        </Space>
      ),
      sorter: (a, b) => parseFloat(a.pre_loss_mwh) - parseFloat(b.pre_loss_mwh),
      sortOrder: tableSorter.field === "pre_loss_mwh" ? tableSorter.order : null,
      width: 180,
    },
    {
      title: <span style={{ color: "#80868B" }}>Loss Energy</span>,
      dataIndex: "loss_mwh",
      key: "loss_mwh",
      sorter: (a, b) => {
        const lossA = parseFloat(a.loss_mwh);
        const lossB = parseFloat(b.loss_mwh);
        const safeA = Number.isFinite(lossA) ? lossA : 0;
        const safeB = Number.isFinite(lossB) ? lossB : 0;
        return safeA - safeB;
      },
      sortOrder: tableSorter.field === "loss_mwh" ? tableSorter.order : null,
      render: (mwh) => (
        <Space style={{ whiteSpace: "nowrap", minWidth: 120 }}>
          <Text type="warning">{parseFloat(mwh).toFixed(6)}</Text>
          <Text type="secondary">MWh</Text>
        </Space>
      ),
      width: 180,
    },
    {
      title: <span style={{ color: "#80868B" }}>Discharge Energy</span>,
      dataIndex: "net_mwh",
      key: "net_mwh",
      render: (mwh) => (
        <Space style={{ whiteSpace: "nowrap", minWidth: 120 }}>
          <Text strong style={{ color: '#52c41a' }}>{parseFloat(mwh).toFixed(6)}</Text>
          <Text type="secondary">MWh</Text>
        </Space>
      ),
      sorter: (a, b) => parseFloat(a.net_mwh) - parseFloat(b.net_mwh),
      sortOrder: tableSorter.field === "net_mwh" ? tableSorter.order : null,
      width: 180,
    },
    ...(engineMode === "net"
      ? [
          {
            title: <span style={{ color: "#80868B" }}>SCR ID</span>,
            dataIndex: "scr_id",
            key: "scr_id",
            render: (val) => renderTruncatedId(val),
            width: 150,
          },
          {
            title: <span style={{ color: "#80868B" }}>SDR ID</span>,
            dataIndex: "sdr_id",
            key: "sdr_id",
            render: (val) => renderTruncatedId(val),
            width: 150,
          },
          {
            title: <span style={{ color: "#80868B" }}>SLR ID</span>,
            dataIndex: "slr_id",
            key: "slr_id",
            render: (val) => renderTruncatedId(val),
            width: 150,
          },
        ]
      : [
          {
            title: "",
            render: (_, record) => (
              <Button
                style={{ color: "#043DDC", fontWeight: "600" }}
                type="link"
                onClick={() => handleViewDetails(record.id)}
              >
                Details
              </Button>
            ),
            width: 100,
          },
        ]),
  ];

  const sortedStars = useMemo(() => {
    const source = aggregatedStars.length > 0 ? aggregatedStars : stars;
    const copy = [...(source || [])];
    const field = tableSorter.field;
    const order = tableSorter.order === "descend" ? -1 : 1;

    const getComparable = (item) => {
      if (field === "charge_hour" || field === "discharge_timestamp") {
        const d = dayjs(item[field]);
        return d.isValid() ? d.valueOf() : 0;
      }
      if (field === "pre_loss_mwh" || field === "net_mwh" || field === "loss_mwh") {
        return Number(item[field] || 0);
      }
      if (field === "time_shift") {
        const hours = dayjs(item.discharge_timestamp).diff(dayjs(item.charge_hour), "hours");
        return Number.isFinite(hours) ? hours : 0;
      }
      return String(item[field] ?? "");
    };

    copy.sort((a, b) => {
      const va = getComparable(a);
      const vb = getComparable(b);
      if (typeof va === "number" && typeof vb === "number") {
        return order === 1 ? (va - vb) : (vb - va);
      }
      const cmp = String(va).localeCompare(String(vb));
      return order === 1 ? cmp : -cmp;
    });

    return copy;
  }, [aggregatedStars, stars, tableSorter]);

  const isCertificatesSelected = selectedRowKeys.length > 0;
  const hasCertificatesToSelect = allStarsForSummary.length > 0 && 
    (allStarsForSummary[0]?.total_stars || 0) > 0;

  const btnList = useMemo(
    () => {
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
          icon: <LinkOutlined />,
          btnType: "primary",
          type: "match",
          disabled: !isCertificatesSelected || engineMode !== "legacy",
          style: { height: "40px" },
          name: "Match with GC",
          handle: () => message.info("GC matching feature coming soon"),
        },
        {
          icon: <DownloadOutlined />,
          btnType: "default",
          type: "export",
          disabled: !isCertificatesSelected || engineMode !== "legacy",
          style: { height: "40px" },
          name: "Export",
          handle: () => message.info("Export feature coming soon"),
        },
      ];

      return buttons;
    },
    [isCertificatesSelected, hasCertificatesToSelect, handleSelectAll, engineMode]
  );

  const handleTableChange = (_pagination, _filters, sorter) => {
    if (!sorter) return;
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const nextField = s?.field || s?.columnKey;
    if (nextField && s?.order) {
      setTableSorter({ field: nextField, order: s.order });
    }
  };

  const tableTitle = useMemo(() => {
    if (filters.account_id) {
      const found = accountOptions.find((a) => a.value === filters.account_id);
      return found?.label || 'Selected Account';
    }
    return aggregatedStars.length > 0 ? 'All Accessible Accounts' : 'Storage Time Allocation Records';
  }, [filters.account_id, accountOptions, aggregatedStars.length]);

  const getEfficiencyColor = (efficiency) => {
    const value = Number(efficiency || 0);
    if (value >= 85) return '#52c41a'; // green
    if (value >= 70) return '#faad14'; // orange
    return '#ff4d4f'; // red
  };

  // Summary component
  const SummaryCards = () => {
    if (!allStarsForSummary || allStarsForSummary.length === 0) return null;

    const summary = allStarsForSummary[0];
    const totalStars = summary.total_stars || 0;
    const totalPreLoss = summary.total_pre_loss_mwh || 0;
    const totalNet = summary.total_net_mwh || 0;
    const rte = summary.round_trip_efficiency || 0;

    const statCardStyle = {
      borderRadius: 12,
      border: '1px solid rgba(0, 0, 0, 0.08)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    };

    const cardBodyStyle = {
      display: "flex",
      alignItems: "center",
      gap: 16,
    };

    const renderCardValue = (value, suffix) => {
      if (isFetching) return "...";
      return suffix ? `${value}${suffix}` : value;
    };

    return (
      <>
        <Col span={6}>
          <Card style={statCardStyle} styles={{ body: cardBodyStyle }}>
            <ThunderboltFilled style={{ fontSize: 40, color: "#1890ff" }} />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 150 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#3c4043" }}>
                {renderCardValue(totalStars)}
              </h3>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: "#202224" }}>
                Total STARs
              </p>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card style={statCardStyle} styles={{ body: cardBodyStyle }}>
            <ThunderboltOutlined style={{ fontSize: 40, color: "#722ed1" }} />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 150 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#3c4043" }}>
                {renderCardValue(totalPreLoss.toFixed(3))}
              </h3>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: "#202224" }}>
                Charging Energy (MWh)
              </p>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card style={statCardStyle} styles={{ body: cardBodyStyle }}>
            <ThunderboltOutlined style={{ fontSize: 40, color: "#52c41a" }} />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 150 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#3c4043" }}>
                {renderCardValue(totalNet.toFixed(3))}
              </h3>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: "#202224" }}>
                Discharge Energy (MWh)
              </p>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card style={statCardStyle} styles={{ body: cardBodyStyle }}>
            <ThunderboltOutlined style={{ fontSize: 40, color: getEfficiencyColor(rte) }} />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 150 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#3c4043" }}>
                {renderCardValue(rte.toFixed(1), "%")}
              </h3>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: "#202224" }}>
                Round-Trip Efficiency
              </p>
            </div>
          </Card>
        </Col>
      </>
    );
  };

  return (
    <>
      <div style={{ 
        padding: "24px", 
        backgroundColor: "#fff", 
        borderBottom: "1px solid #E8EAED",
        marginBottom: "24px" 
      }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0, color: "#202124" }}>
              <ThunderboltFilled /> Storage Time Allocation Records (STARs)
            </Title>
            <Text type="secondary">
              View issued STARs with charge/discharge hour pairing and energy conservation tracking
            </Text>
          </Col>
        </Row>
      </div>

      <FilterTable
        summary={<SummaryCards />}
        tableName={tableTitle}
        columns={columns}
        filterComponents={filterComponents}
        tableActionBtns={btnList}
        defaultFilters={defaultFilters}
        filters={filters}
        dataSource={sortedStars}
        fetchTableData={fetchStarsData}
        onRowsSelected={onSelectChange}
        handleApplyFilter={handleApplyFilter}
        handleClearFilter={handleClearFilter}
        rowKey="id"
        selectedRowKeys={selectedRowKeys}
        selectedRecords={selectedRecords}
        onTableChange={handleTableChange}
      />
    </>
  );
};

export default STARCertificatesPage;

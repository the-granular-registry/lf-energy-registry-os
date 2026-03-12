import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import Cookies from "js-cookie";

import { Button, message, Select, DatePicker, Row, Col, Typography, Tag, Space, Card, Statistic } from "antd";

import {
  DownloadOutlined,
  LaptopOutlined,
  DatabaseOutlined,
  FileTextOutlined,
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
import { getStorageRecordsAPI } from "../api/storageAPI";

import FilterTable from "../components/common/FilterTable";

import { isEmpty, logger } from "../utils";

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const StorageRecordsPage = () => {
  dayjs.extend(utc);
  dayjs.extend(timezone);
  const { currentAccount } = useAccount();
  const { userData } = useUser();

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [allRecordsForSummary, setAllRecordsForSummary] = useState([]);
  
  const [isFetching, setIsFetching] = useState(false);
  const [accountOptions, setAccountOptions] = useState([]);
  const [availableDevices, setAvailableDevices] = useState([]);

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [tableSorter, setTableSorter] = useState({ field: "timestamp", order: "ascend" });

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
    // availableDevices is already filtered to storage devices only
    const devicesToUse = availableDevices.length > 0 
      ? availableDevices 
      : (currentAccount?.detail?.devices || []).filter((device) => device.is_storage === true);

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
  ]);

  const deviceNameMap = useMemo(() => {
    const devicesToUse = availableDevices.length > 0
      ? availableDevices
      : (currentAccount?.detail?.devices || []);
    const map = {};
    devicesToUse.forEach((d) => {
      map[d.id] = d.device_name || `Device ${d.id}`;
    });
    return map;
  }, [availableDevices, currentAccount?.detail?.devices]);

  const defaultFilters = {
    account_id: null,
    asset_id: null,
    date_start: null,
    date_end: null,
  };

  const [filters, setFilters] = useState(defaultFilters);

  // Net-only page: keep account filter disabled/unused.

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
    fetchRecordsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentAccount?.detail?.id, 
    role, 
    filters.account_id,
    filters.asset_id,
    filters.date_start,
    filters.date_end,
  ]);

  const fetchRecordsData = async () => {
    if (!userInfo?.userID) {
      logger.warn("Cannot fetch storage records: user ID not available");
      return;
    }

    if (fetchInProgressRef.current) {
      logger.debug("Storage records fetch already in progress, skipping duplicate request");
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

      logger.info(`Fetching storage records with params:`, params);

      // Fetch records from API
      const response = await getStorageRecordsAPI(params);
      const recordsData = response?.data?.records || [];
      
      logger.debug(`Received ${recordsData.length} storage records`);
      
      setRecords(recordsData);
      
      // Calculate summary statistics
      const totalRecords = recordsData.length;
      const scrCount = recordsData.filter(r => r.record_type === "SCR").length;
      const sdrCount = recordsData.filter(r => r.record_type === "SDR").length;
      const slrCount = recordsData.filter(r => r.record_type === "SLR").length;
      const totalEnergy = recordsData.reduce((sum, r) => sum + parseFloat(r.energy || 0), 0);
      
      setAllRecordsForSummary([{
        total_records: totalRecords,
        scr_count: scrCount,
        sdr_count: sdrCount,
        slr_count: slrCount,
        total_energy: totalEnergy,
      }]);

    } catch (error) {
      logger.error("Failed to fetch storage records:", error);
      message.error(error?.message || "Failed to fetch storage records");
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
    fetchRecordsData();
  };

  const handleClearFilter = async () => {
    setFilters({
      account_id: null,
      asset_id: null,
      date_start: null,
      date_end: null,
    });
    setTimeout(() => fetchRecordsData(), 0);
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
    if (records.length === 0) return;
    
    const allKeys = records.map((record) => record.id);
    const allRecords = records;
    onSelectChange(allKeys, allRecords);
    
    message.success(`Selected ${allKeys.length} record(s)`);
  }, [records, onSelectChange]);

  const filterComponents = [
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
      disabled={true}
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
      placeholder={["Start Date", "End Date"]}
    />,
  ];

  const columns = [
    {
      title: <span style={{ color: "#80868B" }}>ID</span>,
      dataIndex: "id",
      key: "id",
      render: (id) => (
        <Text copyable={{ text: id }} code style={{ fontSize: 12 }}>
          {id?.substring(0, 12)}...
        </Text>
      ),
      width: 150,
    },
    {
      title: <span style={{ color: "#80868B" }}>Record Type</span>,
      dataIndex: "record_type",
      key: "record_type",
      render: (type) => {
        let color = "blue";
        if (type === "SCR") color = "green";
        if (type === "SDR") color = "orange";
        if (type === "SLR") color = "red";
        return <Tag color={color}>{type}</Tag>;
      },
      filters: [
        { text: "SCR", value: "SCR" },
        { text: "SDR", value: "SDR" },
        { text: "SLR", value: "SLR" },
      ],
      onFilter: (value, record) => record.record_type === value,
      width: 120,
    },
    {
      title: <span style={{ color: "#80868B" }}>Energy (MWh)</span>,
      dataIndex: "energy",
      key: "energy",
      render: (energy) => (
        <Space>
          <Text strong>{parseFloat(energy).toFixed(6)}</Text>
          <Text type="secondary">MWh</Text>
        </Space>
      ),
      sorter: (a, b) => parseFloat(a.energy) - parseFloat(b.energy),
      sortOrder: tableSorter.field === "energy" ? tableSorter.order : null,
      width: 180,
    },
    {
      title: <span style={{ color: "#80868B" }}>STAR ID</span>,
      dataIndex: "star_id",
      key: "star_id",
      render: (starId) => starId ? (
        <Text copyable={{ text: starId }} code style={{ fontSize: 11 }}>
          {starId?.substring(0, 12)}...
        </Text>
      ) : (
        <Text type="secondary">—</Text>
      ),
      width: 150,
    },
    {
      title: <span style={{ color: "#80868B" }}>Status</span>,
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "Active" ? "green" : "default"}>{status}</Tag>
      ),
      width: 100,
    },
    {
      title: <span style={{ color: "#80868B" }}>Asset</span>,
      dataIndex: "asset_id",
      key: "asset_id",
      render: (id) => (
        <Text style={{ fontSize: 12 }}>
          {deviceNameMap[id] || `Device ${id}`}
        </Text>
      ),
      width: 160,
    },
    {
      title: <span style={{ color: "#80868B" }}>Timestamp</span>,
      dataIndex: "timestamp",
      key: "timestamp",
      render: (ts) => dayjs(ts).format("YYYY-MM-DD HH:mm"),
      sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      sortOrder: tableSorter.field === "timestamp" ? tableSorter.order : null,
      width: 180,
    },
  ];

  const handleTableChange = (pagination, filters, sorter) => {
    if (sorter.field) {
      setTableSorter({ field: sorter.field, order: sorter.order });
    }
  };

  const sortedRecords = useMemo(() => {
    if (!tableSorter.field || !tableSorter.order) {
      return records;
    }

    const sorted = [...records].sort((a, b) => {
      let aVal = a[tableSorter.field];
      let bVal = b[tableSorter.field];

      if (tableSorter.field === "timestamp") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else if (tableSorter.field === "energy") {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }

      if (tableSorter.order === "ascend") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return sorted;
  }, [records, tableSorter]);

  const btnList = [];

  const tableTitle = `Storage Records (${sortedRecords.length} total)`;

  const SummaryCards = () => {
    const summary = allRecordsForSummary[0] || {
      total_records: 0,
      scr_count: 0,
      sdr_count: 0,
      slr_count: 0,
      total_energy: 0,
    };

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

    const renderValue = (value) => (isFetching ? "..." : value);

    return (
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card style={statCardStyle} styles={{ body: cardBodyStyle }}>
            <DatabaseOutlined style={{ fontSize: 40, color: "#1890ff" }} />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 150 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#3c4043" }}>
                {renderValue(summary.total_records)}
              </h3>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: "#202224" }}>
                Total Records
              </p>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card style={statCardStyle} styles={{ body: cardBodyStyle }}>
            <FileTextOutlined style={{ fontSize: 40, color: "#52c41a" }} />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 150 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#3c4043" }}>
                {renderValue(summary.scr_count)}
              </h3>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: "#202224" }}>
                SCRs
              </p>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card style={statCardStyle} styles={{ body: cardBodyStyle }}>
            <FileTextOutlined style={{ fontSize: 40, color: "#fa8c16" }} />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 150 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#3c4043" }}>
                {renderValue(summary.sdr_count)}
              </h3>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: "#202224" }}>
                SDRs
              </p>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card style={statCardStyle} styles={{ body: cardBodyStyle }}>
            <FileTextOutlined style={{ fontSize: 40, color: "#f5222d" }} />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 150 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#3c4043" }}>
                {renderValue(summary.slr_count)}
              </h3>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: "#202224" }}>
                SLRs
              </p>
            </div>
          </Card>
        </Col>
      </Row>
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
              <DatabaseOutlined /> Storage Records
            </Title>
            <Text type="secondary">
              View SCRs (Charging), SDRs (Discharging), and SLRs (Loss) in unified table
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
        dataSource={sortedRecords}
        fetchTableData={fetchRecordsData}
        onRowsSelected={onSelectChange}
        handleApplyFilter={handleApplyFilter}
        handleClearFilter={handleClearFilter}
        selectedRowKeys={selectedRowKeys}
        selectedRecords={selectedRecords}
        onTableChange={handleTableChange}
      />
    </>
  );
};

export default StorageRecordsPage;



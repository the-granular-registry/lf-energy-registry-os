import React, { useState, useMemo, useEffect, useRef } from "react";

import { Layout, Button, Col, Space, Input, Select, message, Popconfirm, Spin, Typography, Tag, Modal } from "antd";

const { Text } = Typography;

import {
  AppstoreOutlined,
  SwapOutlined,
  CloseCircleOutlined,
  LaptopOutlined,
  ThunderboltOutlined,
  PlusCircleOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  BankOutlined,
} from "@ant-design/icons";

import "../../assets/styles/pagination.css";
import "../../assets/styles/filter.css";

import { useSelector, useDispatch } from "react-redux";
import { useAccount } from "../../context/AccountContext.js";
import { useNavigate } from "react-router-dom";

import DeviceRegisterDialog from "./DeviceRegisterForm";
import DeviceUploadDialog from "./DeviceUploadDataForm";
import DeviceEditDialog from "./DeviceEditDialog";
import Summary from "./Summary";
import DeviceMeasurements from "./DeviceMeasurements";

import FilterTable from "../common/FilterTable";
import { deleteDevice } from "../../store/device/deviceThunk";
import { getAccountDetails } from "../../store/account/accountThunk";
import { getAllAccessibleDevicesAPI } from "../../api/deviceAPI";
import { useUser } from "../../context/UserContext";
import { logger } from "../../utils";

const { Option } = Select;
const { Search } = Input;

import { DEVICE_TECHNOLOGY_TYPE } from "../../enum";

const Device = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { userData } = useUser();
  const userInfo = userData?.userInfo;
  const { currentAccount, saveAccountDetail } = useAccount();
  
  const [allAccessibleDevices, setAllAccessibleDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  
  const isAdmin =
    userInfo?.role === 'ADMIN' ||
    userInfo?.role === 'SUPER_ADMIN' ||
    userInfo?.role === 4 ||
    userInfo?.role === 5;
  const isSuperAdmin = userInfo?.role === 'SUPER_ADMIN' || userInfo?.role === 5;
  
  // Use accessible devices for ALL users - the backend filters by user access
  // This ensures users only see devices from accounts they have access to
  // Memoize to prevent unnecessary re-renders and effect triggers
  const devices = useMemo(() => {
    return allAccessibleDevices.filter(device => !device.is_deleted);
  }, [allAccessibleDevices]);

  const interactAllowed =
    userInfo?.role !== "TRADING_USER" && userInfo?.role !== "AUDIT_USER";

  const defaultFilters = {
    device_id: null,
    technology_type: null,
  };

  const [filters, setFilters] = useState({});
  const [filteredDevices, setFiltersDevices] = useState(devices);
  const [searchKey, setSearchKey] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);

  const deviceRegisterDialogRef = useRef();
  const deviceUploadDialogRef = useRef();
  const deviceEditDialogRef = useRef();

  const deviceOptions = useMemo(
    () =>
      devices.map((device) => ({
        value: device.id,
        label:
          `${device.device_name} (${device.local_device_identifier})` ||
          `Device (${device.local_device_identifier})`,
      })),
    [devices]
  );

  // Function to fetch all accessible devices (filtered by backend based on user access)
  const fetchAllAccessibleDevices = async () => {
    setLoadingDevices(true);
    try {
      const response = await getAllAccessibleDevicesAPI(true); // Include account info
      const devices = response.data?.devices || [];
      setAllAccessibleDevices(devices);
    } catch (error) {
      logger.error("Failed to fetch accessible devices:", error);
      message.error("Failed to load devices");
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    // Don't do anything if userInfo is not loaded yet
    if (!userInfo) {
      return;
    }

    if (!interactAllowed) {
      navigate("/certificates");
      return;
    }

    // Fetch all accessible devices (backend filters based on user role and account access)
    fetchAllAccessibleDevices();

    // Listen for external refresh requests (e.g., after create)
    const refreshHandler = () => fetchAllAccessibleDevices();
    window.addEventListener('devices:refresh', refreshHandler);

    setFiltersDevices(devices);
    return () => window.removeEventListener('devices:refresh', refreshHandler);
  }, [currentAccount, navigate, userInfo]);

  useEffect(() => {
    setFiltersDevices(devices);
  }, [devices]);

  const pageSize = 10;
  const totalPages = Math.ceil(devices?.length / pageSize);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilter = () => {
    // Apply the filter logic here
    const filteredDevices = devices.filter((device) => {
      // Check each filter
      const matchedFilters =
        (filters.device_id ? device.id === filters.device_id : true) &&
        (filters.technology_type
          ? device.technology_type === filters.technology_type.toLowerCase()
          : true);

      const searchFilter = !!searchKey
        ? device.device_name.toLowerCase().includes(searchKey.toLowerCase()) ||
          device.local_device_identifier
            .toLowerCase()
            .includes(searchKey.toLowerCase())
        : true;

      return matchedFilters && searchFilter;
    });

    setFiltersDevices(filteredDevices);
  };

  const handleClearFilter = async () => {
    setFilters({});
    setSearchKey("");
    setFiltersDevices(devices);
  };

  const openDialog = () => {
    deviceRegisterDialogRef.current.openDialog();
  };

  const closeDialog = () => {
    deviceRegisterDialogRef.current.closeDialog(); // Close the dialog from the parent component
  };

  const handleEditDevice = (device) => {
    deviceEditDialogRef.current.openDialog(device);
  };

  const handleDeleteDevice = async (device) => {
    try {
      await dispatch(deleteDevice({ deviceId: device.id })).unwrap();
      
      if (isAdmin) {
        await fetchAllAccessibleDevices();
      } else if (currentAccount?.detail?.id) {
        // Refresh account details to get updated device list
        const account = await dispatch(
          getAccountDetails(currentAccount.detail.id)
        ).unwrap();
        saveAccountDetail(account);
      }
      
      message.success("Delete was successful");
    } catch (error) {
      logger.error("Delete failed:", error);
      message.error("Failed to delete device. Please try again.");
    }
  };

  const handleBulkEdit = () => {
    if (selectedRecords.length !== 1) {
      message.warning("Please select exactly one device to edit");
      return;
    }
    handleEditDevice(selectedRecords[0]);
  };

  const handleBulkDelete = async () => {
    if (selectedRecords.length !== 1) {
      message.warning("Please select exactly one device to delete");
      return;
    }
    await handleDeleteDevice(selectedRecords[0]);
    // Clear selection after delete
    setSelectedRowKeys([]);
    setSelectedRecords([]);
  };

  const onRowsSelected = (keys, rows) => {
    setSelectedRowKeys(keys);
    setSelectedRecords(rows);
  };

  const columns = [
    // Add account columns for admin users
    ...(isAdmin ? [{
      title: <span style={{ color: "#80868B" }}>Account Name</span>,
      dataIndex: "account_name",
      key: "account_name",
      render: (accountName) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BankOutlined style={{ color: '#1890ff' }} />
          <span style={{ color: '#1890ff', fontWeight: 500 }}>{accountName || 'Unknown Account'}</span>
        </div>
      ),
      sorter: (a, b) => (a.account_name || '').localeCompare(b.account_name || ''),
      width: 160,
    }, {
      title: <span style={{ color: "#80868B" }}>Account ID</span>,
      dataIndex: "account_id",
      key: "account_id",
      render: (accountId) => (
        <Tag color="blue" style={{ fontWeight: 500 }}>#{accountId}</Tag>
      ),
      sorter: (a, b) => (a.account_id || 0) - (b.account_id || 0),
      width: 100,
    }] : []),
    {
      title: <span style={{ color: "#80868B" }}>Device name & ID</span>,
      dataIndex: "device_name",
      key: "device_name",
      render: (deviceName, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{deviceName}</div>
          {record.id && (
            <Text type="secondary" style={{ fontSize: "12px" }}>ID: {record.id}</Text>
          )}
        </div>
      ),
      sorter: (a, b) => a.device_name.localeCompare(b.device_name),
    },
    {
      title: <span style={{ color: "#80868B" }}>Technology type</span>,
      dataIndex: "technology_type",
      key: "technology_type",
      render: (type) => {
        const upperKey = type?.toUpperCase().replace(/ /g, "_");
        return DEVICE_TECHNOLOGY_TYPE[upperKey] || type;
      },
      sorter: (a, b) => {
        // Sorting based on the raw value; adjust if needed
        return a.technology_type?.localeCompare(b.technology_type) || 0;
      },
    },
    {
      title: <span style={{ color: "#80868B" }}>Capacity (MW)</span>,
      dataIndex: "capacity",
      key: "capacity",
      render: (text) => <span style={{ color: "#5F6368" }}>{(text / 1000).toFixed(2)} MW</span>,
      sorter: (a, b) => a.capacity - b.capacity,
    },
    {
      title: <span style={{ color: "#80868B" }}>Grid Zone</span>,
      dataIndex: "project_grid_zone",
      key: "project_grid_zone",
      render: (text) => <span style={{ color: "#5F6368" }}>{text || 'N/A'}</span>,
    },
  ];

  const filterComponents = [
    <Search
      placeholder="Search for device..."
      onSearch={(value) => handleApplyFilter(value)}
      value={searchKey}
      onChange={(e) => setSearchKey(e.target.value)}
      enterButton={<SearchOutlined />}
      size="medium"
    />,
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
    /* Technology Type filter */
    <Select
      placeholder="Technology Type"
      value={filters.technology_type}
      onChange={(value) => handleFilterChange("technology_type", value)}
      style={{ width: 150 }}
      suffixIcon={<ThunderboltOutlined />}
      allowClear
    >
      {Object.entries(DEVICE_TECHNOLOGY_TYPE).map(([key, value]) => (
        <Option key={key} value={key.toLocaleLowerCase()}>
          {value}
        </Option>
      ))}
    </Select>,
  ];

  const btnList = [
    {
      icon: <PlusCircleOutlined />,
      btnType: "primary",
      type: "add",
      style: { height: "40px" },
      name: "Add Device",
      handle: () => openDialog(),
      disabled: false,
    },
    {
      icon: <EditOutlined />,
      btnType: "default",
      style: { height: "40px" },
      name: "Edit",
      handle: () => handleBulkEdit(),
      disabled: selectedRecords.length !== 1,
    },
    {
      icon: <DeleteOutlined />,
      btnType: "default",
      style: { height: "40px", color: selectedRecords.length === 1 ? "#F04438" : undefined },
      name: "Delete",
      handle: () => {
        if (selectedRecords.length !== 1) {
          message.warning("Please select exactly one device to delete");
          return;
        }
        Modal.confirm({
          title: "Delete Device",
          content: `Are you sure you want to delete "${selectedRecords[0].device_name}"?`,
          okText: "Yes",
          cancelText: "No",
          okType: "danger",
          onOk: () => handleBulkDelete(),
        });
      },
      disabled: selectedRecords.length !== 1,
    },
  ];

  // Show loading state if userInfo is not available yet
  if (!userInfo) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">Loading device management...</Text>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Layout>
        <div style={{ padding: '16px 16px 0 16px' }}>
          <Typography.Title level={3} style={{ margin: 0 }}>Device management</Typography.Title>
        </div>
        <FilterTable
          summary={<Summary />}
          tableName="Device management"
          columns={columns}
          filterComponents={filterComponents}
          tableActionBtns={btnList}
          defaultFilters={defaultFilters}
          filters={filters}
          dataSource={filteredDevices}
          handleClearFilter={handleClearFilter}
          handleApplyFilter={handleApplyFilter}
          isShowSelection={true}
          onRowsSelected={onRowsSelected}
          selectedRowKeys={selectedRowKeys}
          selectedRecords={selectedRecords}
          rowKey="id"
        />
      </Layout>

      <DeviceRegisterDialog ref={deviceRegisterDialogRef} />
      <DeviceUploadDialog ref={deviceUploadDialogRef} />
      <DeviceEditDialog ref={deviceEditDialogRef} />
    </>
  );
};

export default Device;

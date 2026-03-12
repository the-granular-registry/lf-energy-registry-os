import React, { useState, useEffect } from "react";
import { Card, Table, Tag, Typography, Spin, message, Row, Col, Statistic, Pagination, Button, Select, Space, Alert, Modal, Progress, Input, Switch, Checkbox } from "antd";
import Plot from 'react-plotly.js';
import { 
  ThunderboltOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  CloseCircleOutlined,
  AlertOutlined,
  EyeOutlined,
  CalendarOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  UndoOutlined,
  EyeInvisibleOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { 
  getDeviceMeasurementsAPI, 
  getMeasurementDetailsAPI, 
  softDeleteMeasurementReportAPI, 
  restoreMeasurementReportAPI, 
  getDeletedMeasurementReportsAPI,
  getMeasurementReportCertificateCountAPI 
} from "../../api/measurementAPI";
import baseAPI from "../../api/baseAPI";
import { useUser } from "../../context/UserContext";
import { logger } from "../../utils";

const { Title, Text } = Typography;
const { Option } = Select;

/**
 * DeviceMeasurements Component
 * 
 * Displays device measurement reports with approval status and energy data.
 * This is separate from file uploads - it shows processed measurement data.
 */
const DeviceMeasurements = ({ selectedDeviceId, isSuperAdmin = false }) => {
  const { userData } = useUser();
  const userInfo = userData?.userInfo;
  
  const [loading, setLoading] = useState(false);
  const [measurements, setMeasurements] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedMeasurements, setDeletedMeasurements] = useState([]);

  // Summary statistics
  const [summary, setSummary] = useState({
    totalMeasurements: 0,
    approvedMeasurements: 0,
    pendingMeasurements: 0,
    totalEnergyMWh: 0
  });

  // Modal states
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState(null);
  const [measurementDetails, setMeasurementDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Soft delete modal states
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [measurementToDelete, setMeasurementToDelete] = useState(null);
  const [deletionReason, setDeletionReason] = useState("");
  const [deletingMeasurement, setDeletingMeasurement] = useState(false);
  
  // Cascade delete states
  const [certificateCount, setCertificateCount] = useState(0);
  const [cascadeToCertificates, setCascadeToCertificates] = useState(true);
  const [loadingCertificateCount, setLoadingCertificateCount] = useState(false);

  useEffect(() => {
    if (selectedDeviceId && userInfo) {
      if (showDeleted && isSuperAdmin) {
        fetchDeletedMeasurements();
      } else {
        fetchDeviceMeasurements();
      }
    } else {
      // Clear data when no device is selected
      setMeasurements([]);
      setDeletedMeasurements([]);
      setSummary({
        totalMeasurements: 0,
        approvedMeasurements: 0,
        pendingMeasurements: 0,
        totalEnergyMWh: 0
      });
    }
  }, [selectedDeviceId, pagination.page, statusFilter, userInfo, showDeleted]);

  const fetchDeviceMeasurements = async () => {
    if (!selectedDeviceId || !userInfo) {
      return;
    }
    
    setLoading(true);
    try {
      const params = {
        status: statusFilter,
        page: pagination.page,
        limit: pagination.limit
      };

      const response = await getDeviceMeasurementsAPI(selectedDeviceId, params);
      const data = response.data;

      setMeasurements(data.measurements || []);
      
      // Update pagination based on returned data
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || data.measurements?.length || 0
      }));

      // Calculate summary statistics
      calculateSummary(data.measurements || []);

    } catch (error) {
      logger.error("Failed to fetch device measurements:", error);
      message.error("Failed to load device measurements");
      setMeasurements([]);
      setSummary({
        totalMeasurements: 0,
        approvedMeasurements: 0,
        pendingMeasurements: 0,
        totalEnergyMWh: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (measurements) => {
    const totalMeasurements = measurements.length;
    const approvedMeasurements = measurements.filter(m => m.status === 'approved').length;
    const pendingMeasurements = measurements.filter(m => m.status === 'pending').length;
    const totalEnergyMWh = measurements.reduce((total, measurement) => {
      return total + ((measurement.interval_usage_wh || 0) / 1_000_000);
    }, 0);

    setSummary({
      totalMeasurements,
      approvedMeasurements,
      pendingMeasurements,
      totalEnergyMWh: Number(totalEnergyMWh.toFixed(3))
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      case 'rejected':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'submitted':
        return <AlertOutlined style={{ color: '#1890ff' }} />;
      default:
        return <AlertOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      case 'submitted':
        return 'processing';
      default:
        return 'default';
    }
  };

  const formatEnergy = (wh) => {
    if (!wh) return '0 MWh';
    const mwh = (Number(wh) || 0) / 1_000_000;
    return `${mwh.toFixed(6)} MWh`;
  };

  const columns = [
    {
      title: 'Measurement ID',
      dataIndex: 'id',
      key: 'id',
      render: (id) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ThunderboltOutlined style={{ color: '#1890ff' }} />
          <Text strong>#{id}</Text>
        </div>
      ),
      width: 120,
    },
    {
      title: 'Device ID',
      dataIndex: 'device_id',
      key: 'device_id',
      render: (deviceId) => (
        <Tag color="purple" style={{ fontWeight: 500 }}>Device #{deviceId}</Tag>
      ),
      width: 120,
    },
    {
      title: 'Account ID',
      dataIndex: 'account_id',
      key: 'account_id',
      render: (accountId) => (
        <Tag color="blue" style={{ fontWeight: 500 }}>Acct #{accountId || 'N/A'}</Tag>
      ),
      width: 110,
    },
    {
      title: 'Time Period',
      key: 'time_period',
      render: (_, record) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <CalendarOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
            <Text strong style={{ fontSize: '13px' }}>
              {dayjs(record.interval_start_datetime).format('MMM DD, YYYY HH:mm')}
            </Text>
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            to {dayjs(record.interval_end_datetime).format('MMM DD, YYYY HH:mm')}
          </Text>
          <div style={{ marginTop: '4px' }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Duration: {dayjs(record.interval_end_datetime).diff(dayjs(record.interval_start_datetime), 'hour')}h
            </Text>
          </div>
        </div>
      ),
      width: 180,
    },
    {
      title: 'Energy Usage',
      dataIndex: 'interval_usage_wh',
      key: 'energy',
      render: (usage, record) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: '14px' }}>
            {formatEnergy(usage)}
          </div>
          <Tag size="small" color={record.gross_net_indicator === 'net' ? 'green' : 'blue'}>
            {record.gross_net_indicator?.toUpperCase() || 'NET'}
          </Tag>
        </div>
      ),
      sorter: (a, b) => (a.interval_usage_wh || 0) - (b.interval_usage_wh || 0),
      width: 130,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag icon={getStatusIcon(status)} color={getStatusColor(status)}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Tag>
      ),
      filters: [
        { text: 'Approved', value: 'approved' },
        { text: 'Pending', value: 'pending' },
        { text: 'Rejected', value: 'rejected' },
        { text: 'Submitted', value: 'submitted' },
      ],
      onFilter: (value, record) => record.status === value,
      width: 100,
    },
    {
      title: 'Approval ID',
      dataIndex: 'approval_id',
      key: 'approval_id',
      render: (approvalId) => (
        approvalId ? (
          <Text type="secondary">#{approvalId}</Text>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
      width: 100,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small" direction="vertical" style={{ width: '100%' }}>
          <Space size="small">
            <Button 
              type="link" 
              size="small"
              icon={<EyeOutlined />}
              style={{ padding: 0 }}
              onClick={() => openMeasurementDetails(record)}
            >
              View Details
            </Button>
            {!showDeleted && isSuperAdmin && record.approval_id && (
              <Button 
                type="link" 
                size="small"
                style={{ padding: 0, color: '#52c41a' }}
                onClick={async () => {
                  try {
                    await baseAPI.post(`/approvals/${record.approval_id}/approve`);
                    message.success('Approved');
                    // Refresh after a short delay to let read DB mirror
                    setTimeout(() => fetchDeviceMeasurements(), 500);
                  } catch (e) {
                    message.error('Approval failed');
                  }
                }}
              >
                Approve
              </Button>
            )}
            {!showDeleted && isSuperAdmin && !record.approval_id && (
              <Button 
                type="link" 
                size="small"
                style={{ padding: 0 }}
                onClick={async () => {
                  try {
                    await baseAPI.post(`/super-admin/meter-data/${record.id}/create-approval`);
                    message.success('Approval record created');
                    setTimeout(() => fetchDeviceMeasurements(), 500);
                  } catch (e) {
                    message.error('Create approval failed');
                  }
                }}
              >
                Create Approval
              </Button>
            )}
          </Space>
          {isSuperAdmin && !showDeleted && (
            <Button 
              type="link" 
              danger
              size="small"
              icon={<DeleteOutlined />}
              style={{ padding: 0 }}
              onClick={() => handleOpenDeleteModal(record)}
            >
              Hide Report
            </Button>
          )}
          {isSuperAdmin && showDeleted && (
            <Button 
              type="link" 
              size="small"
              icon={<UndoOutlined />}
              style={{ padding: 0, color: '#52c41a' }}
              onClick={() => handleRestoreMeasurement(record.id)}
            >
              Restore Report
            </Button>
          )}
        </Space>
      ),
      width: 180,
    },
  ];

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const fetchMeasurementDetails = async (measurement) => {
    setLoadingDetails(true);
    try {
      const response = await getMeasurementDetailsAPI(selectedDeviceId, measurement.id);
      setMeasurementDetails(response.data);
    } catch (error) {
      logger.error("Failed to fetch measurement details:", error);
      message.error("Failed to load measurement details");
      setMeasurementDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openMeasurementDetails = async (measurement) => {
    setSelectedMeasurement(measurement);
    setDetailVisible(true);
    await fetchMeasurementDetails(measurement);
  };

  const handleOpenDeleteModal = async (measurement) => {
    setMeasurementToDelete(measurement);
    setDeletionReason("");
    setCascadeToCertificates(true);
    setDeleteModalVisible(true);
    
    // Fetch certificate count for cascade warning
    setLoadingCertificateCount(true);
    try {
      const response = await getMeasurementReportCertificateCountAPI(measurement.id);
      setCertificateCount(response.data.certificate_count || 0);
    } catch (error) {
      logger.error("Failed to fetch certificate count:", error);
      setCertificateCount(0);
    } finally {
      setLoadingCertificateCount(false);
    }
  };

  const fetchDeletedMeasurements = async () => {
    if (!selectedDeviceId || !userInfo || !isSuperAdmin) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await getDeletedMeasurementReportsAPI({
        device_id: selectedDeviceId,
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit
      });
      
      const deletedData = response.data || [];
      setDeletedMeasurements(deletedData);
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: deletedData.length
      }));

      // Update summary for deleted measurements
      setSummary({
        totalMeasurements: deletedData.length,
        approvedMeasurements: 0,
        pendingMeasurements: 0,
        totalEnergyMWh: deletedData.reduce((total, m) => total + ((m.interval_usage || 0) / 1_000_000), 0)
      });

    } catch (error) {
      logger.error("Failed to fetch deleted measurements:", error);
      message.error("Failed to load deleted measurement reports");
      setDeletedMeasurements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!measurementToDelete || !deletionReason || deletionReason.trim().length < 10) {
      message.error("Deletion reason must be at least 10 characters");
      return;
    }

    setDeletingMeasurement(true);
    try {
      const response = await softDeleteMeasurementReportAPI(
        measurementToDelete.id, 
        deletionReason.trim(), 
        cascadeToCertificates
      );
      
      const certificatesDeleted = response.data?.certificates_deleted || 0;
      const successMsg = certificatesDeleted > 0
        ? `Measurement report hidden successfully. ${certificatesDeleted} certificate(s) also deleted.`
        : "Measurement report hidden successfully";
      
      message.success(successMsg);
      setDeleteModalVisible(false);
      setMeasurementToDelete(null);
      setDeletionReason("");
      setCertificateCount(0);
      
      // Refresh the measurements list
      setTimeout(() => fetchDeviceMeasurements(), 500);
    } catch (error) {
      logger.error("Failed to soft delete measurement report:", error);
      const errorMsg = error.response?.data?.detail || "Failed to hide measurement report";
      message.error(errorMsg);
    } finally {
      setDeletingMeasurement(false);
    }
  };

  const handleRestoreMeasurement = async (measurementId) => {
    try {
      await restoreMeasurementReportAPI(measurementId);
      message.success("Measurement report restored successfully");
      
      // Refresh the deleted measurements list
      setTimeout(() => fetchDeletedMeasurements(), 500);
    } catch (error) {
      logger.error("Failed to restore measurement report:", error);
      const errorMsg = error.response?.data?.detail || "Failed to restore measurement report";
      message.error(errorMsg);
    }
  };

  const handleToggleShowDeleted = (checked) => {
    setShowDeleted(checked);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Show empty state when no device is selected
  if (!selectedDeviceId) {
    return (
      <Card style={{ marginTop: '24px' }}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <ThunderboltOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
          <Title level={4} type="secondary">Select a Device</Title>
          <Text type="secondary">
            Choose a device from the table above to view its measurement reports
          </Text>
        </div>
      </Card>
    );
  }

  // Show loading state
  if (!userInfo) {
    return (
      <Card style={{ marginTop: '24px' }}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">Loading measurement data...</Text>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThunderboltOutlined style={{ color: '#1890ff' }} />
            <Title level={4} style={{ margin: 0 }}>
              Device Measurements
            </Title>
            <Tag color="blue">Device ID: {selectedDeviceId}</Tag>
            {showDeleted && <Tag icon={<EyeInvisibleOutlined />} color="red">Showing Deleted Reports</Tag>}
          </div>
          <Space>
            {isSuperAdmin && (
              <>
                <Text>Show Deleted:</Text>
                <Switch 
                  checked={showDeleted} 
                  onChange={handleToggleShowDeleted}
                  checkedChildren="Yes"
                  unCheckedChildren="No"
                />
              </>
            )}
            {!showDeleted && (
              <>
                <Text>Status:</Text>
                <Select 
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  style={{ width: 120 }}
                  size="small"
                >
                  <Option value="all">All</Option>
                  <Option value="approved">Approved</Option>
                  <Option value="pending">Pending</Option>
                  <Option value="rejected">Rejected</Option>
                  <Option value="submitted">Submitted</Option>
                </Select>
              </>
            )}
          </Space>
        </div>
      }
      style={{ marginTop: '24px' }}
    >
      {/* Summary Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Measurements"
              value={summary.totalMeasurements}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Approved"
              value={summary.approvedMeasurements}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Pending"
              value={summary.pendingMeasurements}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Energy"
              value={summary.totalEnergyMWh}
              suffix="MWh"
              precision={3}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Info Alert */}
      {showDeleted ? (
        <Alert
          message="Deleted Measurement Reports (Super Admin Only)"
          description="These are soft-deleted measurement reports that have been hidden from regular users. You can restore them using the 'Restore Report' button."
          type="warning"
          showIcon
          icon={<EyeInvisibleOutlined />}
          style={{ marginBottom: '16px' }}
        />
      ) : (
        <Alert
          message="Device Measurement Reports"
          description="These are processed measurement reports that have been submitted for approval. Each report represents a time period of energy generation/consumption data."
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Measurements Table */}
      <Spin spinning={loading}>
        <style>
          {`
            .deleted-row {
              background-color: #fff1f0 !important;
              opacity: 0.8;
            }
            .deleted-row:hover {
              background-color: #ffe7e6 !important;
            }
          `}
        </style>
        <Table
          columns={columns}
          dataSource={showDeleted ? deletedMeasurements : measurements}
          rowKey={(record) => `measurement-${record.id}`}
          pagination={false}
          scroll={{ x: 900 }}
          rowClassName={(record) => showDeleted ? 'deleted-row' : ''}
          locale={{
            emptyText: loading ? 'Loading...' : showDeleted ? 'No deleted measurement reports found' : 'No measurement reports found for this device'
          }}
        />
        
        {pagination.total > 0 && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <Pagination
              current={pagination.page}
              total={pagination.total}
              pageSize={pagination.limit}
              onChange={handlePageChange}
              showSizeChanger={false}
              showQuickJumper={false}
              showTotal={(total, range) => 
                `${range[0]}-${range[1]} of ${total} measurements`
              }
            />
          </div>
        )}
      </Spin>

      {/* Measurement Details Modal */}
      <Modal 
        title="Measurement Details & Quality Analysis" 
        open={detailVisible} 
        onCancel={() => {
          setDetailVisible(false);
          setMeasurementDetails(null);
          setSelectedMeasurement(null);
        }} 
        footer={null} 
        width={1000}
      >
        {selectedMeasurement && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            
            {/* Measurement Overview */}
            <Card size="small" title="📊 Measurement Overview">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic 
                    title="Measurement ID" 
                    value={selectedMeasurement.id} 
                    prefix="#"
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Device ID" 
                    value={selectedMeasurement.device_id}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Status" 
                    value={selectedMeasurement.status}
                    valueStyle={{ 
                      color: selectedMeasurement.status === 'approved' ? '#52c41a' : 
                             selectedMeasurement.status === 'pending' ? '#faad14' : '#ff4d4f'
                    }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Approval ID" 
                    value={selectedMeasurement.approval_id || 'N/A'}
                    prefix={selectedMeasurement.approval_id ? "#" : ""}
                  />
                </Col>
              </Row>
            </Card>

            {/* Energy Analysis & Time Series */}
            <Card size="small" title="⚡ Energy Analysis & Time Series">
              {/* Statistics Row */}
              <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={6}>
                  <Statistic 
                    title="Total Energy" 
                    value={(selectedMeasurement.interval_usage_wh || 0) / 1_000_000} 
                    suffix="MWh" 
                    precision={3} 
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Time Duration" 
                    value={dayjs(selectedMeasurement.interval_end_datetime).diff(dayjs(selectedMeasurement.interval_start_datetime), 'hour')} 
                    suffix="hours" 
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Start Time" 
                    value={dayjs(selectedMeasurement.interval_start_datetime).format('MMM DD, HH:mm')} 
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="End Time" 
                    value={dayjs(selectedMeasurement.interval_end_datetime).format('MMM DD, HH:mm')} 
                  />
                </Col>
              </Row>

              {/* Energy vs Time Graph */}
              {(() => {
                if (loadingDetails) {
                  return (
                    <div style={{ marginTop: '16px', textAlign: 'center', padding: '40px 0' }}>
                      <Spin size="large" />
                      <div style={{ marginTop: '16px' }}>
                        <Text type="secondary">Loading timeseries data...</Text>
                      </div>
                    </div>
                  );
                }

                if (!measurementDetails || !measurementDetails.timeseries || measurementDetails.timeseries.length === 0) {
                  return (
                    <div style={{ marginTop: '16px', textAlign: 'center', padding: '40px 0' }}>
                      <Text type="secondary">No timeseries data available for this measurement</Text>
                    </div>
                  );
                }

                const startTime = dayjs(selectedMeasurement.interval_start_datetime);
                const endTime = dayjs(selectedMeasurement.interval_end_datetime);
                const timeseries = measurementDetails.timeseries;
                const timePoints = timeseries.map(p => p.timestamp);
                const energyPoints = timeseries.map(p => Number(((p.energy_wh || 0)).toFixed(0)));

                return (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <strong>Energy Over Time</strong>
                      <span style={{ marginLeft: '12px', fontSize: '12px', color: '#666' }}>
                        {timeseries.length} data points from {startTime.format('YYYY-MM-DD HH:mm')} to {endTime.format('YYYY-MM-DD HH:mm')}
                      </span>
                    </div>
                    <Plot
                      data={[
                        {
                          type: 'scatter',
                          mode: 'lines',
                          x: timePoints,
                          y: energyPoints,
                          line: { color: '#1890ff', width: 2 },
                          name: 'Energy (Wh)',
                          hovertemplate: '%{x|%Y-%m-%d %H:%M}<br>Energy: %{y:,} Wh<extra></extra>',
                        }
                      ]}
                      layout={{
                        margin: { l: 60, r: 20, t: 20, b: 60 },
                        xaxis: { title: 'Time', type: 'date', tickformat: '%H:%M\n%m/%d', automargin: true },
                        yaxis: { title: 'Energy (Wh)', rangemode: 'tozero', automargin: true },
                        hovermode: 'x unified',
                        showlegend: false,
                        plot_bgcolor: '#fafafa',
                        paper_bgcolor: 'white'
                      }}
                      config={{ responsive: true, displaylogo: false }}
                      style={{ width: '100%', height: '300px' }}
                    />
                  </div>
                );
              })()}
            </Card>

            {/* Quality Checks */}
            <Card size="small" title="✅ Quality Checks">
              <Row gutter={16}>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', color: '#52c41a' }}>✓</div>
                    <div style={{ fontWeight: 500 }}>Data Integrity</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Measurement validated</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', color: '#52c41a' }}>✓</div>
                    <div style={{ fontWeight: 500 }}>Time Range</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Valid time period</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', color: selectedMeasurement.status === 'approved' ? '#52c41a' : '#faad14' }}>
                      {selectedMeasurement.status === 'approved' ? '✓' : '⏳'}
                    </div>
                    <div style={{ fontWeight: 500 }}>Approval Status</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {selectedMeasurement.status === 'approved' ? 'Approved' : 
                       selectedMeasurement.status === 'pending' ? 'Pending review' : 
                       selectedMeasurement.status === 'rejected' ? 'Rejected' : 'Submitted'}
                    </div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', color: '#52c41a' }}>✓</div>
                    <div style={{ fontWeight: 500 }}>Energy Units</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Wh format verified</div>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Certificate Analysis */}
            <Card size="small" title="🏆 Certificate Analysis">
              {/* Summary + stacked bar */}
              <Alert 
                type="success" 
                message="Energy Certificate Generation Ready" 
                description={
                  selectedMeasurement.status === 'approved' 
                    ? `This measurement can generate ${(selectedMeasurement.interval_usage_wh || 0) >= 1_000_000 ? Math.floor((selectedMeasurement.interval_usage_wh || 0) / 1_000_000) : 0} certificate bundles of 1 MWh each.`
                    : `Upon approval, this measurement will generate ${(selectedMeasurement.interval_usage_wh || 0) >= 1_000_000 ? Math.floor((selectedMeasurement.interval_usage_wh || 0) / 1_000_000) : 0} certificate bundles.`
                } 
                showIcon 
              />
              <div style={{ marginTop: 12 }}>
                <Progress 
                  percent={selectedMeasurement.status === 'approved' ? 100 : selectedMeasurement.status === 'pending' ? 70 : 30} 
                  status={selectedMeasurement.status === 'approved' ? 'success' : selectedMeasurement.status === 'rejected' ? 'exception' : 'active'} 
                  format={() => 
                    selectedMeasurement.status === 'approved' ? "Ready for certificate issuance" : 
                    selectedMeasurement.status === 'pending' ? "Pending approval" : 
                    selectedMeasurement.status === 'rejected' ? "Rejected - requires revision" :
                    "Submitted for review"
                  }
                />
              </div>

              {/* Certificates over Time (Bundle-stacked, sorted by EAC ID; no legend) */}
              {(() => {
                const certs = measurementDetails?.certificates || [];
                if (!certs.length) {
                  return (
                    <div style={{ marginTop: '16px' }}>
                      <Text type="secondary">No certificate data available for this measurement</Text>
                    </div>
                  );
                }

                // Group bundles by hour, sort each hour by EAC ID for deterministic stacking
                const byHour = new Map();
                certs.forEach(c => {
                  const t = c.production_starting_interval;
                  if (!byHour.has(t)) byHour.set(t, []);
                  byHour.get(t).push(c);
                });
                const times = Array.from(byHour.keys()).sort();
                times.forEach(t => {
                  byHour.get(t).sort((a, b) => {
                    const ea = (a.eac_id || '');
                    const eb = (b.eac_id || '');
                    return ea.localeCompare(eb) || (a.certificate_bundle_id || '').localeCompare(b.certificate_bundle_id || '');
                  });
                });

                const maxStack = times.reduce((m, t) => Math.max(m, byHour.get(t).length), 0);
                const colorForLayer = (i) => {
                  const palette = ['#4c6ef5','#228be6','#15aabf','#12b886','#40c057','#82c91e','#fab005','#fd7e14','#e64980','#be4bdb'];
                  return palette[i % palette.length];
                };

                const traces = [];
                for (let i = 0; i < maxStack; i += 1) {
                  traces.push({
                    type: 'bar',
                    x: times,
                    y: times.map(t => (byHour.get(t)[i]?.bundle_quantity) || 0),
                    customdata: times.map(t => {
                      const b = byHour.get(t)[i];
                      return b ? [b.certificate_bundle_id, b.eac_id || '', b.bundle_quantity || 0] : [null, null, 0];
                    }),
                    hovertemplate: '%{x|%Y-%m-%d %H:%M}<br>Bundle: %{customdata[0]}<br>EAC: %{customdata[1]}<br>Energy: %{customdata[2]:,} Wh<extra></extra>',
                    marker: { color: colorForLayer(i) },
                    showlegend: false,
                  });
                }

                return (
                  <div style={{ marginTop: '16px' }}>
                    <Plot
                      data={traces}
                      layout={{
                        barmode: 'stack',
                        margin: { l: 70, r: 20, t: 20, b: 60 },
                        xaxis: { title: 'Time', type: 'date', tickformat: '%H:%M\n%m/%d', automargin: true },
                        yaxis: { title: 'Energy (Wh)', rangemode: 'tozero', automargin: true },
                        hovermode: 'x unified',
                        showlegend: false,
                        plot_bgcolor: '#fafafa',
                        paper_bgcolor: 'white'
                      }}
                      config={{ responsive: true, displaylogo: false }}
                      style={{ width: '100%', height: '320px' }}
                    />
                  </div>
                );
              })()}
            </Card>

            {/* Super Admin Approval Actions */}
            {isSuperAdmin && selectedMeasurement?.approval_id && (
              <Card size="small" title="🛡️ Super Admin Actions" style={{ marginTop: 16 }}>
                <Space>
                  <Button type="primary" onClick={async () => {
                    try {
                      const resp = await fetch(`/api/approvals/${selectedMeasurement.approval_id}/approve`, { method: 'POST', credentials: 'include' });
                      if (!resp.ok) throw new Error(`Approve failed: ${resp.status}`);
                      message.success('Measurement report approved');
                      setDetailVisible(false);
                      fetchDeviceMeasurements();
                    } catch (e) {
                      message.error('Approval failed');
                    }
                  }}>Approve</Button>
                  <Button danger onClick={async () => {
                    try {
                      const resp = await fetch(`/api/approvals/${selectedMeasurement.approval_id}/reject`, { method: 'POST', credentials: 'include' });
                      if (!resp.ok) throw new Error(`Reject failed: ${resp.status}`);
                      message.success('Measurement report rejected');
                      setDetailVisible(false);
                      fetchDeviceMeasurements();
                    } catch (e) {
                      message.error('Rejection failed');
                    }
                  }}>Reject</Button>
                </Space>
              </Card>
            )}

            {/* Technical Details */}
            <Card size="small" title="🔧 Technical Details">
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Energy (Wh):</strong> {selectedMeasurement.interval_usage_wh?.toLocaleString() || 'N/A'}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Energy (MWh):</strong> {((selectedMeasurement.interval_usage_wh || 0) / 1_000_000).toFixed(6)}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Gross/Net Indicator:</strong> {selectedMeasurement.gross_net_indicator?.toUpperCase() || 'NET'}
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Start:</strong> {selectedMeasurement.interval_start_datetime}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>End:</strong> {selectedMeasurement.interval_end_datetime}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Status:</strong> 
                    <Tag 
                      color={getStatusColor(selectedMeasurement.status)} 
                      style={{ marginLeft: 8 }}
                    >
                      {String(selectedMeasurement.status || '').toUpperCase()}
                    </Tag>
                  </div>
                </Col>
              </Row>
            </Card>

          </Space>
        )}
      </Modal>

      {/* Soft Delete Confirmation Modal */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            <span>Hide Measurement Report</span>
          </Space>
        }
        open={deleteModalVisible}
        onCancel={() => {
          setDeleteModalVisible(false);
          setMeasurementToDelete(null);
          setDeletionReason("");
          setCertificateCount(0);
          setCascadeToCertificates(true);
        }}
        onOk={handleSoftDelete}
        okText="Hide Report"
        okButtonProps={{ 
          danger: true, 
          loading: deletingMeasurement,
          disabled: !deletionReason || deletionReason.trim().length < 10
        }}
        cancelText="Cancel"
        width={600}
      >
        {measurementToDelete && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* Certificate Cascade Warning */}
            {loadingCertificateCount ? (
              <Alert
                message="Checking for associated certificates..."
                type="info"
                showIcon
              />
            ) : certificateCount > 0 ? (
              <Alert
                message="Certificate Cascade Warning"
                description={
                  <div>
                    <p><strong>This measurement report has {certificateCount} associated certificate(s).</strong></p>
                    <p>By default, all certificates will also be soft deleted.</p>
                  </div>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 0 }}
              />
            ) : null}

            {/* Cascade Checkbox */}
            {certificateCount > 0 && (
              <Checkbox
                checked={cascadeToCertificates}
                onChange={(e) => setCascadeToCertificates(e.target.checked)}
                style={{ fontSize: '14px' }}
              >
                <strong>Also soft delete {certificateCount} associated certificate(s)</strong>
              </Checkbox>
            )}
            
            <Alert
              message="Warning: This will hide the measurement report from all users"
              description={
                <div>
                  <p>This action will:</p>
                  <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                    <li>Hide measurement report #{measurementToDelete.id} from all regular users and admins</li>
                    {cascadeToCertificates && certificateCount > 0 && (
                      <li>Also hide {certificateCount} associated certificate(s)</li>
                    )}
                    <li>Keep the data in the database (soft delete)</li>
                    <li>Allow super admins to restore it later if needed</li>
                  </ul>
                </div>
              }
              type="warning"
              showIcon
            />

            <div>
              <Text strong>Measurement Report Details:</Text>
              <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                <div><strong>ID:</strong> #{measurementToDelete.id}</div>
                <div><strong>Device ID:</strong> {measurementToDelete.device_id}</div>
                <div><strong>Time Period:</strong> {dayjs(measurementToDelete.interval_start_datetime).format('MMM DD, YYYY HH:mm')} - {dayjs(measurementToDelete.interval_end_datetime).format('MMM DD, YYYY HH:mm')}</div>
                <div><strong>Energy:</strong> {formatEnergy(measurementToDelete.interval_usage_wh)}</div>
                <div><strong>Status:</strong> <Tag color={getStatusColor(measurementToDelete.status)}>{measurementToDelete.status}</Tag></div>
              </div>
            </div>

            <div>
              <Text strong style={{ color: '#ff4d4f' }}>* Deletion Reason (required, min 10 characters):</Text>
              <Input.TextArea
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="Enter the reason for hiding this measurement report (e.g., 'Duplicate data entry', 'Invalid readings', 'Test data')..."
                rows={4}
                maxLength={500}
                showCount
                style={{ marginTop: 8 }}
              />
              {deletionReason && deletionReason.trim().length < 10 && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  Please provide at least 10 characters
                </Text>
              )}
            </div>
          </Space>
        )}
      </Modal>

    </Card>
  );
};

export default DeviceMeasurements;

import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Table,
  Space,
  Typography,
  Tag,
  Progress,
  Alert,
  Tooltip,
  Card,
  Statistic,
  Row,
  Col,
  message,
} from "antd";
import {
  CloudUploadOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import {
  checkUploadStatus,
  removeActiveUpload,
  hideUploadStatusModal,
} from "../../store/fileUpload/fileUploadSlice";
import { getUserUploadsAPI } from "../../api/fileUploadAPI";
import moment from "moment";

const { Text, Title } = Typography;

const UploadStatusMonitor = () => {
  const dispatch = useDispatch();
  const [userUploads, setUserUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);

  const {
    showStatusModal,
    selectedUploadId,
    activeUploads,
    uploadStatuses,
  } = useSelector((state) => state.fileUpload);

  // Auto-refresh status for active uploads
  useEffect(() => {
    if (showStatusModal && activeUploads.length > 0) {
      const interval = setInterval(() => {
        activeUploads.forEach(upload => {
          if (upload.status === 'uploaded' || upload.status === 'processing') {
            dispatch(checkUploadStatus(upload.fileUploadId));
          }
        });
      }, 5000); // Check every 5 seconds

      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [showStatusModal, activeUploads, dispatch]);

  useEffect(() => {
    if (showStatusModal) {
      loadUserUploads();
    }
  }, [showStatusModal]);

  const loadUserUploads = async () => {
    setLoading(true);
    try {
      const response = await getUserUploadsAPI({ limit: 50 });
      setUserUploads(response.data.uploads || []);
    } catch (error) {
      message.error("Failed to load upload history");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    dispatch(hideUploadStatusModal());
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  const handleRefresh = () => {
    loadUserUploads();
    activeUploads.forEach(upload => {
      dispatch(checkUploadStatus(upload.fileUploadId));
    });
  };

  const handleRemoveFromMonitoring = (fileUploadId) => {
    dispatch(removeActiveUpload(fileUploadId));
  };

  const getStatusConfig = (status) => {
    const configs = {
      uploaded: {
        color: "blue",
        icon: <ClockCircleOutlined />,
        text: "Uploaded",
        description: "File uploaded, waiting for processing",
      },
      processing: {
        color: "orange",
        icon: <LoadingOutlined spin />,
        text: "Processing",
        description: "File is being processed",
      },
      processed: {
        color: "green",
        icon: <CheckCircleOutlined />,
        text: "Processed",
        description: "File processed successfully",
      },
      failed: {
        color: "red",
        icon: <ExclamationCircleOutlined />,
        text: "Failed",
        description: "Processing failed",
      },
    };

    return configs[status] || {
      color: "default",
      icon: <ClockCircleOutlined />,
      text: status,
      description: "Unknown status",
    };
  };

  const getUploadTypeIcon = (type) => {
    const icons = {
      meter_readings: <BarChartOutlined />,
      rec_verification: <FileTextOutlined />,
      sss_data: <CloudUploadOutlined />,
    };
    return icons[type] || <CloudUploadOutlined />;
  };

  const activeUploadColumns = [
    {
      title: "File",
      dataIndex: "fileName",
      key: "fileName",
      render: (text, record) => (
        <Space>
          {getUploadTypeIcon(record.uploadType)}
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "uploadType",
      key: "uploadType",
      render: (type) => (
        <Tag color="blue">
          {type.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status, record) => {
        const config = getStatusConfig(status);
        const currentStatus = uploadStatuses[record.fileUploadId];
        
        return (
          <Space>
            <Tag color={config.color} icon={config.icon}>
              {config.text}
            </Tag>
            {currentStatus?.processing_result && (
              <Tooltip title="View processing results">
                <Button
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => showProcessingResults(currentStatus)}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: "Progress",
      key: "progress",
      render: (_, record) => {
        const status = record.status;
        let percent = 0;
        let statusText = "Queued";

        switch (status) {
          case "uploaded":
            percent = 25;
            statusText = "Uploaded";
            break;
          case "processing":
            percent = 75;
            statusText = "Processing";
            break;
          case "processed":
            percent = 100;
            statusText = "Complete";
            break;
          case "failed":
            percent = 100;
            statusText = "Failed";
            break;
        }

        return (
          <div style={{ width: 120 }}>
            <Progress
              percent={percent}
              size="small"
              status={status === "failed" ? "exception" : status === "processed" ? "success" : "active"}
              showInfo={false}
            />
            <Text type="secondary" style={{ fontSize: "12px" }}>
              {statusText}
            </Text>
          </div>
        );
      },
    },
    {
      title: "Upload Time",
      dataIndex: "addedAt",
      key: "addedAt",
      render: (time) => (
        <Text type="secondary">
          {moment(time).fromNow()}
        </Text>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="Remove from monitoring">
            <Button
              type="link"
              size="small"
              onClick={() => handleRemoveFromMonitoring(record.fileUploadId)}
              disabled={record.status === "processing"}
            >
              Remove
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const showProcessingResults = (statusData) => {
    const { processing_result } = statusData;
    
    Modal.info({
      title: "Processing Results",
      width: 600,
      content: (
        <div>
          {processing_result?.records_processed && (
            <p><strong>Records Processed:</strong> {processing_result.records_processed}</p>
          )}
          {processing_result?.total_kwh && (
            <p><strong>Total Energy:</strong> {(processing_result.total_kwh / 1000).toFixed(2)} MWh</p>
          )}
          {processing_result?.measurement_reports_created && (
            <p><strong>Reports Created:</strong> {processing_result.measurement_reports_created}</p>
          )}
          {processing_result?.data_quality_score && (
            <p><strong>Data Quality Score:</strong> {processing_result.data_quality_score}%</p>
          )}
          {processing_result?.processing_time && (
            <p><strong>Processing Time:</strong> {processing_result.processing_time}s</p>
          )}
          {processing_result?.errors && processing_result.errors.length > 0 && (
            <div>
              <p><strong>Warnings/Errors:</strong></p>
              <ul>
                {processing_result.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ),
    });
  };

  const getStatusSummary = () => {
    const summary = activeUploads.reduce((acc, upload) => {
      acc[upload.status] = (acc[upload.status] || 0) + 1;
      return acc;
    }, {});

    return summary;
  };

  const statusSummary = getStatusSummary();

  return (
    <Modal
      title={
        <Space>
          <CloudUploadOutlined />
          <span>Upload Status Monitor</span>
        </Space>
      }
      open={showStatusModal}
      onCancel={handleClose}
      footer={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={handleRefresh}>
          Refresh
        </Button>,
        <Button key="close" type="primary" onClick={handleClose}>
          Close
        </Button>,
      ]}
      width={900}
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {/* Status Summary */}
        {activeUploads.length > 0 && (
          <Card>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="Total Active"
                  value={activeUploads.length}
                  prefix={<CloudUploadOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Processing"
                  value={statusSummary.processing || 0}
                  prefix={<LoadingOutlined />}
                  valueStyle={{ color: "#fa8c16" }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Completed"
                  value={statusSummary.processed || 0}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: "#52c41a" }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Failed"
                  value={statusSummary.failed || 0}
                  prefix={<ExclamationCircleOutlined />}
                  valueStyle={{ color: "#ff4d4f" }}
                />
              </Col>
            </Row>
          </Card>
        )}

        {/* Active Uploads */}
        <div>
          <Title level={5}>Active Uploads</Title>
          {activeUploads.length === 0 ? (
            <Alert
              message="No active uploads"
              description="Your uploaded files will appear here for status monitoring."
              type="info"
              showIcon
            />
          ) : (
            <Table
              dataSource={activeUploads}
              columns={activeUploadColumns}
              rowKey="fileUploadId"
              pagination={false}
              size="small"
            />
          )}
        </div>

        {/* Auto-refresh info */}
        {activeUploads.length > 0 && (
          <Alert
            message="Auto-refresh enabled"
            description="Upload statuses are automatically refreshed every 5 seconds while this window is open."
            type="info"
            showIcon
            icon={<ReloadOutlined spin />}
          />
        )}
      </Space>
    </Modal>
  );
};

export default UploadStatusMonitor; 
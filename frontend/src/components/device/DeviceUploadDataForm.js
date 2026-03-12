import React, { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { Modal, Button, Space, Typography, Upload, message, Switch, Progress, Spin, Alert } from "antd";
import {
  DownloadOutlined,
  UploadOutlined,
  CalendarOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import {
  uploadMeterReadings,
  downloadTemplate,
  checkUploadStatus,
  addActiveUpload,
  clearMeterReadingsUpload,
} from "../../store/fileUpload/fileUploadSlice";
import { logger } from "../../utils";

const { Text } = Typography;

const DeviceUploadDialog = forwardRef((props, ref) => {
  const dispatch = useDispatch();
  const [visible, setVisible] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [asyncProcessing, setAsyncProcessing] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();
  const [statusPolling, setStatusPolling] = useState(null);

  // Redux state
  const {
    meterReadingsUpload,
    templateDownload,
    uploadStatuses,
  } = useSelector((state) => state.fileUpload);

  useImperativeHandle(ref, () => ({
    openDialog: (info) => {
      setDeviceInfo(info);
      setVisible(true);
      // Clear any previous upload state
      dispatch(clearMeterReadingsUpload());
    },
    closeDialog: () => setVisible(false),
  }));

  // Cleanup polling on unmount or modal close
  useEffect(() => {
    return () => {
      if (statusPolling) {
        clearInterval(statusPolling);
      }
    };
  }, [statusPolling]);

  const handleCancel = () => {
    setFileList([]);
    setVisible(false);
    if (statusPolling) {
      clearInterval(statusPolling);
      setStatusPolling(null);
    }
    dispatch(clearMeterReadingsUpload());
  };

  const handleDownloadTemplate = async () => {
    try {
      await dispatch(downloadTemplate()).unwrap();
      messageApi.success("Template downloaded successfully!");
    } catch (error) {
      messageApi.error("Failed to download template");
      logger.error("Download template error:", error);
    }
  };

  const startStatusPolling = (fileUploadId) => {
    const pollInterval = setInterval(async () => {
      try {
        const result = await dispatch(checkUploadStatus(fileUploadId)).unwrap();
        
        // Stop polling if processing is complete
        if (result.status === 'processed' || result.status === 'failed') {
          clearInterval(pollInterval);
          setStatusPolling(null);
          
          if (result.status === 'processed') {
            messageApi.success("File processed successfully!");
            
            // Show processing results
            if (result.processing_result) {
              Modal.info({
                title: "Processing Complete",
                content: (
                  <div>
                    <p><strong>Processing Results:</strong></p>
                    {result.processing_result.records_processed && (
                      <p>Records processed: {result.processing_result.records_processed}</p>
                    )}
                    {result.processing_result.total_kwh && (
                      <p>Total energy: {(result.processing_result.total_kwh / 1000).toFixed(2)} MWh</p>
                    )}
                    {result.processing_result.measurement_reports_created && (
                      <p>Measurement reports created: {result.processing_result.measurement_reports_created}</p>
                    )}
                  </div>
                ),
              });
            }
          } else if (result.status === 'failed') {
            messageApi.error(`Processing failed: ${result.error_details || 'Unknown error'}`);
          }
        }
      } catch (error) {
        logger.error("Status polling error:", error);
        // Continue polling on error, might be temporary
      }
    }, 3000); // Poll every 3 seconds

    setStatusPolling(pollInterval);
  };

  const handleSubmit = async () => {
    if (!fileList.length) {
      messageApi.warning("Please select a file to upload");
      return;
    }

    if (!deviceInfo?.deviceID) {
      messageApi.error("Device information is missing");
      return;
    }

    try {
      const result = await dispatch(uploadMeterReadings({
        file: fileList[0],
        deviceId: deviceInfo.deviceID,
        asyncProcessing,
      })).unwrap();

      // Add to active uploads for monitoring
      dispatch(addActiveUpload({
        fileUploadId: result.file_upload_id,
        fileName: fileList[0].name,
        uploadType: 'meter_readings',
      }));

      if (asyncProcessing) {
        messageApi.success("File uploaded successfully! Processing started.");
        
        // Start polling for status updates
        if (result.file_upload_id) {
          startStatusPolling(result.file_upload_id);
        }

        // Show upload success modal with async info
        Modal.success({
          title: "Upload Successful",
          content: (
            <div>
              <p>Your meter readings file has been uploaded and is being processed.</p>
              <p><strong>File Upload ID:</strong> {result.file_upload_id}</p>
              {result.task_id && <p><strong>Task ID:</strong> {result.task_id}</p>}
              <p>You can monitor the processing status in the upload monitoring section.</p>
            </div>
          ),
        });
      } else {
        // Synchronous processing - show immediate results
        messageApi.success("Meter readings processed successfully!");
        
        if (result.processing_result) {
          Modal.success({
            title: "Processing Complete",
            content: (
              <div>
                <p><strong>Processing Results:</strong></p>
                {result.processing_result.records_processed && (
                  <p>Records processed: {result.processing_result.records_processed}</p>
                )}
                {result.processing_result.total_kwh && (
                  <p>Total energy: {(result.processing_result.total_kwh / 1000).toFixed(2)} MWh</p>
                )}
              </div>
            ),
          });
        }
      }

      // Close modal after successful upload
      setTimeout(() => {
        setVisible(false);
        setFileList([]);
      }, 1000);

    } catch (error) {
      messageApi.error(error || "Failed to upload meter readings");
      logger.error("Upload error:", error);
    }
  };

  const uploadProps = {
    beforeUpload: (file) => {
      const isCsv = file.type === "text/csv" || file.name.endsWith(".csv");
      if (!isCsv) {
        messageApi.error("You can only upload CSV files!");
        return false;
      }
      
      // Check file size (100MB limit)
      const isLt100M = file.size / 1024 / 1024 < 100;
      if (!isLt100M) {
        messageApi.error("File must be smaller than 100MB!");
        return false;
      }
      
      setFileList([file]);
      return false; // Prevent automatic upload
    },
    fileList,
    onRemove: () => {
      setFileList([]);
    },
  };

  const getProcessingStatus = () => {
    if (!meterReadingsUpload.uploadInfo) return null;
    
    const fileUploadId = meterReadingsUpload.uploadInfo.file_upload_id;
    const status = uploadStatuses[fileUploadId];
    
    if (!status) return null;
    
    const statusConfig = {
      uploaded: { icon: <ClockCircleOutlined />, text: "Uploaded", color: "blue" },
      processing: { icon: <LoadingOutlined spin />, text: "Processing", color: "orange" },
      processed: { icon: <CheckCircleOutlined />, text: "Processed", color: "green" },
      failed: { icon: <ExclamationCircleOutlined />, text: "Failed", color: "red" },
    };
    
    return statusConfig[status.status] || null;
  };

  const processingStatus = getProcessingStatus();

  return (
    <>
      {contextHolder}
      <Modal
        title={
          <Space direction="vertical" size={2} style={{ width: "100%" }}>
            <div>
              <Text strong>Upload Data - {deviceInfo?.deviceName} </Text>
              <Text type="secondary">({deviceInfo?.deviceLocalID})</Text>
            </div>
            <Text type="secondary">Date of the latest certificate:</Text>
            <Space>
              <CalendarOutlined style={{ color: "#5F6368" }} />
              <Text type="secondary" strong>
                {new Date().toLocaleDateString()}
              </Text>
            </Space>
          </Space>
        }
        open={visible}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleSubmit}
            loading={meterReadingsUpload.loading}
            disabled={fileList.length === 0 || meterReadingsUpload.loading}
            style={{
              backgroundColor: fileList.length > 0 ? "#043DDC" : "#F5F5F5",
              color: fileList.length > 0 ? "#FFFFFF" : "#00000040",
            }}
          >
            {asyncProcessing ? "Upload & Process" : "Upload & Process Now"}
          </Button>,
        ]}
        width={580}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {/* Error Alert */}
          {meterReadingsUpload.error && (
            <Alert
              message="Upload Error"
              description={meterReadingsUpload.error}
              type="error"
              closable
              onClose={() => dispatch(clearMeterReadingsUpload())}
            />
          )}

          {/* Processing Status */}
          {processingStatus && (
            <Alert
              message={
                <Space>
                  {processingStatus.icon}
                  <span>Processing Status: {processingStatus.text}</span>
                </Space>
              }
              type={processingStatus.color === 'green' ? 'success' : 
                   processingStatus.color === 'red' ? 'error' : 'info'}
              showIcon={false}
            />
          )}

          <Space direction="vertical" size={4}>
            <Text strong>Upload Metering Data</Text>
            <Text type="secondary">
              Metering data for this device can be uploaded to S3 storage. This will trigger
              issuance of certificates for the device. Please download the CSV
              template below for details of the format to upload the data in:
            </Text>
            <Button
              type="link"
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
              loading={templateDownload.loading}
              style={{ color: "#043DDC", fontWeight: 600, paddingLeft: 0 }}
            >
              Download CSV template
            </Button>
          </Space>

          {/* Processing Mode Toggle */}
          <Space direction="vertical" size={8}>
            <Space>
              <Text strong>Processing Mode:</Text>
              <Switch
                checked={asyncProcessing}
                onChange={setAsyncProcessing}
                checkedChildren="Async"
                unCheckedChildren="Sync"
              />
            </Space>
            <Text type="secondary" style={{ fontSize: "12px" }}>
              {asyncProcessing 
                ? "Async: Upload to S3 and process in background (recommended for large files)"
                : "Sync: Process immediately and wait for results (faster for small files)"
              }
            </Text>
          </Space>

          <Upload.Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              {meterReadingsUpload.loading ? <LoadingOutlined /> : <UploadOutlined />}
            </p>
            <p className="ant-upload-text">
              Click or drag CSV file to this area to upload
            </p>
            <p className="ant-upload-hint">
              Support for single CSV file upload only. Maximum file size: 100MB
            </p>
          </Upload.Dragger>

          {/* Upload Progress */}
          {meterReadingsUpload.loading && (
            <div>
              <Text type="secondary">Uploading to S3...</Text>
              <Progress percent={undefined} status="active" />
            </div>
          )}
        </Space>
      </Modal>
    </>
  );
});

export default DeviceUploadDialog;

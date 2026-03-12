import React, { useState, forwardRef, useImperativeHandle } from "react";
import { 
  Modal, 
  Button, 
  Space, 
  Typography, 
  Upload, 
  message, 
  Form, 
  Select, 
  InputNumber,
  Alert,
  Progress 
} from "antd";
import {
  UploadOutlined,
  LoadingOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import {
  uploadRECVerification as uploadEACVerification,
  addActiveUpload,
  clearRECVerificationUpload,
} from "../../store/fileUpload/fileUploadSlice";
import { logger } from "../../utils";

const { Text, Title } = Typography;
const { Option } = Select;

const RECVerificationUpload = forwardRef((props, ref) => {
  const dispatch = useDispatch();
  const [visible, setVisible] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // Redux state
  const { recVerificationUpload } = useSelector((state) => state.fileUpload);

  useImperativeHandle(ref, () => ({
    openDialog: (info) => {
      setDeviceInfo(info);
      setVisible(true);
      form.resetFields();
      setFileList([]);
      dispatch(clearRECVerificationUpload());
    },
    closeDialog: () => setVisible(false),
  }));

  const handleCancel = () => {
    setFileList([]);
    setVisible(false);
    form.resetFields();
    dispatch(clearRECVerificationUpload());
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (!fileList.length) {
        messageApi.warning("Please select a file to upload");
        return;
      }

      if (!deviceInfo?.deviceID) {
        messageApi.error("Device information is missing");
        return;
      }

      const result = await dispatch(uploadEACVerification({
        file: fileList[0],
        deviceId: deviceInfo.deviceID,
        verificationType: values.verificationType,
        recQuantity: values.recQuantity,
        rec_registry: values.recRegistry,
      })).unwrap();

      // Add to active uploads for monitoring
      dispatch(addActiveUpload({
        fileUploadId: result.file_upload_id,
        fileName: fileList[0].name,
        uploadType: 'rec_verification',
      }));

      messageApi.success("REC verification document uploaded successfully!");

      // Show success modal with upload details
      Modal.success({
        title: "REC Verification Uploaded",
        content: (
          <div>
            <p>Your REC verification document has been uploaded and is pending review.</p>
            <p><strong>File Upload ID:</strong> {result.file_upload_id}</p>
            {result.rec_verification_id && (
              <p><strong>REC Verification ID:</strong> {result.rec_verification_id}</p>
            )}
            <p><strong>Verification Type:</strong> {values.verificationType}</p>
            <p><strong>REC Quantity:</strong> {values.recQuantity} MWh</p>
            <p>The document will be reviewed by an administrator for approval.</p>
          </div>
        ),
      });

      // Close modal after successful upload
      setTimeout(() => {
        setVisible(false);
        setFileList([]);
        form.resetFields();
      }, 1000);

    } catch (error) {
      if (error.name === 'ValidationError') {
        messageApi.error("Please fill in all required fields");
      } else {
        messageApi.error(error || "Failed to upload REC verification");
        logger.error("REC upload error:", error);
      }
    }
  };

  const uploadProps = {
    beforeUpload: (file) => {
      // Accept PDF, TXT, JPEG, PNG files
      const acceptedTypes = [
        'application/pdf',
        'text/plain',
        'image/jpeg',
        'image/png',
      ];
      
      const isAccepted = acceptedTypes.includes(file.type) || 
                        file.name.toLowerCase().endsWith('.pdf') ||
                        file.name.toLowerCase().endsWith('.txt') ||
                        file.name.toLowerCase().endsWith('.jpg') ||
                        file.name.toLowerCase().endsWith('.jpeg') ||
                        file.name.toLowerCase().endsWith('.png');
      
      if (!isAccepted) {
        messageApi.error("You can only upload PDF, TXT, JPEG, or PNG files!");
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

  const verificationTypes = [
    { value: 'ownership_proof', label: 'Ownership Proof', description: 'Documents proving ownership of RECs' },
    { value: 'registry_statement', label: 'Registry Statement', description: 'Official statement from REC registry' },
    { value: 'certificate_scan', label: 'Certificate Scan', description: 'Scanned REC certificates' },
    { value: 'trading_record', label: 'Trading Record', description: 'Records of REC trading transactions' },
  ];

  const usRecRegistries = [
    { value: 'PJM_GATS', label: 'PJM GATS' },
    { value: 'MRETS', label: 'M-RETS' },
    { value: 'WREGIS', label: 'WREGIS' },
    { value: 'NEPOOL_GIS', label: 'NEPOOL GIS' },
    { value: 'ERCOT', label: 'ERCOT' },
    { value: 'NCRETS', label: 'NC-RETS' },
    { value: 'NYGATS', label: 'NYGATS' },
    { value: 'TIGR', label: 'TIGR' },
  ];

  return (
    <>
      {contextHolder}
      <Modal
        title={
          <Space direction="vertical" size={2} style={{ width: "100%" }}>
            <div>
              <SafetyCertificateOutlined style={{ marginRight: 8, color: "#1890ff" }} />
               <Text strong>EAC Verification Upload - {deviceInfo?.deviceName}</Text>
            </div>
            <Text type="secondary">({deviceInfo?.deviceLocalID})</Text>
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
            loading={recVerificationUpload.loading}
            disabled={fileList.length === 0 || recVerificationUpload.loading}
            style={{
              backgroundColor: fileList.length > 0 ? "#1890ff" : "#F5F5F5",
              color: fileList.length > 0 ? "#FFFFFF" : "#00000040",
            }}
          >
            Upload EAC Verification
          </Button>,
        ]}
        width={600}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {/* Error Alert */}
          {recVerificationUpload.error && (
            <Alert
              message="Upload Error"
              description={recVerificationUpload.error}
              type="error"
              closable
              onClose={() => dispatch(clearRECVerificationUpload())}
            />
          )}

          <div>
            <Title level={5} style={{ margin: 0, color: "#1890ff" }}>
              <FileTextOutlined style={{ marginRight: 8 }} />
               EAC Verification Document
            </Title>
            <Text type="secondary">
              Upload documents to verify Energy Attribute Certificate (EAC) ownership for this device. Accepted file formats: PDF, TXT, JPEG, PNG.
            </Text>
          </div>

          {/* Form for REC details */}
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item
              label="REC Registry"
              name="recRegistry"
              rules={[{ required: true, message: 'Please select a REC registry' }]}
            >
              <Select placeholder="Select REC registry">
                {usRecRegistries.map((r) => (
                  <Option key={r.value} value={r.value}>{r.label}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              label="Verification Type"
              name="verificationType"
              rules={[{ required: true, message: 'Please select a verification type' }]}
            >
              <Select placeholder="Select verification type">
                {verificationTypes.map(type => (
                  <Option key={type.value} value={type.value}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{type.label}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{type.description}</div>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="REC Quantity (MWh)"
              name="recQuantity"
              rules={[
                { required: true, message: 'Please enter REC quantity' },
                { type: 'number', min: 0.01, message: 'Quantity must be greater than 0' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Enter REC quantity in MWh"
                precision={2}
                min={0.01}
                step={0.01}
              />
            </Form.Item>
          </Form>

          {/* File Upload */}
          <Upload.Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              {recVerificationUpload.loading ? <LoadingOutlined /> : <UploadOutlined />}
            </p>
            <p className="ant-upload-text">
               Click or drag EAC verification document to this area to upload
            </p>
            <p className="ant-upload-hint">
              Supports PDF, TXT, JPEG, PNG files. Maximum file size: 100MB
            </p>
          </Upload.Dragger>

          {/* Upload Progress */}
          {recVerificationUpload.loading && (
            <div>
              <Text type="secondary">Uploading REC verification to S3...</Text>
              <Progress percent={undefined} status="active" />
            </div>
          )}

          {/* Info Alert */}
          <Alert
            message="Review Process"
            description="After upload, your EAC verification document will be reviewed by an administrator. You will be notified of the approval status via email and can check the status in the upload monitoring section."
            type="info"
            showIcon
          />
        </Space>
      </Modal>
    </>
  );
});

export default RECVerificationUpload; 
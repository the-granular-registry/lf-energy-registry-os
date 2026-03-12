import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Table, 
  Tag, 
  message,
  Modal,
  Space,
  Row,
  Col,
  Statistic,
  Tooltip,
  Alert,
  Select,
  DatePicker,
  Upload,
  Progress,
  Steps,
  Descriptions
} from 'antd';
import { 
  UploadOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  CloudUploadOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import Cookies from 'js-cookie';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const SSSDataUpload = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [currentUpload, setCurrentUpload] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState(null);
  
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);

  const uploadTypes = [
    { value: 'factors', label: 'Emissions Factors' },
    { value: 'resources', label: 'SSS Resources' },
    { value: 'allocations', label: 'Customer Allocations' },
    { value: 'retirements', label: 'Certificate Retirements' }
  ];

  const uploadStatuses = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'FAILED', label: 'Failed' }
  ];

  useEffect(() => {
    loadUploadHistory();
  }, []);

  const loadUploadHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sss/upload-history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUploadHistory(data || []);
      } else {
        message.error('Failed to load upload history');
      }
    } catch (error) {
      console.error('Error loading upload history:', error);
      message.error('Error loading upload history');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (values) => {
    try {
      setCurrentUpload({
        type: values.upload_type,
        period_start: values.period_start,
        period_end: values.period_end,
        description: values.description
      });
      setUploadProgress(0);
      setShowUploadModal(false);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      // API call to upload data
      const uploadData = {
        upload_type: values.upload_type,
        period_start: values.period_start.toISOString(),
        period_end: values.period_end.toISOString(),
        description: values.description,
        data: values.data || []
      };

      const response = await fetch('/api/sss/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        },
        body: JSON.stringify(uploadData)
      });

      if (response.ok) {
        const result = await response.json();
        message.success(`Upload completed successfully. ${result.records_valid} records processed.`);
        setCurrentUpload(null);
        setUploadProgress(0);
        loadUploadHistory();
      } else {
        const errorData = await response.json();
        message.error(errorData.detail || 'Upload failed');
        setCurrentUpload(null);
        setUploadProgress(0);
      }
    } catch (error) {
      console.error('Error uploading data:', error);
      message.error('Error uploading data');
      setCurrentUpload(null);
      setUploadProgress(0);
    }
  };

  const handleRetireCertificates = async () => {
    try {
      const response = await fetch('/api/sss/retire-certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        message.success(`Successfully retired ${result.certificates_retired} certificates`);
        loadUploadHistory();
      } else {
        message.error('Failed to retire certificates');
      }
    } catch (error) {
      console.error('Error retiring certificates:', error);
      message.error('Error retiring certificates');
    }
  };

  const getUploadTypeLabel = (type) => {
    const uploadType = uploadTypes.find(t => t.value === type);
    return uploadType ? uploadType.label : type;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'green';
      case 'PROCESSING':
        return 'blue';
      case 'PENDING':
        return 'orange';
      case 'FAILED':
        return 'red';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleOutlined />;
      case 'PROCESSING':
        return <ClockCircleOutlined />;
      case 'PENDING':
        return <ClockCircleOutlined />;
      case 'FAILED':
        return <ExclamationCircleOutlined />;
      default:
        return null;
    }
  };

  const columns = [
    {
      title: 'Upload Type',
      dataIndex: 'upload_type',
      key: 'upload_type',
      width: 150,
      render: (type) => (
        <Tag color="blue">{getUploadTypeLabel(type)}</Tag>
      )
    },
    {
      title: 'Period',
      key: 'period',
      width: 200,
      render: (_, record) => (
        <div>
          <div>{new Date(record.period_start).toLocaleDateString()}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>to</div>
          <div>{new Date(record.period_end).toLocaleDateString()}</div>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Records Processed',
      key: 'records',
      width: 150,
      render: (_, record) => (
        <div>
          <div style={{ color: '#3f8600' }}>{record.records_valid} valid</div>
          {record.records_invalid > 0 && (
            <div style={{ color: '#cf1322', fontSize: '12px' }}>
              {record.records_invalid} invalid
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      render: (description) => (
        <div style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {description || '-'}
        </div>
      )
    },
    {
      title: 'Upload Date',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedUpload(record);
                setShowViewModal(true);
              }}
            />
          </Tooltip>
          {record.status === 'FAILED' && (
            <Tooltip title="Retry Upload">
              <Button
                type="text"
                icon={<CloudUploadOutlined />}
                onClick={() => {
                  Modal.confirm({
                    title: 'Retry Upload',
                    content: 'Are you sure you want to retry this upload?',
                    onOk: () => handleRetryUpload(record.id)
                  });
                }}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const handleRetryUpload = async (uploadId) => {
    try {
      const response = await fetch(`/api/sss/upload/${uploadId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        }
      });

      if (response.ok) {
        message.success('Upload retry initiated');
        loadUploadHistory();
      } else {
        message.error('Failed to retry upload');
      }
    } catch (error) {
      console.error('Error retrying upload:', error);
      message.error('Error retrying upload');
    }
  };

  return (
    <div className="sss-data-upload">
      <Card title="SSS Data Upload" className="sss-card">
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic
              title="Total Uploads"
              value={uploadHistory.length}
              prefix={<UploadOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Successful Uploads"
              value={uploadHistory.filter(u => u.status === 'COMPLETED').length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Failed Uploads"
              value={uploadHistory.filter(u => u.status === 'FAILED').length}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total Records"
              value={uploadHistory.reduce((sum, u) => sum + u.records_valid, 0)}
              prefix={<FileTextOutlined />}
            />
          </Col>
        </Row>

        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setShowUploadModal(true)}
            >
              Upload Data
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: 'Retire Certificates',
                  content: 'This will automatically retire certificates based on your SSS allocations. Continue?',
                  onOk: handleRetireCertificates
                });
              }}
            >
              Retire Certificates
            </Button>
          </Space>
        </div>

        {currentUpload && (
          <Alert
            message="Upload in Progress"
            description={
              <div>
                <p>Uploading {getUploadTypeLabel(currentUpload.type)} data...</p>
                <Progress percent={uploadProgress} status="active" />
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Table
          columns={columns}
          dataSource={uploadHistory}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} uploads`
          }}
        />
      </Card>

      {/* Upload Modal */}
      <Modal
        title="Upload SSS Data"
        open={showUploadModal}
        onCancel={() => {
          setShowUploadModal(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpload}
        >
          <Form.Item
            name="upload_type"
            label="Upload Type"
            rules={[{ required: true, message: 'Please select upload type' }]}
          >
            <Select placeholder="Select upload type">
              {uploadTypes.map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="period"
            label="Data Period"
            rules={[{ required: true, message: 'Please select data period' }]}
          >
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['Start Date', 'End Date']}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea
              rows={3}
              placeholder="Optional description of the upload"
            />
          </Form.Item>

          <Form.Item
            name="data"
            label="Upload Data"
            rules={[{ required: true, message: 'Please provide upload data' }]}
          >
            <TextArea
              rows={10}
              placeholder="Enter JSON data or CSV content here..."
            />
          </Form.Item>

          <Alert
            message="Upload Guidelines"
            description={
              <ul>
                <li>Ensure data format matches the selected upload type</li>
                <li>For CSV uploads, include headers in the first row</li>
                <li>For JSON uploads, provide an array of objects</li>
                <li>All dates should be in ISO format (YYYY-MM-DD)</li>
                <li>Numeric values should not include commas or currency symbols</li>
              </ul>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Upload Data
              </Button>
              <Button onClick={() => {
                setShowUploadModal(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Upload Details Modal */}
      <Modal
        title="Upload Details"
        open={showViewModal}
        onCancel={() => {
          setShowViewModal(false);
          setSelectedUpload(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setShowViewModal(false);
            setSelectedUpload(null);
          }}>
            Close
          </Button>
        ]}
        width={800}
      >
        {selectedUpload && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Upload Type">
                {getUploadTypeLabel(selectedUpload.upload_type)}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedUpload.status)} icon={getStatusIcon(selectedUpload.status)}>
                  {selectedUpload.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Period Start">
                {new Date(selectedUpload.period_start).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label="Period End">
                {new Date(selectedUpload.period_end).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label="Records Valid">
                {selectedUpload.records_valid}
              </Descriptions.Item>
              <Descriptions.Item label="Records Invalid">
                {selectedUpload.records_invalid}
              </Descriptions.Item>
              <Descriptions.Item label="Upload Date">
                {new Date(selectedUpload.created_at).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                {selectedUpload.description || '-'}
              </Descriptions.Item>
            </Descriptions>

            {selectedUpload.errors && selectedUpload.errors.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>Validation Errors:</h4>
                <ul>
                  {selectedUpload.errors.map((error, index) => (
                    <li key={index} style={{ color: '#cf1322' }}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SSSDataUpload;
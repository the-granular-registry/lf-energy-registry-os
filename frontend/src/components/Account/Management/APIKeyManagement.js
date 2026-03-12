import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Typography,
  message,
  Space,
  Tag,
  Tooltip,
  Popconfirm,
  DatePicker,
  InputNumber,
  Select,
  Alert,
  Divider,
} from 'antd';
import {
  KeyOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { useUser } from '../../../context/UserContext';
import baseAPI from '../../../api/baseAPI';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const APIKeyManagement = () => {
  const { userData } = useUser();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState(null);
  const [newApiKeyVisible, setNewApiKeyVisible] = useState(false);
  const [newApiKeyValue, setNewApiKeyValue] = useState('');
  
  const [createForm] = Form.useForm();
  const [updateForm] = Form.useForm();

  // Load API keys on component mount
  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const response = await baseAPI.get('/auth/api-keys');
      setApiKeys(response.data);
    } catch (error) {
      console.error('Error loading API keys:', error);
      message.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async (values) => {
    try {
      const payload = {
        key_name: values.key_name,
        scopes: values.scopes || 'read',
        rate_limit: values.rate_limit || 1000,
        expires_at: values.expires_at ? values.expires_at.toISOString() : null,
      };

      const response = await baseAPI.post('/auth/api-keys', payload);
      
      // Show the new API key to the user (only time it will be visible)
      setNewApiKeyValue(response.data.api_key);
      setNewApiKeyVisible(true);
      
      message.success('API key created successfully!');
      setIsCreateModalVisible(false);
      createForm.resetFields();
      loadApiKeys();
    } catch (error) {
      console.error('Error creating API key:', error);
      message.error('Failed to create API key');
    }
  };

  const handleUpdateApiKey = async (values) => {
    try {
      const payload = {
        key_name: values.key_name,
        scopes: values.scopes,
        rate_limit: values.rate_limit,
        is_active: values.is_active,
        expires_at: values.expires_at ? values.expires_at.toISOString() : null,
      };

      await baseAPI.patch(`/auth/api-keys/${selectedApiKey.id}`, payload);
      
      message.success('API key updated successfully!');
      setIsUpdateModalVisible(false);
      setSelectedApiKey(null);
      updateForm.resetFields();
      loadApiKeys();
    } catch (error) {
      console.error('Error updating API key:', error);
      message.error('Failed to update API key');
    }
  };

  const handleDeleteApiKey = async (apiKeyId) => {
    try {
      await baseAPI.delete(`/auth/api-keys/${apiKeyId}`);
      message.success('API key deleted successfully!');
      loadApiKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      message.error('Failed to delete API key');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('Copied to clipboard!');
    });
  };

  const openUpdateModal = (apiKey) => {
    setSelectedApiKey(apiKey);
    updateForm.setFieldsValue({
      key_name: apiKey.key_name,
      scopes: apiKey.scopes,
      rate_limit: apiKey.rate_limit,
      is_active: apiKey.is_active,
      expires_at: apiKey.expires_at ? moment(apiKey.expires_at) : null,
    });
    setIsUpdateModalVisible(true);
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'key_name',
      key: 'key_name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Key Prefix',
      dataIndex: 'key_prefix',
      key: 'key_prefix',
      render: (text) => <Text code>{text}...</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Scopes',
      dataIndex: 'scopes',
      key: 'scopes',
      render: (scopes) => (
        <Tag color="blue">{scopes}</Tag>
      ),
    },
    {
      title: 'Rate Limit',
      dataIndex: 'rate_limit',
      key: 'rate_limit',
      render: (limit) => `${limit}/hour`,
    },
    {
      title: 'Last Used',
      dataIndex: 'last_used',
      key: 'last_used',
      render: (lastUsed) => (
        lastUsed ? moment(lastUsed).fromNow() : 'Never'
      ),
    },
    {
      title: 'Expires',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (expiresAt) => (
        expiresAt ? moment(expiresAt).format('YYYY-MM-DD') : 'Never'
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit API Key">
            <Button 
              type="link" 
              icon={<EditOutlined />} 
              onClick={() => openUpdateModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete API Key"
            description="Are you sure you want to delete this API key? This action cannot be undone."
            onConfirm={() => handleDeleteApiKey(record.id)}
            okText="Yes, Delete"
            cancelText="Cancel"
          >
            <Tooltip title="Delete API Key">
              <Button 
                type="link" 
                danger 
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card 
        title={
          <Space>
            <KeyOutlined />
            <span>API Key Management</span>
          </Space>
        }
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalVisible(true)}
          >
            Create API Key
          </Button>
        }
      >
        <Alert
          message="External API Access"
          description="API keys allow external systems like the Clean Incentive Marketplace to access your account data. Keep your API keys secure and never share them publicly."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={apiKeys}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      {/* Create API Key Modal */}
      <Modal
        title="Create New API Key"
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Alert
          message="Important"
          description="The API key will only be shown once during creation. Make sure to copy and store it securely."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateApiKey}
        >
          <Form.Item
            label="API Key Name"
            name="key_name"
            rules={[
              { required: true, message: 'Please enter a name for this API key' },
              { max: 255, message: 'Name must be less than 255 characters' }
            ]}
          >
            <Input placeholder="e.g., Clean Incentive Marketplace Access" />
          </Form.Item>

          <Form.Item
            label="Scopes"
            name="scopes"
            initialValue="read"
          >
            <Select>
              <Option value="read">Read Only</Option>
              <Option value="read,write">Read & Write</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Rate Limit (requests per hour)"
            name="rate_limit"
            initialValue={1000}
          >
            <InputNumber min={1} max={10000} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Expiration Date (optional)"
            name="expires_at"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Create API Key
              </Button>
              <Button onClick={() => {
                setIsCreateModalVisible(false);
                createForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Update API Key Modal */}
      <Modal
        title="Update API Key"
        open={isUpdateModalVisible}
        onCancel={() => {
          setIsUpdateModalVisible(false);
          setSelectedApiKey(null);
          updateForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={updateForm}
          layout="vertical"
          onFinish={handleUpdateApiKey}
        >
          <Form.Item
            label="API Key Name"
            name="key_name"
            rules={[
              { required: true, message: 'Please enter a name for this API key' },
              { max: 255, message: 'Name must be less than 255 characters' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Scopes"
            name="scopes"
          >
            <Select>
              <Option value="read">Read Only</Option>
              <Option value="read,write">Read & Write</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Rate Limit (requests per hour)"
            name="rate_limit"
          >
            <InputNumber min={1} max={10000} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Status"
            name="is_active"
            valuePropName="checked"
          >
            <Select>
              <Option value={true}>Active</Option>
              <Option value={false}>Inactive</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Expiration Date"
            name="expires_at"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Update API Key
              </Button>
              <Button onClick={() => {
                setIsUpdateModalVisible(false);
                setSelectedApiKey(null);
                updateForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* New API Key Display Modal */}
      <Modal
        title="API Key Created Successfully"
        open={newApiKeyVisible}
        onCancel={() => {
          setNewApiKeyVisible(false);
          setNewApiKeyValue('');
        }}
        footer={
          <Space>
            <Button 
              type="primary" 
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(newApiKeyValue)}
            >
              Copy to Clipboard
            </Button>
            <Button onClick={() => {
              setNewApiKeyVisible(false);
              setNewApiKeyValue('');
            }}>
              Close
            </Button>
          </Space>
        }
        width={600}
      >
        <Alert
          message="Save Your API Key"
          description="This is the only time you will see this API key. Copy it now and store it securely."
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <div style={{ marginBottom: 16 }}>
          <Text strong>Your new API key:</Text>
        </div>

        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '12px', 
          borderRadius: '4px',
          fontFamily: 'monospace',
          wordBreak: 'break-all',
          border: '1px solid #d9d9d9'
        }}>
          {newApiKeyValue}
        </div>

        <Divider />

        <div>
          <Title level={5}>Integration Instructions</Title>
          <Paragraph>
            To use this API key with the Clean Incentive Marketplace:
          </Paragraph>
          <ol>
            <li>Copy the API key above</li>
            <li>Go to the Clean Incentive Marketplace</li>
            <li>Navigate to your account settings</li>
            <li>Find the "External Registry Integration" section</li>
            <li>Paste your API key and save</li>
          </ol>
          <Paragraph>
            <Text strong>Base API URL:</Text> <Text code>{process.env.REACT_APP_API_URL || 'http://localhost:8000'}/external</Text>
          </Paragraph>
        </div>
      </Modal>
    </div>
  );
};

export default APIKeyManagement;
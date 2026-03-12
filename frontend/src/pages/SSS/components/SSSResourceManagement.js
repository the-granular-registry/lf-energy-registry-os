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
  Switch,
  InputNumber,
  Divider,
  Upload
} from 'antd';
import { 
  SettingOutlined, 
  PlusOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import Cookies from 'js-cookie';

const { Option } = Select;
const { TextArea } = Input;

const SSSResourceManagement = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState([]);
  const [devices, setDevices] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [editingResource, setEditingResource] = useState(null);
  const [bulkUploadedFile, setBulkUploadedFile] = useState(null);
  
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);

  const energySourceTypes = [
    { value: 'SOLAR', label: 'Solar' },
    { value: 'WIND', label: 'Wind' },
    { value: 'HYDRO', label: 'Hydroelectric' },
    { value: 'BIOMASS', label: 'Biomass' },
    { value: 'NUCLEAR', label: 'Nuclear' },
    { value: 'GEOTHERMAL', label: 'Geothermal' },
    { value: 'BATTERY_STORAGE', label: 'Battery Storage' },
    { value: 'CHP', label: 'Combined Heat & Power' },
    { value: 'OTHER', label: 'Other' }
  ];

  const recContractStatuses = [
    { value: 'OWNED', label: 'Owned' },
    { value: 'SOLD', label: 'Sold' },
    { value: 'PURCHASED', label: 'Purchased' }
  ];

  const bulkUploadProps = {
    name: 'file',
    multiple: false,
    accept: '.csv',
    onChange(info) {
      if (info.file.status === 'done') {
        setBulkUploadedFile(info.file);
        message.success(`${info.file.name} file uploaded successfully.`);
      }
    },
  };

  useEffect(() => {
    loadResources();
    loadDevices();
  }, []);

  const loadResources = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sss/resources', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setResources(data || []);
      } else {
        message.error('Failed to load SSS resources');
      }
    } catch (error) {
      console.error('Error loading SSS resources:', error);
      message.error('Error loading SSS resources');
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const response = await fetch('/api/devices', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDevices(data || []);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const handleCreateResource = async (values) => {
    try {
      const response = await fetch('/api/sss/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success('SSS resource created successfully');
        setShowCreateModal(false);
        form.resetFields();
        loadResources();
      } else {
        const errorData = await response.json();
        message.error(errorData.detail || 'Failed to create SSS resource');
      }
    } catch (error) {
      console.error('Error creating SSS resource:', error);
      message.error('Error creating SSS resource');
    }
  };

  const handleEditResource = async (values) => {
    if (!editingResource) return;

    try {
      const response = await fetch(`/api/sss/resources/${editingResource.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success('SSS resource updated successfully');
        setShowEditModal(false);
        setEditingResource(null);
        form.resetFields();
        loadResources();
      } else {
        message.error('Failed to update SSS resource');
      }
    } catch (error) {
      console.error('Error updating SSS resource:', error);
      message.error('Error updating SSS resource');
    }
  };

  const handleDeleteResource = async (resourceId) => {
    try {
      const response = await fetch(`/api/sss/resources/${resourceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        }
      });

      if (response.ok) {
        message.success('SSS resource deleted successfully');
        loadResources();
      } else {
        message.error('Failed to delete SSS resource');
      }
    } catch (error) {
      console.error('Error deleting SSS resource:', error);
      message.error('Error deleting SSS resource');
    }
  };

  const getDeviceName = (deviceId) => {
    const device = devices.find(d => d.id === deviceId);
    return device ? device.name : `Device ${deviceId}`;
  };

  const getEnergySourceLabel = (source) => {
    const sourceType = energySourceTypes.find(s => s.value === source);
    return sourceType ? sourceType.label : source;
  };

  const getRecContractStatusLabel = (status) => {
    const statusType = recContractStatuses.find(s => s.value === status);
    return statusType ? statusType.label : status;
  };

  const columns = [
    {
      title: 'Resource Name',
      dataIndex: 'resource_name',
      key: 'resource_name',
      width: 200,
      render: (text) => (
        <div style={{ fontWeight: 'bold' }}>{text}</div>
      )
    },
    {
      title: 'Device',
      dataIndex: 'device_id',
      key: 'device_id',
      width: 150,
      render: (deviceId) => getDeviceName(deviceId)
    },
    {
      title: 'Energy Source',
      dataIndex: 'energy_source',
      key: 'energy_source',
      width: 150,
      render: (source) => (
        <Tag color="blue">{getEnergySourceLabel(source)}</Tag>
      )
    },
    {
      title: 'Capacity (MW)',
      dataIndex: 'capacity_mw',
      key: 'capacity_mw',
      width: 120,
      render: (capacity) => `${capacity.toFixed(2)} MW`
    },
    {
      title: 'SSS Eligible',
      dataIndex: 'is_sss_eligible',
      key: 'is_sss_eligible',
      width: 120,
      render: (eligible) => (
        <Tag color={eligible ? 'green' : 'red'}>
          {eligible ? 'Yes' : 'No'}
        </Tag>
      )
    },
    {
      title: 'REC Contract',
      dataIndex: 'rec_contract_status',
      key: 'rec_contract_status',
      width: 120,
      render: (status) => (
        <Tag color="orange">{getRecContractStatusLabel(status)}</Tag>
      )
    },
    {
      title: 'Created Date',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedResource(record);
                setShowViewModal(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Edit Resource">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingResource(record);
                form.setFieldsValue({
                  device_id: record.device_id,
                  resource_name: record.resource_name,
                  energy_source: record.energy_source,
                  capacity_mw: record.capacity_mw,
                  is_sss_eligible: record.is_sss_eligible,
                  rec_contract_status: record.rec_contract_status
                });
                setShowEditModal(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Delete Resource">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: 'Delete SSS Resource',
                  content: `Are you sure you want to delete "${record.resource_name}"?`,
                  onOk: () => handleDeleteResource(record.id)
                });
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="sss-resource-management">
      <Card title="SSS Resource Management" className="sss-card">
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic
              title="Total Resources"
              value={resources.length}
              prefix={<SettingOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="SSS Eligible"
              value={resources.filter(r => r.is_sss_eligible).length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total Capacity"
              value={resources.reduce((sum, r) => sum + r.capacity_mw, 0).toFixed(2)}
              suffix="MW"
              prefix={<InfoCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Owned RECs"
              value={resources.filter(r => r.rec_contract_status === 'OWNED').length}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
        </Row>

        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowCreateModal(true)}
          >
            Add SSS Resource
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={resources}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} resources`
          }}
        />
      </Card>

      {/* Create Resource Modal */}
      <Modal
        title="Create SSS Resource"
        open={showCreateModal}
        onCancel={() => {
          setShowCreateModal(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateResource}
        >
          <Form.Item
            name="device_id"
            label="Device"
            rules={[{ required: true, message: 'Please select a device' }]}
          >
            <Select placeholder="Select a device">
              {devices.map(device => (
                <Option key={device.id} value={device.id}>
                  {device.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="resource_name"
            label="Resource Name"
            rules={[{ required: true, message: 'Please enter resource name' }]}
          >
            <Input placeholder="Enter resource name" />
          </Form.Item>

          <Form.Item
            name="energy_source"
            label="Energy Source"
            rules={[{ required: true, message: 'Please select energy source' }]}
          >
            <Select placeholder="Select energy source">
              {energySourceTypes.map(source => (
                <Option key={source.value} value={source.value}>
                  {source.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="capacity_mw"
            label="Capacity (MW)"
            rules={[{ required: true, message: 'Please enter capacity' }]}
          >
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: '100%' }}
              placeholder="Enter capacity in MW"
            />
          </Form.Item>

          <Form.Item
            name="is_sss_eligible"
            label="SSS Eligible"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="rec_contract_status"
            label="REC Contract Status"
            rules={[{ required: true, message: 'Please select REC contract status' }]}
          >
            <Select placeholder="Select REC contract status">
              {recContractStatuses.map(status => (
                <Option key={status.value} value={status.value}>
                  {status.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Create Resource
              </Button>
              <Button onClick={() => {
                setShowCreateModal(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Resource Modal */}
      <Modal
        title="Edit SSS Resource"
        open={showEditModal}
        onCancel={() => {
          setShowEditModal(false);
          setEditingResource(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditResource}
        >
          <Form.Item
            name="device_id"
            label="Device"
            rules={[{ required: true, message: 'Please select a device' }]}
          >
            <Select placeholder="Select a device">
              {devices.map(device => (
                <Option key={device.id} value={device.id}>
                  {device.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="resource_name"
            label="Resource Name"
            rules={[{ required: true, message: 'Please enter resource name' }]}
          >
            <Input placeholder="Enter resource name" />
          </Form.Item>

          <Form.Item
            name="energy_source"
            label="Energy Source"
            rules={[{ required: true, message: 'Please select energy source' }]}
          >
            <Select placeholder="Select energy source">
              {energySourceTypes.map(source => (
                <Option key={source.value} value={source.value}>
                  {source.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="capacity_mw"
            label="Capacity (MW)"
            rules={[{ required: true, message: 'Please enter capacity' }]}
          >
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: '100%' }}
              placeholder="Enter capacity in MW"
            />
          </Form.Item>

          <Form.Item
            name="is_sss_eligible"
            label="SSS Eligible"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="rec_contract_status"
            label="REC Contract Status"
            rules={[{ required: true, message: 'Please select REC contract status' }]}
          >
            <Select placeholder="Select REC contract status">
              {recContractStatuses.map(status => (
                <Option key={status.value} value={status.value}>
                  {status.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Update Resource
              </Button>
              <Button onClick={() => {
                setShowEditModal(false);
                setEditingResource(null);
                form.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Resource Modal */}
      <Modal
        title="SSS Resource Details"
        open={showViewModal}
        onCancel={() => {
          setShowViewModal(false);
          setSelectedResource(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setShowViewModal(false);
            setSelectedResource(null);
          }}>
            Close
          </Button>
        ]}
        width={600}
      >
        {selectedResource && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <strong>Resource Name:</strong>
                <p>{selectedResource.resource_name}</p>
              </Col>
              <Col span={12}>
                <strong>Device:</strong>
                <p>{getDeviceName(selectedResource.device_id)}</p>
              </Col>
              <Col span={12}>
                <strong>Energy Source:</strong>
                <p>{getEnergySourceLabel(selectedResource.energy_source)}</p>
              </Col>
              <Col span={12}>
                <strong>Capacity:</strong>
                <p>{selectedResource.capacity_mw.toFixed(2)} MW</p>
              </Col>
              <Col span={12}>
                <strong>SSS Eligible:</strong>
                <p>
                  <Tag color={selectedResource.is_sss_eligible ? 'green' : 'red'}>
                    {selectedResource.is_sss_eligible ? 'Yes' : 'No'}
                  </Tag>
                </p>
              </Col>
              <Col span={12}>
                <strong>REC Contract Status:</strong>
                <p>
                  <Tag color="orange">
                    {getRecContractStatusLabel(selectedResource.rec_contract_status)}
                  </Tag>
                </p>
              </Col>
              <Col span={24}>
                <strong>Created Date:</strong>
                <p>{new Date(selectedResource.created_at).toLocaleString()}</p>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      <Divider>Bulk Register SSS Resources</Divider>
      <Upload.Dragger {...bulkUploadProps}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Click or drag CSV file to upload</p>
        <p className="ant-upload-hint">Columns: asset_ID, tech_type, commissioning_date, eligibility_flag</p>
      </Upload.Dragger>
      {bulkUploadedFile && <Button type="primary">Process Bulk Upload</Button>}
    </div>
  );
};

export default SSSResourceManagement;
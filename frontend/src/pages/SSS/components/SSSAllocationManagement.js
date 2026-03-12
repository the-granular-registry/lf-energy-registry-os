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
  InputNumber,
  Upload,
  Divider
} from 'antd';
import { 
  LinkOutlined, 
  PlusOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import Cookies from 'js-cookie';

const { Option } = Select;
const { RangePicker } = DatePicker;

const SSSAllocationManagement = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [allocations, setAllocations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [loadFile, setLoadFile] = useState(null);
  
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);

  const allocationStatuses = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  useEffect(() => {
    loadAllocations();
    loadCustomers();
  }, []);

  const loadAllocations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sss/allocations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAllocations(data || []);
      } else {
        message.error('Failed to load SSS allocations');
      }
    } catch (error) {
      console.error('Error loading SSS allocations:', error);
      message.error('Error loading SSS allocations');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/accounts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data || []);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const handleCreateAllocation = async (values) => {
    try {
      // Convert date range to start and end dates
      const allocationData = {
        ...values,
        allocation_period_start: values.allocation_period[0].toISOString(),
        allocation_period_end: values.allocation_period[1].toISOString()
      };
      delete allocationData.allocation_period;

      const response = await fetch('/api/sss/allocations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        },
        body: JSON.stringify(allocationData)
      });

      if (response.ok) {
        message.success('SSS allocation created successfully');
        setShowCreateModal(false);
        form.resetFields();
        loadAllocations();
      } else {
        const errorData = await response.json();
        message.error(errorData.detail || 'Failed to create SSS allocation');
      }
    } catch (error) {
      console.error('Error creating SSS allocation:', error);
      message.error('Error creating SSS allocation');
    }
  };

  const handleEditAllocation = async (values) => {
    if (!editingAllocation) return;

    try {
      const allocationData = {
        ...values,
        allocation_period_start: values.allocation_period[0].toISOString(),
        allocation_period_end: values.allocation_period[1].toISOString()
      };
      delete allocationData.allocation_period;

      const response = await fetch(`/api/sss/allocations/${editingAllocation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        },
        body: JSON.stringify(allocationData)
      });

      if (response.ok) {
        message.success('SSS allocation updated successfully');
        setShowEditModal(false);
        setEditingAllocation(null);
        form.resetFields();
        loadAllocations();
      } else {
        message.error('Failed to update SSS allocation');
      }
    } catch (error) {
      console.error('Error updating SSS allocation:', error);
      message.error('Error updating SSS allocation');
    }
  };

  const handleDeleteAllocation = async (allocationId) => {
    try {
      const response = await fetch(`/api/sss/allocations/${allocationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        }
      });

      if (response.ok) {
        message.success('SSS allocation deleted successfully');
        loadAllocations();
      } else {
        message.error('Failed to delete SSS allocation');
      }
    } catch (error) {
      console.error('Error deleting SSS allocation:', error);
      message.error('Error deleting SSS allocation');
    }
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : `Customer ${customerId}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'green';
      case 'PENDING':
        return 'orange';
      case 'COMPLETED':
        return 'blue';
      case 'CANCELLED':
        return 'red';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircleOutlined />;
      case 'PENDING':
        return <ClockCircleOutlined />;
      case 'COMPLETED':
        return <CheckCircleOutlined />;
      case 'CANCELLED':
        return <ExclamationCircleOutlined />;
      default:
        return null;
    }
  };

  const columns = [
    {
      title: 'Customer',
      dataIndex: 'customer_account_id',
      key: 'customer_account_id',
      width: 200,
      render: (customerId) => (
        <div style={{ fontWeight: 'bold' }}>{getCustomerName(customerId)}</div>
      )
    },
    {
      title: 'Meter ID',
      dataIndex: 'meter_id',
      key: 'meter_id',
      width: 150,
      render: (meterId) => (
        <code style={{ backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>
          {meterId}
        </code>
      )
    },
    {
      title: 'Allocation Period',
      key: 'allocation_period',
      width: 200,
      render: (_, record) => (
        <div>
          <div>{new Date(record.allocation_period_start).toLocaleDateString()}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>to</div>
          <div>{new Date(record.allocation_period_end).toLocaleDateString()}</div>
        </div>
      )
    },
    {
      title: 'Load Ratio Share',
      dataIndex: 'load_ratio_share',
      key: 'load_ratio_share',
      width: 120,
      render: (share) => `${(share * 100).toFixed(2)}%`
    },
    {
      title: 'Allocated MWh',
      dataIndex: 'allocated_mwh',
      key: 'allocated_mwh',
      width: 120,
      render: (mwh) => `${mwh.toFixed(2)} MWh`
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
                setSelectedAllocation(record);
                setShowViewModal(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Edit Allocation">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingAllocation(record);
                form.setFieldsValue({
                  customer_account_id: record.customer_account_id,
                  meter_id: record.meter_id,
                  allocation_period: [
                    dayjs(record.allocation_period_start),
                    dayjs(record.allocation_period_end)
                  ],
                  load_ratio_share: record.load_ratio_share,
                  allocated_mwh: record.allocated_mwh
                });
                setShowEditModal(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Delete Allocation">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: 'Delete SSS Allocation',
                  content: `Are you sure you want to delete this allocation for ${getCustomerName(record.customer_account_id)}?`,
                  onOk: () => handleDeleteAllocation(record.id)
                });
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const loadUploadProps = {
    name: 'file',
    multiple: false,
    accept: '.csv,.json',
    onChange(info) {
      if (info.file.status === 'done') {
        setLoadFile(info.file);
        message.success(`${info.file.name} file uploaded successfully.`);
      }
    },
  };

  return (
    <div className="sss-allocation-management">
      <Card title="SSS Allocation Management" className="sss-card">
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic
              title="Total Allocations"
              value={allocations.length}
              prefix={<LinkOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Active Allocations"
              value={allocations.filter(a => a.status === 'ACTIVE').length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total Allocated"
              value={allocations.reduce((sum, a) => sum + a.allocated_mwh, 0).toFixed(2)}
              suffix="MWh"
              prefix={<InfoCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Pending Allocations"
              value={allocations.filter(a => a.status === 'PENDING').length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
        </Row>

        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowCreateModal(true)}
          >
            Create Allocation
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={allocations}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} allocations`
          }}
        />

        <Divider>Upload Interval Load File</Divider>
        <Upload.Dragger {...loadUploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag CSV/JSON file to upload</p>
          <p className="ant-upload-hint">Columns: hour, customer_ID, meter_ID, kWh</p>
        </Upload.Dragger>
        {loadFile && <Button type="primary">Allocate GCs</Button>}
      </Card>

      {/* Create Allocation Modal */}
      <Modal
        title="Create SSS Allocation"
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
          onFinish={handleCreateAllocation}
        >
          <Form.Item
            name="customer_account_id"
            label="Customer"
            rules={[{ required: true, message: 'Please select a customer' }]}
          >
            <Select placeholder="Select a customer">
              {customers.map(customer => (
                <Option key={customer.id} value={customer.id}>
                  {customer.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="meter_id"
            label="Meter ID"
            rules={[{ required: true, message: 'Please enter meter ID' }]}
          >
            <Input placeholder="Enter meter ID" />
          </Form.Item>

          <Form.Item
            name="allocation_period"
            label="Allocation Period"
            rules={[{ required: true, message: 'Please select allocation period' }]}
          >
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['Start Date', 'End Date']}
            />
          </Form.Item>

          <Form.Item
            name="load_ratio_share"
            label="Load Ratio Share"
            rules={[{ required: true, message: 'Please enter load ratio share' }]}
          >
            <InputNumber
              min={0}
              max={1}
              step={0.01}
              style={{ width: '100%' }}
              placeholder="Enter load ratio share (0-1)"
              formatter={(value) => `${(value * 100).toFixed(2)}%`}
              parser={(value) => parseFloat(value.replace('%', '')) / 100}
            />
          </Form.Item>

          <Form.Item
            name="allocated_mwh"
            label="Allocated MWh"
            rules={[{ required: true, message: 'Please enter allocated MWh' }]}
          >
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: '100%' }}
              placeholder="Enter allocated MWh"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Create Allocation
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

      {/* Edit Allocation Modal */}
      <Modal
        title="Edit SSS Allocation"
        open={showEditModal}
        onCancel={() => {
          setShowEditModal(false);
          setEditingAllocation(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditAllocation}
        >
          <Form.Item
            name="customer_account_id"
            label="Customer"
            rules={[{ required: true, message: 'Please select a customer' }]}
          >
            <Select placeholder="Select a customer">
              {customers.map(customer => (
                <Option key={customer.id} value={customer.id}>
                  {customer.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="meter_id"
            label="Meter ID"
            rules={[{ required: true, message: 'Please enter meter ID' }]}
          >
            <Input placeholder="Enter meter ID" />
          </Form.Item>

          <Form.Item
            name="allocation_period"
            label="Allocation Period"
            rules={[{ required: true, message: 'Please select allocation period' }]}
          >
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['Start Date', 'End Date']}
            />
          </Form.Item>

          <Form.Item
            name="load_ratio_share"
            label="Load Ratio Share"
            rules={[{ required: true, message: 'Please enter load ratio share' }]}
          >
            <InputNumber
              min={0}
              max={1}
              step={0.01}
              style={{ width: '100%' }}
              placeholder="Enter load ratio share (0-1)"
              formatter={(value) => `${(value * 100).toFixed(2)}%`}
              parser={(value) => parseFloat(value.replace('%', '')) / 100}
            />
          </Form.Item>

          <Form.Item
            name="allocated_mwh"
            label="Allocated MWh"
            rules={[{ required: true, message: 'Please enter allocated MWh' }]}
          >
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: '100%' }}
              placeholder="Enter allocated MWh"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Update Allocation
              </Button>
              <Button onClick={() => {
                setShowEditModal(false);
                setEditingAllocation(null);
                form.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Allocation Modal */}
      <Modal
        title="SSS Allocation Details"
        open={showViewModal}
        onCancel={() => {
          setShowViewModal(false);
          setSelectedAllocation(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setShowViewModal(false);
            setSelectedAllocation(null);
          }}>
            Close
          </Button>
        ]}
        width={600}
      >
        {selectedAllocation && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <strong>Customer:</strong>
                <p>{getCustomerName(selectedAllocation.customer_account_id)}</p>
              </Col>
              <Col span={12}>
                <strong>Meter ID:</strong>
                <p>
                  <code style={{ backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>
                    {selectedAllocation.meter_id}
                  </code>
                </p>
              </Col>
              <Col span={12}>
                <strong>Allocation Period:</strong>
                <p>
                  {new Date(selectedAllocation.allocation_period_start).toLocaleDateString()} to{' '}
                  {new Date(selectedAllocation.allocation_period_end).toLocaleDateString()}
                </p>
              </Col>
              <Col span={12}>
                <strong>Load Ratio Share:</strong>
                <p>{(selectedAllocation.load_ratio_share * 100).toFixed(2)}%</p>
              </Col>
              <Col span={12}>
                <strong>Allocated MWh:</strong>
                <p>{selectedAllocation.allocated_mwh.toFixed(2)} MWh</p>
              </Col>
              <Col span={12}>
                <strong>Status:</strong>
                <p>
                  <Tag color={getStatusColor(selectedAllocation.status)} icon={getStatusIcon(selectedAllocation.status)}>
                    {selectedAllocation.status}
                  </Tag>
                </p>
              </Col>
              <Col span={24}>
                <strong>Created Date:</strong>
                <p>{new Date(selectedAllocation.created_at).toLocaleString()}</p>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SSSAllocationManagement;
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
  Descriptions,
  Divider,
  Empty,
  Steps,
  Progress,
  Typography,
  Badge
} from 'antd';
import { 
  SettingOutlined, 
  PlusOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  FilterOutlined,
  BankOutlined,
  TeamOutlined,
  SafetyOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { mockSSSProviders, usStates } from '../mockData';

const { Option } = Select;
const { TextArea } = Input;
const { Text, Title } = Typography;

const SSSProviderManagement = ({ isAdmin = false }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [editingProvider, setEditingProvider] = useState(null);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    filterProviders();
  }, [providers, statusFilter]);

  const loadProviders = async () => {
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (isAdmin) {
        // Admin sees all providers
        setProviders(mockSSSProviders);
      } else {
        // Regular users see only their own provider
        const userProvider = mockSSSProviders.find(p => p.id === 1); // Mock user's provider
        setProviders(userProvider ? [userProvider] : []);
      }
    } catch (error) {
      message.error('Failed to load SSS providers');
    } finally {
      setLoading(false);
    }
  };

  const filterProviders = () => {
    let filtered = [...providers];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(provider => provider.status === statusFilter);
    }
    
    setFilteredProviders(filtered);
  };

  const handleCreateProvider = async (values) => {
    try {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newProvider = {
        id: Date.now(),
        provider_name: values.provider_name,
        provider_code: values.provider_code,
        regions_served: values.regions_served || [],
        compliance_contact_email: values.compliance_contact_email,
        compliance_contact_phone: values.compliance_contact_phone || null,
        status: 'PENDING',
        factor_count: 0,
        resource_count: 0,
        customer_count: 0,
        created_at: new Date().toISOString(),
        approved_at: null,
        approved_by: null
      };
      
      setProviders([...providers, newProvider]);
      message.success('SSS provider application submitted successfully');
      setShowCreateModal(false);
      form.resetFields();
    } catch (error) {
      message.error('Failed to create SSS provider');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProvider = async (values) => {
    if (!editingProvider) return;

    try {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedProviders = providers.map(provider => 
        provider.id === editingProvider.id 
          ? { ...provider, ...values, updated_at: new Date().toISOString() }
          : provider
      );
      
      setProviders(updatedProviders);
      message.success('SSS provider updated successfully');
      setShowEditModal(false);
      setEditingProvider(null);
      form.resetFields();
    } catch (error) {
      message.error('Failed to update SSS provider');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProvider = async (provider, approved) => {
    try {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedProviders = providers.map(p => 
        p.id === provider.id 
          ? { 
              ...p, 
              status: approved ? 'ACTIVE' : 'REJECTED',
              approved_at: approved ? new Date().toISOString() : null,
              approved_by: approved ? user.id : null
            }
          : p
      );
      
      setProviders(updatedProviders);
      message.success(`SSS provider ${approved ? 'approved' : 'rejected'} successfully`);
      setShowApprovalModal(false);
      setSelectedProvider(null);
    } catch (error) {
      message.error(`Failed to ${approved ? 'approve' : 'reject'} SSS provider`);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendProvider = async (provider) => {
    try {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedProviders = providers.map(p => 
        p.id === provider.id 
          ? { ...p, status: 'SUSPENDED' }
          : p
      );
      
      setProviders(updatedProviders);
      message.success('SSS provider suspended successfully');
    } catch (error) {
      message.error('Failed to suspend SSS provider');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadProviders();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'green';
      case 'PENDING':
        return 'orange';
      case 'SUSPENDED':
        return 'red';
      case 'REJECTED':
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
      case 'SUSPENDED':
      case 'REJECTED':
        return <ExclamationCircleOutlined />;
      default:
        return null;
    }
  };

  const getStatusDescription = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'Provider is active and can publish factors';
      case 'PENDING':
        return 'Provider application is pending approval';
      case 'SUSPENDED':
        return 'Provider is temporarily suspended';
      case 'REJECTED':
        return 'Provider application was rejected';
      default:
        return 'Unknown status';
    }
  };

  const activeProviders = providers.filter(provider => provider.status === 'ACTIVE');
  const pendingProviders = providers.filter(provider => provider.status === 'PENDING');
  const suspendedProviders = providers.filter(provider => provider.status === 'SUSPENDED');
  const totalFactors = activeProviders.reduce((sum, provider) => sum + (provider.factor_count || 0), 0);
  const totalResources = activeProviders.reduce((sum, provider) => sum + (provider.resource_count || 0), 0);
  const totalCustomers = activeProviders.reduce((sum, provider) => sum + (provider.customer_count || 0), 0);

  const columns = [
    {
      title: 'Provider',
      key: 'provider_info',
      width: 250,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {record.provider_name}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            <Text code>{record.provider_code}</Text>
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
            <EnvironmentOutlined style={{ marginRight: '4px' }} />
            {record.regions_served?.join(', ') || 'No regions'}
          </div>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status) => (
        <div>
          <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
            {status}
          </Tag>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
            {getStatusDescription(status)}
          </div>
        </div>
      )
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontSize: '12px', marginBottom: '2px' }}>
            <MailOutlined style={{ marginRight: '4px' }} />
            <a href={`mailto:${record.compliance_contact_email}`}>
              {record.compliance_contact_email}
            </a>
          </div>
          {record.compliance_contact_phone && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              <PhoneOutlined style={{ marginRight: '4px' }} />
              {record.compliance_contact_phone}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Statistics',
      key: 'statistics',
      width: 180,
      render: (_, record) => (
        <div>
          <Row gutter={8}>
            <Col span={8}>
              <Badge count={record.factor_count} showZero style={{ backgroundColor: '#52c41a' }}>
                <div style={{ fontSize: '11px' }}>Factors</div>
              </Badge>
            </Col>
            <Col span={8}>
              <Badge count={record.resource_count} showZero style={{ backgroundColor: '#1890ff' }}>
                <div style={{ fontSize: '11px' }}>Resources</div>
              </Badge>
            </Col>
            <Col span={8}>
              <Badge count={record.customer_count} showZero style={{ backgroundColor: '#faad14' }}>
                <div style={{ fontSize: '11px' }}>Customers</div>
              </Badge>
            </Col>
          </Row>
        </div>
      )
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date) => (
        <div>
          <div>{new Date(date).toLocaleDateString()}</div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {new Date(date).toLocaleTimeString()}
          </div>
        </div>
      ),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at)
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Tooltip title="View details">
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              size="small"
              onClick={() => {
                setSelectedProvider(record);
                setShowViewModal(true);
              }}
            />
          </Tooltip>
          
          {!isAdmin && record.status !== 'REJECTED' && (
            <Tooltip title="Edit provider">
              <Button 
                type="text" 
                icon={<EditOutlined />}
                size="small"
                onClick={() => {
                  setEditingProvider(record);
                  form.setFieldsValue(record);
                  setShowEditModal(true);
                }}
              />
            </Tooltip>
          )}
          
          {isAdmin && record.status === 'PENDING' && (
            <Tooltip title="Review application">
              <Button 
                type="text" 
                icon={<CheckOutlined />}
                size="small"
                onClick={() => {
                  setSelectedProvider(record);
                  setShowApprovalModal(true);
                }}
              />
            </Tooltip>
          )}
          
          {isAdmin && record.status === 'ACTIVE' && (
            <Tooltip title="Suspend provider">
              <Button 
                type="text" 
                danger
                icon={<CloseOutlined />}
                size="small"
                onClick={() => {
                  Modal.confirm({
                    title: 'Suspend SSS Provider',
                    content: `Are you sure you want to suspend ${record.provider_name}? This will prevent them from publishing new factors.`,
                    onOk: () => handleSuspendProvider(record)
                  });
                }}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="sss-provider-management">
      <Card 
        title={isAdmin ? "SSS Provider Approval" : "SSS Provider Management"} 
        className="provider-management-card"
      >
        <Alert
          message={isAdmin ? "SSS Provider Approval" : "SSS Provider Management"}
          description={
            isAdmin 
              ? "Review and approve SSS provider applications. Approved providers can publish verified factors and manage SSS resources."
              : "Manage your organization's SSS provider status and information. Once approved, you can publish verified factors and manage SSS resources."
          }
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        {/* Summary Statistics */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Statistic 
              title="Total Providers" 
              value={providers.length}
              prefix={<BankOutlined />}
              suffix="registered"
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Active Providers" 
              value={activeProviders.length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Pending Approval" 
              value={pendingProviders.length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Total Factors" 
              value={totalFactors}
              prefix={<SafetyOutlined />}
              suffix="published"
            />
          </Col>
        </Row>

        {/* Additional Statistics for Admin */}
        {isAdmin && (
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col span={6}>
              <Statistic 
                title="Suspended" 
                value={suspendedProviders.length}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="Total Resources" 
                value={totalResources}
                prefix={<EnvironmentOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="Total Customers" 
                value={totalCustomers}
                prefix={<TeamOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="Approval Rate" 
                value={providers.length > 0 ? ((activeProviders.length / providers.length) * 100).toFixed(1) : 0}
                suffix="%"
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
          </Row>
        )}

        <Divider />

        {/* Action Bar */}
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            {!isAdmin && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setShowCreateModal(true)}
              >
                Apply for SSS Provider Status
              </Button>
            )}
            <Button 
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
          
          <Space>
            <Text>Filter by status:</Text>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
            >
              <Option value="all">All Status</Option>
              <Option value="ACTIVE">Active</Option>
              <Option value="PENDING">Pending</Option>
              <Option value="SUSPENDED">Suspended</Option>
              <Option value="REJECTED">Rejected</Option>
            </Select>
          </Space>
        </div>

        {/* Providers Table */}
        <Table
          columns={columns}
          dataSource={filteredProviders}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} providers`
          }}
          scroll={{ x: 1000 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <p>No SSS providers found</p>
                    <p style={{ color: '#666' }}>
                      {isAdmin ? 'No provider applications to review.' : 'Apply for SSS provider status to get started.'}
                    </p>
                  </div>
                }
              />
            )
          }}
        />
      </Card>

      {/* Create Provider Modal */}
      <Modal
        title="Apply for SSS Provider Status"
        open={showCreateModal}
        onOk={() => form.submit()}
        onCancel={() => {
          setShowCreateModal(false);
          form.resetFields();
        }}
        okText="Submit Application"
        cancelText="Cancel"
        width={700}
        confirmLoading={loading}
      >
        <Alert
          message="SSS Provider Application"
          description="Apply to become an SSS provider to publish verified emissions factors and manage SSS resources. Your application will be reviewed by administrators."
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProvider}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="provider_name"
                label="Provider Name"
                rules={[{ required: true, message: 'Please enter provider name' }]}
              >
                <Input placeholder="e.g., Pacific Gas & Electric" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="provider_code"
                label="Provider Code"
                rules={[{ required: true, message: 'Please enter provider code' }]}
              >
                <Input placeholder="e.g., PGE-001" style={{ fontFamily: 'monospace' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="regions_served"
            label="Regions Served"
            rules={[{ required: true, message: 'Please select regions served' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select states/regions served"
              style={{ width: '100%' }}
            >
              {usStates.map(state => (
                <Option key={state.code} value={state.code}>
                  {state.name} ({state.code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="compliance_contact_email"
                label="Compliance Contact Email"
                rules={[
                  { required: true, message: 'Please enter compliance contact email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input placeholder="compliance@yourcompany.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="compliance_contact_phone"
                label="Compliance Contact Phone"
              >
                <Input placeholder="(555) 123-4567" />
              </Form.Item>
            </Col>
          </Row>

          <Alert
            message="Application Process"
            description={
              <div>
                <p>• Your application will be reviewed by administrators</p>
                <p>• You will be notified of the decision via email</p>
                <p>• Once approved, you can publish verified emissions factors</p>
                <p>• You can manage SSS resources and customer allocations</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginTop: '16px' }}
          />
        </Form>
      </Modal>

      {/* Edit Provider Modal */}
      <Modal
        title="Edit SSS Provider"
        open={showEditModal}
        onOk={() => form.submit()}
        onCancel={() => {
          setShowEditModal(false);
          setEditingProvider(null);
          form.resetFields();
        }}
        okText="Update Provider"
        cancelText="Cancel"
        width={700}
        confirmLoading={loading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditProvider}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="provider_name"
                label="Provider Name"
                rules={[{ required: true, message: 'Please enter provider name' }]}
              >
                <Input placeholder="e.g., Pacific Gas & Electric" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="provider_code"
                label="Provider Code"
                rules={[{ required: true, message: 'Please enter provider code' }]}
              >
                <Input placeholder="e.g., PGE-001" style={{ fontFamily: 'monospace' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="regions_served"
            label="Regions Served"
            rules={[{ required: true, message: 'Please select regions served' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select states/regions served"
              style={{ width: '100%' }}
            >
              {usStates.map(state => (
                <Option key={state.code} value={state.code}>
                  {state.name} ({state.code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="compliance_contact_email"
                label="Compliance Contact Email"
                rules={[
                  { required: true, message: 'Please enter compliance contact email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input placeholder="compliance@yourcompany.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="compliance_contact_phone"
                label="Compliance Contact Phone"
              >
                <Input placeholder="(555) 123-4567" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Approval Modal (Admin only) */}
      <Modal
        title="Review SSS Provider Application"
        open={showApprovalModal}
        onCancel={() => {
          setShowApprovalModal(false);
          setSelectedProvider(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setShowApprovalModal(false);
            setSelectedProvider(null);
          }}>
            Cancel
          </Button>,
          <Button key="reject" danger onClick={() => handleApproveProvider(selectedProvider, false)}>
            Reject
          </Button>,
          <Button key="approve" type="primary" onClick={() => handleApproveProvider(selectedProvider, true)}>
            Approve
          </Button>
        ]}
        width={600}
        confirmLoading={loading}
      >
        {selectedProvider && (
          <div>
            <Alert
              message="Provider Application Review"
              description="Review the provider application details carefully before making a decision. Approved providers will be able to publish verified emissions factors."
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />

            <Descriptions bordered>
              <Descriptions.Item label="Provider Name">
                {selectedProvider.provider_name}
              </Descriptions.Item>
              <Descriptions.Item label="Provider Code">
                <Text code>{selectedProvider.provider_code}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Regions Served">
                {selectedProvider.regions_served?.join(', ') || 'None'}
              </Descriptions.Item>
              <Descriptions.Item label="Contact Email">
                {selectedProvider.compliance_contact_email}
              </Descriptions.Item>
              <Descriptions.Item label="Contact Phone">
                {selectedProvider.compliance_contact_phone || 'Not provided'}
              </Descriptions.Item>
              <Descriptions.Item label="Application Date">
                {new Date(selectedProvider.created_at).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* View Provider Modal */}
      <Modal
        title="SSS Provider Details"
        open={showViewModal}
        onCancel={() => {
          setShowViewModal(false);
          setSelectedProvider(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setShowViewModal(false);
            setSelectedProvider(null);
          }}>
            Close
          </Button>
        ]}
        width={700}
      >
        {selectedProvider && (
          <div>
            <Descriptions bordered>
              <Descriptions.Item label="Provider Name">
                {selectedProvider.provider_name}
              </Descriptions.Item>
              <Descriptions.Item label="Provider Code">
                <Text code>{selectedProvider.provider_code}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedProvider.status)} icon={getStatusIcon(selectedProvider.status)}>
                  {selectedProvider.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Regions Served">
                {selectedProvider.regions_served?.join(', ') || 'None'}
              </Descriptions.Item>
              <Descriptions.Item label="Contact Email">
                <a href={`mailto:${selectedProvider.compliance_contact_email}`}>
                  {selectedProvider.compliance_contact_email}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label="Contact Phone">
                {selectedProvider.compliance_contact_phone || 'Not provided'}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {new Date(selectedProvider.created_at).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Approved">
                {selectedProvider.approved_at ? new Date(selectedProvider.approved_at).toLocaleString() : 'Not approved'}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Statistics</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="Published Factors"
                  value={selectedProvider.factor_count}
                  prefix={<SafetyOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="SSS Resources"
                  value={selectedProvider.resource_count}
                  prefix={<EnvironmentOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Customers"
                  value={selectedProvider.customer_count}
                  prefix={<TeamOutlined />}
                />
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SSSProviderManagement;
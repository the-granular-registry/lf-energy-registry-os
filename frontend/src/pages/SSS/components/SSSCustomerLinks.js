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
  Descriptions,
  Divider,
  Empty,
  Steps,
  Progress,
  Typography
} from 'antd';
import { 
  LinkOutlined, 
  PlusOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
  SafetyOutlined,
  TeamOutlined,
  HistoryOutlined,
  BankOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { mockSSSCustomerLinks, mockSSSProviders } from '../mockData';

const { Option } = Select;
const { Text, Title } = Typography;
const { Step } = Steps;

const SSSCustomerLinks = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState([]);
  const [providers, setProviders] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLink, setSelectedLink] = useState(null);
  const [filteredLinks, setFilteredLinks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    loadCustomerLinks();
    loadProviders();
  }, []);

  useEffect(() => {
    filterLinks();
  }, [links, statusFilter]);

  const loadCustomerLinks = async () => {
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLinks(mockSSSCustomerLinks);
    } catch (error) {
      message.error('Failed to load customer links');
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      // Filter only active providers
      const activeProviders = mockSSSProviders.filter(p => p.status === 'ACTIVE');
      setProviders(activeProviders);
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const filterLinks = () => {
    let filtered = [...links];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(link => link.status === statusFilter);
    }
    
    setFilteredLinks(filtered);
  };

  const handleCreateLink = async (values) => {
    try {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newLink = {
        link_id: Date.now(),
        provider_id: values.provider_id,
        provider_name: providers.find(p => p.id === values.provider_id)?.provider_name || 'Unknown Provider',
        customer_account_id: 1001, // Current user's account
        sss_account_id: values.sss_account_id,
        ownership_token: values.ownership_token || null,
        status: 'PENDING',
        allocated_gcs: 0,
        linked_at: null,
        created_at: new Date().toISOString()
      };
      
      setLinks([...links, newLink]);
      message.success('SSS customer link created successfully');
      setShowCreateModal(false);
      form.resetFields();
    } catch (error) {
      message.error('Failed to create customer link');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLink = async () => {
    if (!selectedLink) return;

    try {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the link status to REVOKED
      const updatedLinks = links.map(link => 
        link.link_id === selectedLink.link_id 
          ? { ...link, status: 'REVOKED' }
          : link
      );
      
      setLinks(updatedLinks);
      message.success('SSS customer link revoked successfully');
      setShowDeleteModal(false);
      setSelectedLink(null);
    } catch (error) {
      message.error('Failed to revoke customer link');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadCustomerLinks();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'green';
      case 'PENDING':
        return 'orange';
      case 'SUSPENDED':
        return 'red';
      case 'REVOKED':
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
      case 'REVOKED':
        return <ExclamationCircleOutlined />;
      default:
        return null;
    }
  };

  const getStatusDescription = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'Link is active and certificates are being allocated';
      case 'PENDING':
        return 'Link is pending provider approval';
      case 'SUSPENDED':
        return 'Link is temporarily suspended';
      case 'REVOKED':
        return 'Link has been permanently revoked';
      default:
        return 'Unknown status';
    }
  };

  const getLinkingSteps = (status) => {
    switch (status) {
      case 'PENDING':
        return 1;
      case 'ACTIVE':
        return 2;
      case 'REVOKED':
      case 'SUSPENDED':
        return 3;
      default:
        return 0;
    }
  };

  const activeLinks = links.filter(link => link.status === 'ACTIVE');
  const pendingLinks = links.filter(link => link.status === 'PENDING');
  const revokedLinks = links.filter(link => link.status === 'REVOKED');
  const totalAllocatedGCs = activeLinks.reduce((sum, link) => sum + (link.allocated_gcs || 0), 0);

  const columns = [
    {
      title: 'Provider',
      dataIndex: 'provider_name',
      key: 'provider_name',
      width: 200,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {providers.find(p => p.id === record.provider_id)?.provider_code || 'N/A'}
          </div>
        </div>
      )
    },
    {
      title: 'SSS Account ID',
      dataIndex: 'sss_account_id',
      key: 'sss_account_id',
      width: 150,
      render: (text) => (
        <div style={{ fontFamily: 'monospace' }}>
          <Text code>{text}</Text>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
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
      title: 'Progress',
      key: 'progress',
      width: 150,
      render: (_, record) => (
        <div>
          <Steps 
            size="small" 
            current={getLinkingSteps(record.status)}
            items={[
              { title: 'Created' },
              { title: 'Approved' },
              { title: 'Active' }
            ]}
          />
        </div>
      )
    },
    {
      title: 'GCs Allocated',
      dataIndex: 'allocated_gcs',
      key: 'allocated_gcs',
      width: 120,
      render: (gcs) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{gcs}</div>
          <div style={{ fontSize: '11px', color: '#666' }}>certificates</div>
        </div>
      ),
      sorter: (a, b) => a.allocated_gcs - b.allocated_gcs
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
      width: 140,
      render: (_, record) => (
        <Space>
          <Tooltip title="View details">
            <Button 
              type="text" 
              icon={<InfoCircleOutlined />}
              size="small"
              onClick={() => {
                setSelectedLink(record);
                setShowDetailModal(true);
              }}
            />
          </Tooltip>
          {record.status === 'ACTIVE' && (
            <Tooltip title="Revoke link">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
                size="small"
                onClick={() => {
                  setSelectedLink(record);
                  setShowDeleteModal(true);
                }}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="sss-customer-links">
      <Card title="My SSS Customer Links" className="customer-links-card">
        <Alert
          message="SSS Customer Links"
          description="Link your registry account to SSS sub-accounts provided by your utility. This allows you to automatically receive your pro-rata share of retired granular certificates based on your electricity consumption."
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        {/* Summary Statistics */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Statistic 
              title="Total Links" 
              value={links.length}
              prefix={<LinkOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Active Links" 
              value={activeLinks.length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Pending Approval" 
              value={pendingLinks.length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Certificates Received" 
              value={totalAllocatedGCs}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
        </Row>

        <Divider />

        {/* Action Bar */}
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
            >
              Create New Link
            </Button>
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
              <Option value="REVOKED">Revoked</Option>
            </Select>
          </Space>
        </div>

        {/* Links Table */}
        <Table
          columns={columns}
          dataSource={filteredLinks}
          rowKey="link_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} links`
          }}
          scroll={{ x: 1000 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <p>No SSS customer links found</p>
                    <p style={{ color: '#666' }}>
                      Create a new link to connect with your utility's SSS program.
                    </p>
                  </div>
                }
              />
            )
          }}
        />
      </Card>

      {/* Create Link Modal */}
      <Modal
        title="Create SSS Customer Link"
        open={showCreateModal}
        onOk={() => form.submit()}
        onCancel={() => {
          setShowCreateModal(false);
          form.resetFields();
        }}
        okText="Create Link"
        cancelText="Cancel"
        width={600}
        confirmLoading={loading}
      >
        <Alert
          message="Creating SSS Link"
          description="You are creating a link to connect your registry account with a utility's SSS program. This will allow automatic allocation of retired certificates based on your electricity consumption."
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateLink}
        >
          <Form.Item
            name="provider_id"
            label="SSS Provider"
            rules={[{ required: true, message: 'Please select an SSS provider' }]}
          >
            <Select placeholder="Select your utility or SSS provider">
              {providers.map(provider => (
                <Option key={provider.id} value={provider.id}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{provider.provider_name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {provider.provider_code} • {provider.regions_served?.join(', ')}
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="sss_account_id"
            label="SSS Account ID"
            rules={[
              { required: true, message: 'Please enter your SSS Account ID' },
              { min: 3, message: 'SSS Account ID must be at least 3 characters' }
            ]}
            extra="Enter the SSS Account ID provided by your utility"
          >
            <Input 
              placeholder="e.g., PGE-SSS-12345-ABC"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item
            name="ownership_token"
            label="Ownership Token (Optional)"
            extra="If provided by your utility, enter the ownership verification token"
          >
            <Input 
              placeholder="Enter ownership token if required"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Alert
            message="Important Information"
            description={
              <div>
                <p>• By creating this link, you authorize the utility to allocate retired granular certificates to your account.</p>
                <p>• The link will be pending until approved by the utility.</p>
                <p>• You can revoke the link at any time if needed.</p>
              </div>
            }
            type="warning"
            showIcon
            style={{ marginTop: '16px' }}
          />
        </Form>
      </Modal>

      {/* Delete Link Modal */}
      <Modal
        title="Revoke SSS Customer Link"
        open={showDeleteModal}
        onOk={handleDeleteLink}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedLink(null);
        }}
        okText="Revoke Link"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
        confirmLoading={loading}
      >
        {selectedLink && (
          <div>
            <Alert
              message="Confirm Link Revocation"
              description="This action cannot be undone. You will stop receiving automatic certificate allocations."
              type="warning"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            
            <Descriptions bordered>
              <Descriptions.Item label="Provider">
                {selectedLink.provider_name}
              </Descriptions.Item>
              <Descriptions.Item label="SSS Account ID">
                <Text code>{selectedLink.sss_account_id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Certificates Received">
                {selectedLink.allocated_gcs} certificates
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {new Date(selectedLink.created_at).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal
        title="SSS Customer Link Details"
        open={showDetailModal}
        onCancel={() => {
          setShowDetailModal(false);
          setSelectedLink(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setShowDetailModal(false);
            setSelectedLink(null);
          }}>
            Close
          </Button>
        ]}
        width={700}
      >
        {selectedLink && (
          <div>
            <Descriptions bordered>
              <Descriptions.Item label="Provider">
                <div>
                  <div style={{ fontWeight: 'bold' }}>{selectedLink.provider_name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {providers.find(p => p.id === selectedLink.provider_id)?.provider_code || 'N/A'}
                  </div>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="SSS Account ID">
                <Text code>{selectedLink.sss_account_id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedLink.status)} icon={getStatusIcon(selectedLink.status)}>
                  {selectedLink.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Certificates Allocated">
                {selectedLink.allocated_gcs} certificates
              </Descriptions.Item>
              <Descriptions.Item label="Ownership Token">
                {selectedLink.ownership_token ? (
                  <Text code>{selectedLink.ownership_token}</Text>
                ) : (
                  <Text type="secondary">Not provided</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {new Date(selectedLink.created_at).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Linked At">
                {selectedLink.linked_at ? (
                  new Date(selectedLink.linked_at).toLocaleString()
                ) : (
                  <Text type="secondary">Not yet linked</Text>
                )}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Link Progress</Divider>
            <Steps 
              current={getLinkingSteps(selectedLink.status)}
              items={[
                { 
                  title: 'Created', 
                  description: 'Link request submitted',
                  icon: <PlusOutlined />
                },
                { 
                  title: 'Approved', 
                  description: 'Provider approved the link',
                  icon: <CheckCircleOutlined />
                },
                { 
                  title: 'Active', 
                  description: 'Certificates being allocated',
                  icon: <SafetyOutlined />
                }
              ]}
            />

            <Divider>Provider Information</Divider>
            {(() => {
              const provider = providers.find(p => p.id === selectedLink.provider_id);
              return provider ? (
                <Descriptions bordered size="small">
                  <Descriptions.Item label="Provider Code">
                    {provider.provider_code}
                  </Descriptions.Item>
                  <Descriptions.Item label="Regions Served">
                    {provider.regions_served?.join(', ') || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Contact Email">
                    {provider.compliance_contact_email}
                  </Descriptions.Item>
                  <Descriptions.Item label="Contact Phone">
                    {provider.compliance_contact_phone || 'N/A'}
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <Text type="secondary">Provider information not available</Text>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SSSCustomerLinks;
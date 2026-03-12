import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useUser } from '../../context/UserContext';
import {
  Layout,
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  message,
  Popconfirm,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Spin,
  Alert,
  Descriptions,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  UserOutlined,
  HomeOutlined,
  GlobalOutlined,
  MailOutlined,
  LockOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  BankOutlined
} from '@ant-design/icons';

import {
  fetchAdminOrganizations,
  fetchOrganizationDetails,
  updateOrganization,
  deleteOrganization,
  fetchOrganizationUsers,
  fetchOrganizationStats,
  createOrganization
} from '../../store/organization/organizationThunk';
import { getOrganization } from '../../api/organization';
import {
  selectOrganizations,
  selectCurrentOrganization,
  selectOrganizationUsers,
  selectOrganizationStats,
  selectOrganizationLoading,
  selectOrganizationError,
  clearError,
  clearCurrentOrganization,
  setOrganizations
} from '../../store/organization/organizationSlice';

const { Content, Header } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const OrganizationManagement = () => {
  const dispatch = useDispatch();
  const { userData } = useUser();
  const organizations = useSelector(selectOrganizations);
  const currentOrganization = useSelector(selectCurrentOrganization);
  const organizationUsers = useSelector(selectOrganizationUsers);
  const organizationStats = useSelector(selectOrganizationStats);
  const loading = useSelector(selectOrganizationLoading);
  const error = useSelector(selectOrganizationError);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form] = Form.useForm();
  const [userOrgsLoading, setUserOrgsLoading] = useState(false);
  // Super admin scope: 'all' or 'my'
  const [saScope, setSaScope] = useState('all');

  // Role-based access control
  const isSuperAdmin = userData?.userInfo?.role === 'SUPER_ADMIN' || userData?.userInfo?.role === 5;
  const isAdmin = userData?.userInfo?.role === 'ADMIN' || userData?.userInfo?.role === 4;
  const isRegularUser = !isAdmin && !isSuperAdmin;
  const userOrganization = userData?.userInfo?.organisation;

  useEffect(() => {
    const load = async () => {
      if (isSuperAdmin || isAdmin) {
        dispatch(fetchAdminOrganizations());
        return;
      }

      // Regular user: derive organizations from user's accounts
      try {
        setUserOrgsLoading(true);
        const accountOrgs = Array.from(new Set((userData?.accounts || [])
          .map(acc => acc.organization_id)
          .filter(Boolean)));

        if (accountOrgs.length === 0) {
          dispatch(setOrganizations([]));
          return;
        }

        const orgs = await Promise.all(accountOrgs.map(async (orgId) => {
          try {
            const res = await getOrganization(orgId);
            return res.data;
          } catch (e) {
            return null;
          }
        }));

        dispatch(setOrganizations(orgs.filter(Boolean)));
      } finally {
        setUserOrgsLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isSuperAdmin, isAdmin, userData?.accounts]);

  // Load organization details for admin users
  useEffect(() => {
    if (isAdmin && !isSuperAdmin && filteredOrganizations.length > 0) {
      const adminOrg = filteredOrganizations[0];
      dispatch(fetchOrganizationDetails(adminOrg.id));
      dispatch(fetchOrganizationUsers(adminOrg.id));
      dispatch(fetchOrganizationStats(adminOrg.id));
    }
  }, [isAdmin, isSuperAdmin, filteredOrganizations, dispatch]);

  useEffect(() => {
    if (error) {
      message.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleEdit = (organization) => {
    // Admin users can only edit their own organization
    if (isAdmin && !isSuperAdmin) {
      if (organization.name !== userOrganization) {
        message.error('You can only edit your own organization');
        return;
      }
    }

    form.setFieldsValue({
      name: organization.name,
      address: organization.address,
      primary_contact_email: organization.primary_contact_email,
      business_registration_number: organization.business_registration_number,
      website: organization.website,
      organization_type: organization.organization_type,
      status: organization.status
    });
    dispatch(fetchOrganizationDetails(organization.id));
    setIsEditModalVisible(true);
  };

  const handleDelete = async (organizationId) => {
    // Only super admins can delete organizations
    if (!isSuperAdmin) {
      message.error('Only super administrators can delete organizations');
      return;
    }

    try {
      await dispatch(deleteOrganization(organizationId)).unwrap();
      message.success('Organization deleted successfully');
    } catch (error) {
      message.error('Failed to delete organization');
    }
  };

  const handleSave = async (values) => {
    try {
      if (currentOrganization) {
        // Update existing organization
        await dispatch(updateOrganization({
          organizationId: currentOrganization.id,
          updateData: values
        })).unwrap();
        message.success('Organization updated successfully');
      } else {
        // Create new organization
        await dispatch(createOrganization(values)).unwrap();
        message.success('Organization created successfully');
      }
      setIsEditModalVisible(false);
      dispatch(fetchAdminOrganizations());
    } catch (error) {
      message.error(currentOrganization ? 'Failed to update organization' : 'Failed to create organization');
    }
  };

  const handleViewDetails = (organization) => {
    dispatch(fetchOrganizationDetails(organization.id));
    dispatch(fetchOrganizationUsers(organization.id));
    dispatch(fetchOrganizationStats(organization.id));
    setIsDetailsModalVisible(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'green';
      case 'PENDING': return 'orange';
      case 'SUSPENDED': return 'red';
      case 'REJECTED': return 'red';
      default: return 'default';
    }
  };

  const getOrganizationTypeDisplay = (type) => {
    if (!type) return '-';
    return type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  // Filter organizations based on user role
  const getFilteredOrganizations = () => {
    let filtered = organizations.filter(org => {
      const matchesSearch = !searchText || 
        org.name.toLowerCase().includes(searchText.toLowerCase()) ||
        org.primary_contact_email.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = !statusFilter || org.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Admin users only see their own organization
    if (isAdmin && !isSuperAdmin) {
      filtered = filtered.filter(org => org.name === userOrganization);
    }

    // Super admin scope
    if (isSuperAdmin && saScope === 'my' && userOrganization) {
      filtered = filtered.filter(org => org.name === userOrganization);
    }

    return filtered;
  };

  const filteredOrganizations = getFilteredOrganizations();
  const adminOrganization = isAdmin && !isSuperAdmin ? filteredOrganizations[0] : null;

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ID: {record.id}
          </Text>
        </div>
      ),
    },
    {
      title: 'Contact Email',
      dataIndex: 'primary_contact_email',
      key: 'primary_contact_email',
      render: (email) => (
        <Text copyable={{ text: email }}>
          <MailOutlined /> {email}
        </Text>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'organization_type',
      key: 'organization_type',
      render: (type) => (
        <Tag color="blue">{getOrganizationTypeDisplay(type)}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: 'Users',
      dataIndex: 'user_count',
      key: 'user_count',
      render: (count) => (
        <Text>
          <UserOutlined /> {count}
        </Text>
      ),
    },
    {
      title: 'Accounts',
      dataIndex: 'account_count',
      key: 'account_count',
      render: (count) => (
        <Text>
          <HomeOutlined /> {count}
        </Text>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<SearchOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            Details
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={isAdmin && !isSuperAdmin && record.name !== userOrganization}
          >
            Edit
          </Button>
          {isSuperAdmin && (
            <Popconfirm
              title="Are you sure you want to delete this organization?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              >
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Admin Organization Card Component
  const AdminOrganizationCard = ({ organization }) => {
    if (!organization) return null;

    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={3} style={{ margin: 0 }}>
                <BankOutlined /> {organization.name}
              </Title>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => handleEdit(organization)}
              >
                Edit Organization
              </Button>
            </div>
          }
          style={{ marginBottom: '24px' }}
        >
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Organization ID" span={1}>
              {organization.id}
            </Descriptions.Item>
            <Descriptions.Item label="Status" span={1}>
              <Tag color={getStatusColor(organization.status)}>
                {organization.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Contact Email" span={2}>
              <MailOutlined /> {organization.primary_contact_email}
            </Descriptions.Item>
            <Descriptions.Item label="Address" span={2}>
              <EnvironmentOutlined /> {organization.address}
            </Descriptions.Item>
            <Descriptions.Item label="Organization Type" span={1}>
              <Tag color="blue">{getOrganizationTypeDisplay(organization.organization_type)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Created" span={1}>
              <CalendarOutlined /> {new Date(organization.created_at).toLocaleDateString()}
            </Descriptions.Item>
            {organization.website && (
              <Descriptions.Item label="Website" span={2}>
                <GlobalOutlined /> {organization.website}
              </Descriptions.Item>
            )}
            {organization.business_registration_number && (
              <Descriptions.Item label="Business Registration" span={2}>
                {organization.business_registration_number}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Statistics Cards */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="Users"
                value={organizationStats?.active_users || organization.user_count || 0}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Accounts"
                value={organizationStats?.active_accounts || organization.account_count || 0}
                prefix={<HomeOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Status"
                value={organization.status}
                valueStyle={{ color: getStatusColor(organization.status) === 'green' ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Organization Users Table */}
        <Card title="Organization Users">
          <Table
            dataSource={organizationUsers}
            columns={[
              {
                title: 'Name',
                dataIndex: 'name',
                key: 'name',
              },
              {
                title: 'Email',
                dataIndex: 'email',
                key: 'email',
              },
              {
                title: 'Role',
                dataIndex: 'role',
                key: 'role',
                render: (role) => (
                  <Tag color="blue">
                    {typeof role === 'object' ? role.name : role}
                  </Tag>
                ),
              },
            ]}
            rowKey="id"
            pagination={false}
            size="small"
            loading={loading}
          />
        </Card>
      </div>
    );
  };

  // Regular User Organization Card (read-only)
  const UserOrganizationCard = ({ organization }) => {
    if (!organization) return null;
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={3} style={{ margin: 0 }}>
                <BankOutlined /> {organization.name}
              </Title>
            </div>
          }
          style={{ marginBottom: '24px' }}
        >
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Organization ID" span={1}>
              {organization.id}
            </Descriptions.Item>
            <Descriptions.Item label="Status" span={1}>
              <Tag color={getStatusColor(organization.status)}>
                {organization.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Contact Email" span={2}>
              <MailOutlined /> {organization.primary_contact_email}
            </Descriptions.Item>
            <Descriptions.Item label="Address" span={2}>
              <EnvironmentOutlined /> {organization.address}
            </Descriptions.Item>
            <Descriptions.Item label="Organization Type" span={1}>
              <Tag color="blue">{getOrganizationTypeDisplay(organization.organization_type)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Created" span={1}>
              <CalendarOutlined /> {new Date(organization.created_at).toLocaleDateString()}
            </Descriptions.Item>
            {organization.website && (
              <Descriptions.Item label="Website" span={2}>
                <GlobalOutlined /> {organization.website}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      </div>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ padding: '24px' }}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
          <Header style={{ background: 'transparent', padding: 0, marginBottom: '24px' }}>
            <Title level={2}>Organization Management</Title>
          </Header>

          {loading || userOrgsLoading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Spin size="large" />
              <p>Loading organization data...</p>
            </div>
          ) : isRegularUser ? (
            // Regular User Layout - Read-only cards for member organizations
            <div>
              {filteredOrganizations.length > 0 ? (
                filteredOrganizations.map(org => (
                  <UserOrganizationCard key={org.id} organization={org} />
                ))
              ) : (
                <Alert
                  message="No Organization Found"
                  description="We could not find any organizations linked to your accounts."
                  type="info"
                  showIcon
                />
              )}
            </div>
          ) : isAdmin && !isSuperAdmin ? (
            // Admin Layout - Card-based view
            <div>
              {adminOrganization ? (
                <AdminOrganizationCard organization={adminOrganization} />
              ) : (
                <Alert
                  message="No Organization Found"
                  description="Your organization could not be found. Please contact your administrator."
                  type="warning"
                  showIcon
                />
              )}
            </div>
          ) : (
            // Super Admin Layout - Table-based view
            <div>
              {/* Filter and Search Controls */}
              <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={8}>
                  <Input
                    placeholder="Search organizations..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </Col>
                <Col span={6}>
                  <Select
                    placeholder="Filter by status"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    <Option value="ACTIVE">Active</Option>
                    <Option value="PENDING">Pending</Option>
                    <Option value="SUSPENDED">Suspended</Option>
                    <Option value="REJECTED">Rejected</Option>
                  </Select>
                </Col>
                {isSuperAdmin && (
                  <Col span={6}>
                    <Select value={saScope} onChange={setSaScope} style={{ width: '100%' }}>
                      <Option value="all">All organizations</Option>
                      <Option value="my">My organization</Option>
                    </Select>
                  </Col>
                )}
                <Col span={6}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      form.resetFields();
                      setIsEditModalVisible(true);
                      dispatch(clearCurrentOrganization());
                    }}
                  >
                    Add Organization
                  </Button>
                </Col>
              </Row>

              {/* Organizations Table */}
              <Table
                columns={columns}
                dataSource={filteredOrganizations}
                rowKey="id"
                loading={loading}
                pagination={{
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} of ${total} organizations`,
                }}
              />
            </div>
          )}

          {/* Edit Organization Modal */}
          <Modal
            title={currentOrganization ? "Edit Organization" : "Add Organization"}
            open={isEditModalVisible}
            onCancel={() => setIsEditModalVisible(false)}
            onOk={() => form.submit()}
            confirmLoading={loading}
            width={600}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
            >
              <Form.Item
                label="Organization Name"
                name="name"
                rules={[{ required: true, message: 'Please input organization name!' }]}
              >
                <Input disabled={isAdmin && !isSuperAdmin} />
              </Form.Item>

              <Form.Item
                label="Primary Contact Email"
                name="primary_contact_email"
                rules={[
                  { required: true, message: 'Please input contact email!' },
                  { type: 'email', message: 'Please enter a valid email!' }
                ]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Address"
                name="address"
                rules={[{ required: true, message: 'Please input address!' }]}
              >
                <Input.TextArea rows={3} />
              </Form.Item>

              <Form.Item
                label="Business Registration Number"
                name="business_registration_number"
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Website"
                name="website"
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Organization Type"
                name="organization_type"
              >
                <Select placeholder="Select organization type">
                  <Option value="ENERGY_PRODUCER">Energy Producer</Option>
                  <Option value="TRADER">Trader</Option>
                  <Option value="CONSUMER">Consumer</Option>
                </Select>
              </Form.Item>

              {isSuperAdmin && (
                <Form.Item
                  label="Status"
                  name="status"
                >
                  <Select placeholder="Select status">
                    <Option value="PENDING">Pending</Option>
                    <Option value="ACTIVE">Active</Option>
                    <Option value="SUSPENDED">Suspended</Option>
                    <Option value="REJECTED">Rejected</Option>
                  </Select>
                </Form.Item>
              )}
            </Form>
          </Modal>

          {/* Organization Details Modal */}
          <Modal
            title="Organization Details"
            open={isDetailsModalVisible}
            onCancel={() => {
              setIsDetailsModalVisible(false);
              dispatch(clearCurrentOrganization());
            }}
            footer={null}
            width={800}
          >
            {currentOrganization && (
              <div>
                <Row gutter={16}>
                  <Col span={12}>
                    <Card title="Organization Information" size="small">
                      <p><strong>Name:</strong> {currentOrganization.name}</p>
                      <p><strong>Email:</strong> {currentOrganization.primary_contact_email}</p>
                      <p><strong>Address:</strong> {currentOrganization.address}</p>
                      <p><strong>Type:</strong> {getOrganizationTypeDisplay(currentOrganization.organization_type)}</p>
                      <p><strong>Status:</strong> 
                        <Tag color={getStatusColor(currentOrganization.status)} style={{ marginLeft: '8px' }}>
                          {currentOrganization.status}
                        </Tag>
                      </p>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="Statistics" size="small">
                      <Row gutter={16}>
                        <Col span={12}>
                          <Statistic
                            title="Users"
                            value={organizationStats?.active_users || 0}
                            prefix={<UserOutlined />}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Accounts"
                            value={organizationStats?.active_accounts || 0}
                            prefix={<HomeOutlined />}
                          />
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                </Row>

                <Card title="Organization Users" style={{ marginTop: '16px' }}>
                  <Table
                    dataSource={organizationUsers}
                    columns={[
                      {
                        title: 'Name',
                        dataIndex: 'name',
                        key: 'name',
                      },
                      {
                        title: 'Email',
                        dataIndex: 'email',
                        key: 'email',
                      },
                      {
                        title: 'Role',
                        dataIndex: 'role',
                        key: 'role',
                        render: (role) => (
                          <Tag color="blue">
                            {typeof role === 'object' ? role.name : role}
                          </Tag>
                        ),
                      },
                    ]}
                    rowKey="id"
                    pagination={false}
                    size="small"
                  />
                </Card>
              </div>
            )}
          </Modal>
        </div>
      </Content>
    </Layout>
  );
};

export default OrganizationManagement; 
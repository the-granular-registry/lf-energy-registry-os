import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Tag,
  Typography,
  Popconfirm,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined
} from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { logger } from '../../utils';
import { 
  getAllUsersAPI, 
  createUserAnyOrgAPI, 
  updateUserAPI, 
  deleteUserAPI,
  activateUserAPI,
  suspendUserAPI
} from '../../api/superAdminAPI';
import { getOrganizationsAPI } from '../../api/organizationAPI';
import { getAllAccountsAPI } from '../../api/superAdminAPI';
import { Modal as AntdModal } from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;

const SuperAdminUserManagement = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  // Modal states
  const [isCreateUserVisible, setIsCreateUserVisible] = useState(false);
  const [isEditUserVisible, setIsEditUserVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    organizationId: null,
    status: null,
    role: null
  });

  // Forms
  const [createUserForm] = Form.useForm();
  const [editUserForm] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchAccountsForOrg = async (orgId) => {
    if (!orgId) {
      setAccounts([]);
      return;
    }
    try {
      const { data } = await getAllAccountsAPI(orgId, null, null);
      // Backend returns { accounts: [...], pagination: {...} } in many places
      const accountList = Array.isArray(data?.accounts)
        ? data.accounts
        : Array.isArray(data)
          ? data
          : [];
      setAccounts(accountList);
    } catch (e) {
      logger.error('Failed to load accounts', e);
      setAccounts([]);
    }
  };

  useEffect(() => {
    const orgId = createUserForm.getFieldValue('organization_id');
    if (orgId) fetchAccountsForOrg(orgId);
  }, [isCreateUserVisible]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch users and organizations separately to handle partial failures
      let usersData = [];
      let organizationsData = [];

      try {
        logger.debug('Fetching users with filters:', filters);
        const usersRes = await getAllUsersAPI(filters.organizationId, filters.status);
        usersData = usersRes.data || [];
        logger.debug('Users loaded successfully:', {
          count: usersData.length,
          organizationFilter: filters.organizationId,
          users: usersData.map(u => ({ id: u.id, name: u.name, organisation: u.organisation, organization_id: u.organization_id }))
        });
      } catch (userError) {
        logger.error('Error fetching users:', userError);
        message.error('Failed to load users');
      }

      try {
        const orgsRes = await getOrganizationsAPI();
        organizationsData = orgsRes.data || [];
        logger.debug('Organizations loaded successfully:', {
          count: organizationsData.length,
          organizations: organizationsData.map(o => ({ id: o.id, name: o.name }))
        });
      } catch (orgError) {
        logger.error('Error fetching organizations:', orgError);
        message.warning('Failed to load organizations for filtering. You can still manage users.');
      }

      // Apply role filter if selected
      if (filters.role) {
        usersData = usersData.filter(user => 
          user.role === filters.role || user.role === parseInt(filters.role)
        );
      }

      setUsers(usersData);
      setOrganizations(organizationsData);
    } catch (error) {
      logger.error('Error in fetchData:', error);
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (values) => {
    try {
      setLoading(true);
      const response = await createUserAnyOrgAPI({
        name: values.name,
        email: values.email,
        role: values.role,
        organization_id: values.organization_id,
        account_id: values.account_id,
        organisation: values.organisation
      }, values.mfa_token || 'placeholder');

      const resp = response?.data || {};

      AntdModal.success({
        title: 'User created',
        content: (
          <div>
            <p><b>Name:</b> {resp.name}</p>
            <p><b>Email:</b> {resp.email}</p>
            {resp.temporary_password && (
              <p>
                <b>Temporary Password:</b> 
                <span style={{ marginLeft: 8, fontFamily: 'monospace' }}>{resp.temporary_password}</span>
                <Button size="small" style={{ marginLeft: 8 }} onClick={() => {
                  navigator.clipboard.writeText(resp.temporary_password);
                  message.success('Password copied to clipboard');
                }}>Copy</Button>
              </p>
            )}
          </div>
        )
      });

      setIsCreateUserVisible(false);
      createUserForm.resetFields();
      fetchData();
    } catch (error) {
      logger.error('Error creating user:', error);
      message.error(error.response?.data?.detail || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (values) => {
    try {
      setLoading(true);
      
      // Find the organization name from the selected organization_id
      const selectedOrganization = organizations.find(org => org.id === values.organization_id);
      const organisationName = selectedOrganization ? selectedOrganization.name : null;
      
      await updateUserAPI(selectedUser.id, {
        name: values.name,
        email: values.email,
        role: values.role,
        organisation: organisationName  // Backend expects 'organisation' string field
      });
      
      message.success('User updated successfully');
      setIsEditUserVisible(false);
      setSelectedUser(null);
      editUserForm.resetFields();
      fetchData();
    } catch (error) {
      logger.error('Error updating user:', error);
      message.error(error.response?.data?.detail || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, reason) => {
    try {
      setLoading(true);
      await deleteUserAPI(userId, { 
        reason, 
        mfa_token: 'placeholder' // MFA now optional
      });
      message.success('User deleted successfully');
      fetchData();
    } catch (error) {
      logger.error('Error deleting user:', error);
      message.error(error.response?.data?.detail || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId, action) => {
    try {
      setLoading(true);
      if (action === 'activate') {
        await activateUserAPI(userId);
        message.success('User activated successfully');
      } else if (action === 'suspend') {
        await suspendUserAPI(userId, 'Suspended by super admin');
        message.success('User suspended successfully');
      }
      fetchData();
    } catch (error) {
      logger.error(`Error ${action}ing user:`, error);
      message.error(`Failed to ${action} user`);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role) => {
    const roleMap = {
      5: 'purple',
      'SUPER_ADMIN': 'purple',
      4: 'red',
      'ADMIN': 'red',
      3: 'blue',
      'PRODUCTION_USER': 'blue',
      2: 'green',
      'TRADING_USER': 'green',
      1: 'orange',
      'AUDIT_USER': 'orange'
    };
    return roleMap[role] || 'default';
  };

  const getRoleText = (role) => {
    const roleMap = {
      5: 'Super Admin',
      'SUPER_ADMIN': 'Super Admin',
      4: 'Admin',
      'ADMIN': 'Admin',
      3: 'Production User',
      'PRODUCTION_USER': 'Production User',
      2: 'Trading User',
      'TRADING_USER': 'Trading User',
      1: 'Audit User',
      'AUDIT_USER': 'Audit User'
    };
    return roleMap[role] || role;
  };

  const getStatusColor = (status) => {
    const colors = {
      ACTIVE: 'green',
      PENDING: 'orange',
      SUSPENDED: 'red'
    };
    return colors[status] || 'default';
  };

  const userColumns = [
    {
      title: 'User',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          <UserOutlined />
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.email}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Organization',
      dataIndex: 'organisation',
      key: 'organisation',
      render: (org, record) => (
        <div>
          <div>{org || 'No Organization'}</div>
          {record.organization_id && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              ID: {record.organization_id}
            </Text>
          )}
        </div>
      )
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={getRoleColor(role)}>
          {getRoleText(role)}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'user_status',
      key: 'user_status',
      render: (status) => {
        const statusIcons = {
          ACTIVE: <CheckCircleOutlined />,
          PENDING: <ClockCircleOutlined />,
          SUSPENDED: <StopOutlined />
        };
        return (
          <Tag color={getStatusColor(status)} icon={statusIcons[status]}>
            {status || 'ACTIVE'}
          </Tag>
        );
      }
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A'
    },
    {
      title: 'Last Login',
      dataIndex: 'last_login',
      key: 'last_login',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'Never'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.user_status === 'SUSPENDED' && (
            <Tooltip title="Activate User">
              <Button
                type="text"
                icon={<CheckCircleOutlined />}
                onClick={() => handleStatusChange(record.id, 'activate')}
                size="small"
                style={{ color: 'green' }}
              />
            </Tooltip>
          )}
          {record.user_status !== 'SUSPENDED' && (
            <Tooltip title="Suspend User">
              <Button
                type="text"
                icon={<StopOutlined />}
                onClick={() => handleStatusChange(record.id, 'suspend')}
                size="small"
                style={{ color: 'orange' }}
              />
            </Tooltip>
          )}
          <Tooltip title="Edit User">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedUser(record);
                
                // Find organization_id if not present but organisation string exists
                let orgId = record.organization_id;
                if (!orgId && record.organisation) {
                  const matchingOrg = organizations.find(org => org.name === record.organisation);
                  orgId = matchingOrg ? matchingOrg.id : null;
                }
                
                editUserForm.setFieldsValue({
                  name: record.name,
                  email: record.email,
                  role: record.role,
                  organization_id: orgId
                });
                setIsEditUserVisible(true);
              }}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Delete User">
            <Popconfirm
              title="Delete User"
              description="Are you sure you want to delete this user? This action cannot be undone."
              onConfirm={() => handleDeleteUser(record.id, 'Super admin deletion')}
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
                size="small"
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0, color: '#1f2937' }}>
            Super Admin User Management
          </Title>
          <Text type="secondary">
            Manage all users across organizations
          </Text>
        </div>

        {/* Filters and Actions */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={16} align="middle">
            <Col span={5}>
              <Select
                placeholder="Filter by Organization"
                style={{ width: '100%' }}
                allowClear
                value={filters.organizationId}
                onChange={(value) => setFilters({ ...filters, organizationId: value })}
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {organizations.map(org => (
                  <Option key={org.id} value={org.id}>{org.name}</Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="Filter by Role"
                style={{ width: '100%' }}
                allowClear
                value={filters.role}
                onChange={(value) => setFilters({ ...filters, role: value })}
              >
                <Option value={5}>Super Admin</Option>
                <Option value={4}>Admin</Option>
                <Option value={3}>Production User</Option>
                <Option value={2}>Trading User</Option>
                <Option value={1}>Audit User</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="Filter by Status"
                style={{ width: '100%' }}
                allowClear
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
              >
                <Option value="ACTIVE">Active</Option>
                <Option value="PENDING">Pending</Option>
                <Option value="SUSPENDED">Suspended</Option>
              </Select>
            </Col>
            <Col span={6}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateUserVisible(true)}
                size="large"
              >
                Create New User
              </Button>
            </Col>
            <Col span={5}>
              <Text strong>
                Total Users: {users.length}
              </Text>
            </Col>
          </Row>
        </Card>

        {/* Users Table */}
        <Card>
          <Table
            columns={userColumns}
            dataSource={users}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`
            }}
            scroll={{ x: 1200 }}
          />
        </Card>

        {/* Create User Modal */}
        <Modal
          title="Create New User"
          open={isCreateUserVisible}
          onCancel={() => {
            setIsCreateUserVisible(false);
            createUserForm.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={createUserForm}
            layout="vertical"
            onFinish={handleCreateUser}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Full Name"
                  name="name"
                  rules={[{ required: true, message: 'Please enter full name' }]}
                >
                  <Input placeholder="Enter full name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Email"
                  name="email"
                  rules={[{ required: true, message: 'Please enter email' },{ type: 'email', message: 'Please enter valid email' }]}
                >
                  <Input placeholder="Enter email address" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Role"
                  name="role"
                  rules={[{ required: true, message: 'Please select role' }]}
                >
                  <Select placeholder="Select user role">
                    <Option value={5}>Super Admin</Option>
                    <Option value={4}>Admin</Option>
                    <Option value={3}>Production User</Option>
                    <Option value={2}>Trading User</Option>
                    <Option value={1}>Audit User</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Organization"
                  name="organization_id"
                  rules={[{ required: true, message: 'Please select organization' }]}
                >
                  <Select 
                    placeholder="Select organization"
                    showSearch
                    onChange={(val) => {
                      fetchAccountsForOrg(val);
                      createUserForm.setFieldsValue({ account_id: undefined });
                    }}
                    filterOption={(input, option) =>
                      option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {organizations.map(org => (
                      <Option key={org.id} value={org.id}>{org.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Account"
                  name="account_id"
                  rules={[{ required: true, message: 'Please select account' }]}
                >
                  <Select placeholder="Select account">
                    {Array.isArray(accounts) && accounts.map(acc => (
                      <Option key={acc.id} value={acc.id}>{acc.account_name || `Account ${acc.id}`}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="MFA Token (Optional)"
                  name="mfa_token"
                  help="Leave empty to skip MFA verification"
                >
                  <Input placeholder="Enter MFA token (optional)" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Organization Name (Legacy)"
              name="organisation"
              help="For backward compatibility - will use organization selection above if provided"
            >
              <Input placeholder="Enter organization name (optional)" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Create User
                </Button>
                <Button onClick={() => { setIsCreateUserVisible(false); createUserForm.resetFields(); }}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Edit User Modal */}
        <Modal
          title={`Edit User - ${selectedUser?.name}`}
          open={isEditUserVisible}
          onCancel={() => {
            setIsEditUserVisible(false);
            setSelectedUser(null);
            editUserForm.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={editUserForm}
            layout="vertical"
            onFinish={handleUpdateUser}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Full Name"
                  name="name"
                  rules={[{ required: true, message: 'Please enter full name' }]}
                >
                  <Input placeholder="Enter full name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Email"
                  name="email"
                  rules={[
                    { required: true, message: 'Please enter email' },
                    { type: 'email', message: 'Please enter valid email' }
                  ]}
                >
                  <Input placeholder="Enter email address" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Role"
                  name="role"
                  rules={[{ required: true, message: 'Please select role' }]}
                >
                  <Select placeholder="Select user role">
                    <Option value={5}>Super Admin</Option>
                    <Option value={4}>Admin</Option>
                    <Option value={3}>Production User</Option>
                    <Option value={2}>Trading User</Option>
                    <Option value={1}>Audit User</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Organization"
                  name="organization_id"
                  rules={[{ required: true, message: 'Please select organization' }]}
                >
                  <Select 
                    placeholder="Select organization"
                    showSearch
                    filterOption={(input, option) =>
                      option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {organizations.map(org => (
                      <Option key={org.id} value={org.id}>{org.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Organization Name (Legacy)"
              name="organisation"
            >
              <Input placeholder="Enter organization name (optional)" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Update User
                </Button>
                <Button 
                  onClick={() => {
                    setIsEditUserVisible(false);
                    setSelectedUser(null);
                    editUserForm.resetFields();
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default SuperAdminUserManagement;
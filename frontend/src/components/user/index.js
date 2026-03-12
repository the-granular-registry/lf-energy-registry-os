import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Modal, Form, Input, Typography, message, Space, Tag, Row, Col, Select, Switch } from 'antd';
import { PlusOutlined, UserOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useUser } from '../../context/UserContext';
import { useAccount } from '../../context/AccountContext';
import { useDispatch, useSelector } from 'react-redux';
import { getUsersByAccount, createUser, updateUser, deleteUser, changeUserRole } from '../../store/user/userThunk';
import { getSessionStorage } from '../../utils';
import { listAllOrganizations, getAdminOrganizations } from '../../api/organization';

const { Title, Text } = Typography;
const { Option } = Select;

const UserManagement = () => {
  const { userData } = useUser();
  const { currentAccount } = useAccount();
  const dispatch = useDispatch();
  const { users, loading, error } = useSelector((state) => state.user);
  
  const [isCreateUserModalVisible, setIsCreateUserModalVisible] = useState(false);
  const [isEditUserModalVisible, setIsEditUserModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);

  const createUserForm = Form.useForm()[0];
  const editUserForm = Form.useForm()[0];

  // Load users for the current account
  useEffect(() => {
    if (currentAccount?.detail?.id) {
      dispatch(getUsersByAccount(currentAccount.detail.id));
    }
  }, [dispatch, currentAccount?.detail?.id]);

  // Load organizations for dropdown
  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Show error message if any
  useEffect(() => {
    if (error) {
      message.error(error.message || 'An error occurred');
    }
  }, [error]);

  const fetchOrganizations = async () => {
    try {
      setOrganizationsLoading(true);
      console.log('Fetching organizations...');
      
      let response;
      let organizations = [];
      
      // Try the admin organizations endpoint first (for super admins)
      try {
        console.log('Trying admin organizations endpoint...');
        response = await getAdminOrganizations(1, 1000);
        console.log('Admin organizations response:', response);
        
        if (response && response.data && Array.isArray(response.data)) {
          // Filter to only show active organizations
          organizations = response.data.filter(org => org.status === 'ACTIVE' && !org.is_deleted);
          console.log('Active organizations (admin):', organizations);
        } else if (response && Array.isArray(response)) {
          // If response is directly an array
          organizations = response.filter(org => org.status === 'ACTIVE' && !org.is_deleted);
          console.log('Active organizations (admin direct array):', organizations);
        } else {
          console.log('Admin endpoint returned unexpected format:', response);
        }
      } catch (adminError) {
        console.log('Admin endpoint failed, trying simple endpoint:', adminError);
      }
      
      // If admin endpoint didn't work or returned no data, try the simple endpoint
      if (!organizations || organizations.length === 0) {
        try {
          console.log('Trying simple organizations endpoint...');
          response = await listAllOrganizations();
          console.log('Simple organizations response:', response);
          
          if (response && response.data && Array.isArray(response.data)) {
            // Filter to only show active organizations
            organizations = response.data.filter(org => org.status === 'ACTIVE' && !org.is_deleted);
            console.log('Active organizations (simple):', organizations);
          } else if (response && Array.isArray(response)) {
            // If response is directly an array
            organizations = response.filter(org => org.status === 'ACTIVE' && !org.is_deleted);
            console.log('Active organizations (simple direct array):', organizations);
          } else {
            console.error('Unexpected response format from simple endpoint:', response);
          }
        } catch (simpleError) {
          console.error('Simple endpoint also failed:', simpleError);
        }
      }
      
      if (organizations && organizations.length > 0) {
        console.log('Setting organizations:', organizations);
        setOrganizations(organizations);
      } else {
        console.log('No organizations found or all organizations are inactive/deleted');
        setOrganizations([]);
        message.warning('No active organizations found');
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      // Try to get more details about the error
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
        message.error(`Failed to load organizations: ${error.response.status} - ${error.response.data?.detail || error.response.data}`);
      } else {
        message.error('Failed to load organizations');
      }
      setOrganizations([]);
    } finally {
      setOrganizationsLoading(false);
    }
  };

  const handleCreateUser = async (values) => {
    try {
      // Convert string role to integer for backend
      const roleMap = {
        ADMIN: 4,
        PRODUCTION_USER: 3,
        TRADING_USER: 2,
        AUDIT_USER: 1,
      };
      const roleValue = roleMap[values.role] || values.role;
      
      // Find the selected organization name
      const selectedOrg = organizations.find(org => org.id === values.organization);
      const organizationName = selectedOrg ? selectedOrg.name : values.organization;
      
      const userData = {
        name: values.username,
        email: values.email,
        organisation: organizationName,
        role: roleValue,
        hashed_password: values.password, // The backend will hash this
      };
      
      await dispatch(createUser(userData)).unwrap();
      message.success('User created successfully!');
      setIsCreateUserModalVisible(false);
      createUserForm.resetFields();
      
      // Refresh users list
      if (currentAccount?.detail?.id) {
        dispatch(getUsersByAccount(currentAccount.detail.id));
      }
    } catch (error) {
      message.error(error.message || 'Failed to create user');
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    
    // Handle role properly
    let roleValue = user.role;
    if (typeof user.role === 'object' && user.role.name) {
      roleValue = user.role.name;
    } else if (typeof user.role === 'number') {
      const roleMap = {
        4: 'ADMIN',
        3: 'PRODUCTION_USER',
        2: 'TRADING_USER',
        1: 'AUDIT_USER'
      };
      roleValue = roleMap[user.role] || 'ADMIN';
    }
    
    // Find organization ID by name
    const organizationId = organizations.find(org => org.name === user.organisation)?.id || user.organisation;
    
    editUserForm.setFieldsValue({
      username: user.name,
      email: user.email,
      role: roleValue,
      organization: organizationId,
    });
    setIsEditUserModalVisible(true);
  };

  const handleUpdateUser = async (values) => {
    try {
      // Check if role has changed
      const originalRole = selectedUser.role;
      let originalRoleString = originalRole;
      
      if (typeof originalRole === 'object' && originalRole.name) {
        originalRoleString = originalRole.name;
      } else if (typeof originalRole === 'number') {
        const roleMap = {
          4: 'ADMIN',
          3: 'PRODUCTION_USER',
          2: 'TRADING_USER',
          1: 'AUDIT_USER'
        };
        originalRoleString = roleMap[originalRole] || 'ADMIN';
      }
      
      const roleChanged = originalRoleString !== values.role;
      
      // Find the selected organization name
      const selectedOrg = organizations.find(org => org.id === values.organization);
      const organizationName = selectedOrg ? selectedOrg.name : values.organization;
      
      // Update user data (excluding role)
      const userData = {
        name: values.username,
        email: values.email,
        organisation: organizationName,
      };
      
      await dispatch(updateUser({ userId: selectedUser.id, userData })).unwrap();
      
      // If role changed, update it separately
      if (roleChanged) {
        await dispatch(changeUserRole({ userId: selectedUser.id, role: values.role })).unwrap();
      }
      
      message.success('User updated successfully!');
      setIsEditUserModalVisible(false);
      editUserForm.resetFields();
      setSelectedUser(null);
      
      // Refresh users list
      if (currentAccount?.detail?.id) {
        dispatch(getUsersByAccount(currentAccount.detail.id));
      }
    } catch (error) {
      message.error(error.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (user) => {
    try {
      await dispatch(deleteUser(user.id)).unwrap();
      message.success('User deleted successfully!');
      
      // Refresh users list
      if (currentAccount?.detail?.id) {
        dispatch(getUsersByAccount(currentAccount.detail.id));
      }
    } catch (error) {
      message.error(error.message || 'Failed to delete user');
    }
  };

  const getRoleColor = (role) => {
    // Handle role as string, enum, or number
    let roleString = role;
    if (typeof role === 'object' && role.name) {
      roleString = role.name;
    } else if (typeof role === 'number') {
      const roleMap = {
        4: 'ADMIN',
        3: 'PRODUCTION_USER',
        2: 'TRADING_USER',
        1: 'AUDIT_USER'
      };
      roleString = roleMap[role] || 'UNKNOWN';
    } else if (typeof role === 'string') {
      roleString = role;
    } else {
      roleString = 'UNKNOWN';
    }
    
    switch (roleString) {
      case 'ADMIN':
        return 'red';
      case 'PRODUCTION_USER':
        return 'blue';
      case 'TRADING_USER':
        return 'green';
      case 'AUDIT_USER':
        return 'orange';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'green' : 'red';
  };

  const columns = [
    {
      title: 'Username',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>,
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
      render: (role) => {
        // Handle role as string, enum, or number
        let roleString = role;
        if (typeof role === 'object' && role.name) {
          roleString = role.name;
        } else if (typeof role === 'number') {
          // Map number to role name
          const roleMap = {
            4: 'ADMIN',
            3: 'PRODUCTION_USER',
            2: 'TRADING_USER',
            1: 'AUDIT_USER'
          };
          roleString = roleMap[role] || 'UNKNOWN';
        } else if (typeof role === 'string') {
          roleString = role;
        } else {
          roleString = 'UNKNOWN';
        }
        
        return (
          <Tag color={getRoleColor(roleString)}>
            {roleString.replace('_', ' ')}
          </Tag>
        );
      },
    },
    {
      title: 'Organization',
      dataIndex: 'organisation',
      key: 'organisation',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditUser(record)}
            size="small"
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteUser(record)}
            size="small"
          />
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: "24px" }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            User Management
          </Title>
          <Text type="secondary">
            Manage users and their permissions
          </Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateUserModalVisible(true)}
          >
            Add User
          </Button>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} users`,
          }}
        />
      </Card>

      {/* Create User Modal */}
      <Modal
        title="Create New User"
        open={isCreateUserModalVisible}
        onCancel={() => setIsCreateUserModalVisible(false)}
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
                name="username"
                label="Username"
                rules={[{ required: true, message: 'Please enter username' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Enter username" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input placeholder="Enter email" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="Role"
                rules={[{ required: true, message: 'Please select role' }]}
              >
                <Select placeholder="Select role">
                  <Option value="ADMIN">Admin</Option>
                  <Option value="PRODUCTION_USER">Production User</Option>
                  <Option value="TRADING_USER">Trading User</Option>
                  <Option value="AUDIT_USER">Audit User</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="organization"
                label="Organization"
                rules={[{ required: true, message: 'Please select organization' }]}
              >
                <Select
                  placeholder="Select organization"
                  loading={organizationsLoading}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {organizations.map((org) => (
                    <Option key={org.id} value={org.id}>
                      {org.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: 'Please enter password' },
                  { min: 6, message: 'Password must be at least 6 characters' }
                ]}
              >
                <Input.Password placeholder="Enter password" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsCreateUserModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Create User
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title="Edit User"
        open={isEditUserModalVisible}
        onCancel={() => setIsEditUserModalVisible(false)}
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
                name="username"
                label="Username"
                rules={[{ required: true, message: 'Please enter username' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Enter username" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input placeholder="Enter email" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="Role"
                rules={[{ required: true, message: 'Please select role' }]}
              >
                <Select placeholder="Select role">
                  <Option value="ADMIN">Admin</Option>
                  <Option value="PRODUCTION_USER">Production User</Option>
                  <Option value="TRADING_USER">Trading User</Option>
                  <Option value="AUDIT_USER">Audit User</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="organization"
                label="Organization"
                rules={[{ required: true, message: 'Please select organization' }]}
              >
                <Select
                  placeholder="Select organization"
                  loading={organizationsLoading}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {organizations.map((org) => (
                    <Option key={org.id} value={org.id}>
                      {org.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsEditUserModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Update User
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement; 
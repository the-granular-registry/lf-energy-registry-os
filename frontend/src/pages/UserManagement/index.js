import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useUser } from '../../context/UserContext';
import { Card, Row, Col, Typography, Button, Space, Table, Tag, Modal, Form, Input, Select, message, Spin } from 'antd';
import { UserOutlined, PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';

import { getUsersByAccount, createUser, updateUser, deleteUser, changeUserRole } from '../../store/user/userThunk';
import { addUserToAccountAPI, getAllUsersAPI } from '../../api/superAdminAPI';
import { fetchAdminOrganizations } from '../../store/organization/organizationThunk';
import { selectOrganizations } from '../../store/organization/organizationSlice';
import { useAccount } from '../../context/AccountContext';
import { setUsers } from '../../store/user/userSlice';
import { getOrganizationUsersAPI } from '../../api/organizationAPI';

const { Title, Text } = Typography;
const { Option } = Select;

const UnifiedUserManagement = () => {
  const dispatch = useDispatch();
  const { userData } = useUser();
  const { currentAccount } = useAccount();
  const { users, loading, error } = useSelector((state) => state.user);
  const organizations = useSelector(selectOrganizations);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const isSuperAdmin = userData?.userInfo?.role === 'SUPER_ADMIN' || userData?.userInfo?.role === 5;
  const isAdmin = userData?.userInfo?.role === 'ADMIN' || userData?.userInfo?.role === 4;
  const isRegularUser = !isAdmin && !isSuperAdmin;

  useEffect(() => {
    const loadUsersForView = async () => {
      try {
        if (isSuperAdmin) {
          const res = await getAllUsersAPI();
          const list = Array.isArray(res?.data) ? res.data : (res?.data?.users || []);
          const normalized = list.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role?.name || u.role,
            organisation: u.organisation || u.organization_name || u.organization || null,
          }));
          dispatch(setUsers(normalized));
          return;
        }
        if (isAdmin) {
          const orgId = (organizations.find((o) => o.name === userData?.userInfo?.organisation)?.id)
            || (organizations && organizations.length > 0 ? organizations[0].id : undefined);
          if (orgId) {
            const res = await getOrganizationUsersAPI(orgId);
            const list = res?.data || [];
            const normalized = list.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role?.name || u.role,
              organisation: u.organisation || u.organization_name || u.organization || userData?.userInfo?.organisation,
            }));
            dispatch(setUsers(normalized));
            return;
          }
        }
        dispatch(setUsers([]));
      } catch (e) {
        message.error('Failed to load users');
      }
    };

    if (isSuperAdmin || isAdmin) {
      dispatch(fetchAdminOrganizations());
    }
    loadUsersForView();
  }, [dispatch, isSuperAdmin, isAdmin, organizations, userData]);

  useEffect(() => {
    if (error) {
      message.error(typeof error === 'string' ? error : (error?.message || 'Failed to load users'));
    }
  }, [error]);

  const filteredUsers = useMemo(() => {
    let list = users || [];
    if (searchText) {
      const key = searchText.toLowerCase();
      list = list.filter(u => u.name?.toLowerCase().includes(key) || u.email?.toLowerCase().includes(key));
    }
    return list;
  }, [users, searchText]);

  const openEdit = (user) => {
    setSelectedUser(user);
    const roleValue = typeof user.role === 'object' && user.role?.name ? user.role.name : (typeof user.role === 'number' ? ({4:'ADMIN',3:'PRODUCTION_USER',2:'TRADING_USER',1:'AUDIT_USER'}[user.role] || 'ADMIN') : user.role);
    const orgId = organizations.find(o => o.name === user.organisation)?.id;
    form.setFieldsValue({ username: user.name, email: user.email, role: roleValue, organization: orgId });
    setIsEditModalVisible(true);
  };

  const handleSave = async (values) => {
    try {
      if (selectedUser) {
        await dispatch(updateUser({ userId: selectedUser.id, userData: { name: values.username, email: values.email, organisation: (organizations.find(o => o.id === values.organization)?.name) || undefined } })).unwrap();
        const originalRole = typeof selectedUser.role === 'object' && selectedUser.role?.name ? selectedUser.role.name : (typeof selectedUser.role === 'number' ? ({4:'ADMIN',3:'PRODUCTION_USER',2:'TRADING_USER',1:'AUDIT_USER'}[selectedUser.role] || 'ADMIN') : selectedUser.role);
        if (values.role && values.role !== originalRole) {
          await dispatch(changeUserRole({ userId: selectedUser.id, role: values.role })).unwrap();
        }
        message.success('User updated successfully');
      } else {
        const orgName = organizations.find(o => o.id === values.organization)?.name;
        // Generate a strong random password if none provided
        const randomPassword = values.password && values.password.trim().length > 0 ? values.password : generateRandomPassword();
        const newUser = await dispatch(
          createUser({ 
            name: values.username, 
            email: values.email, 
            organisation: orgName, 
            organization_id: values.organization,
            role: values.role, 
            hashed_password: randomPassword 
          })
        ).unwrap();

        // Link newly created user to the current account so it appears in list
        if (currentAccount?.detail?.id && newUser?.id) {
          try {
            await addUserToAccountAPI(currentAccount.detail.id, newUser.id);
          } catch {
            // Linking failure should not block user creation success
          }
        }

        Modal.success({
          title: 'User created',
          content: (
            <div>
              <p>The user has been created and linked to the current account.</p>
              <p><b>Temporary password:</b> {randomPassword}</p>
              <p>Please copy and share these credentials securely.</p>
            </div>
          ),
        });
      }
      setIsEditModalVisible(false);
      setIsCreateModalVisible(false);
      // Refresh list based on role context
      try {
        if (isSuperAdmin) {
          const res = await getAllUsersAPI();
          const list = Array.isArray(res?.data) ? res.data : (res?.data?.users || []);
          const normalized = list.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role?.name || u.role,
            organisation: u.organisation || u.organization_name || u.organization || null,
          }));
          dispatch(setUsers(normalized));
        } else if (isAdmin) {
          const orgId = (organizations.find((o) => o.name === userData?.userInfo?.organisation)?.id)
            || (organizations && organizations.length > 0 ? organizations[0].id : undefined);
          if (orgId) {
            const res = await getOrganizationUsersAPI(orgId);
            const list = res?.data || [];
            const normalized = list.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role?.name || u.role,
              organisation: u.organisation || u.organization_name || u.organization || userData?.userInfo?.organisation,
            }));
            dispatch(setUsers(normalized));
          }
        }
      } catch {}
    } catch {
      message.error('Failed to save user');
    }
  };

  const handleDelete = async (user) => {
    try {
      await dispatch(deleteUser(user.id)).unwrap();
      message.success('User deleted successfully');
      if (currentAccount?.detail?.id) {
        dispatch(getUsersByAccount(currentAccount.detail.id));
      }
    } catch {
      message.error('Failed to delete user');
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (t) => <Text strong>{t}</Text> },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Role', dataIndex: 'role', key: 'role', render: (role) => {
      const roleStr = typeof role === 'object' && role?.name ? role.name : (typeof role === 'number' ? ({4:'ADMIN',3:'PRODUCTION_USER',2:'TRADING_USER',1:'AUDIT_USER'}[role] || 'UNKNOWN') : role);
      return <Tag color={{ADMIN:'red',PRODUCTION_USER:'blue',TRADING_USER:'green',AUDIT_USER:'orange'}[roleStr] || 'default'}>{roleStr?.replace('_',' ')}</Tag>;
    } },
    { title: 'Organization', dataIndex: 'organisation', key: 'organisation' },
    { title: 'Actions', key: 'actions', render: (_, rec) => (
      <Space>
        <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(rec)} disabled={isRegularUser}>Edit</Button>
        <Button type="text" icon={<DeleteOutlined />} danger onClick={() => handleDelete(rec)} disabled={isRegularUser}>Delete</Button>
      </Space>
    ) }
  ];

  const generateRandomPassword = () => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-={}[]:;,.?';
    const length = 14;
    let pwd = '';
    const array = new Uint32Array(length);
    if (window?.crypto?.getRandomValues) {
      window.crypto.getRandomValues(array);
      for (let i = 0; i < length; i += 1) {
        pwd += charset[array[i] % charset.length];
      }
    } else {
      for (let i = 0; i < length; i += 1) {
        pwd += charset[Math.floor(Math.random() * charset.length)];
      }
    }
    return pwd;
  };

  return (
    <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0 }}>
            <UserOutlined /> User Management
          </Title>
          <Text type="secondary">Basic CRUD for users</Text>
        </div>

        <Card style={{ marginBottom: '16px' }}>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Input placeholder="Search users..." prefix={<SearchOutlined />} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            </Col>
            <Col span={8}>
              {(isSuperAdmin || isAdmin) && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setSelectedUser(null); form.resetFields(); setIsCreateModalVisible(true); }}>
                  Add User
                </Button>
              )}
            </Col>
          </Row>
        </Card>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <p>Loading users...</p>
          </div>
        ) : (
          <Table columns={columns} dataSource={filteredUsers} rowKey="id" pagination={{ showSizeChanger: true, showQuickJumper: true }} />
        )}

        <Modal
          title={selectedUser ? 'Edit User' : 'Create User'}
          open={isEditModalVisible || isCreateModalVisible}
          onCancel={() => { setIsEditModalVisible(false); setIsCreateModalVisible(false); }}
          onOk={() => form.submit()}
          confirmLoading={loading}
          width={600}
        >
          <Form form={form} layout="vertical" onFinish={handleSave}>
            <Form.Item label="Username" name="username" rules={[{ required: true, message: 'Please enter username' }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Role" name="role" rules={[{ required: true, message: 'Please select role' }]}>
              <Select>
                <Option value="ADMIN">Admin</Option>
                <Option value="PRODUCTION_USER">Production User</Option>
                <Option value="TRADING_USER">Trading User</Option>
                <Option value="AUDIT_USER">Audit User</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Organization" name="organization" rules={[{ required: !!(!selectedUser), message: 'Please select organization' }]}>
              <Select placeholder="Select organization">
                {organizations.map((o) => (
                  <Option key={o.id} value={o.id}>{o.name}</Option>
                ))}
              </Select>
            </Form.Item>
            {!selectedUser && (
              <Form.Item label="Password" name="password" rules={[{ required: true, min: 6 }]}> 
                <Input.Password />
              </Form.Item>
            )}
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default UnifiedUserManagement;



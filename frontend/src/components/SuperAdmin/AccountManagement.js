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
  Divider,
  Popconfirm,
  Tooltip,
  Transfer,
  AutoComplete
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  BankOutlined,
  SettingOutlined,
  ExperimentOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { logger } from '../../utils';
import { 
  getAllAccountsAPI, 
  createAccountAnyOrgAPI, 
  deleteAccountAPI, 
  addUserToAccountAPI, 
  removeUserFromAccountAPI,
  getAllUsersAPI,
  getAllDevicesAPI,
  addDeviceToAccountAPI
} from '../../api/superAdminAPI';
import { getOrganizationsAPI } from '../../api/organizationAPI';

const { Title, Text } = Typography;
const { Option } = Select;

const SuperAdminAccountManagement = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0 });
  const [organizations, setOrganizations] = useState([]);
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  
  // Modal states
  const [isCreateAccountVisible, setIsCreateAccountVisible] = useState(false);
  const [isEditAccountVisible, setIsEditAccountVisible] = useState(false);
  const [isManageUsersVisible, setIsManageUsersVisible] = useState(false);
  const [isManageDevicesVisible, setIsManageDevicesVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    organizationId: null,
    accountType: null,
    status: null
  });

  // Forms
  const [createAccountForm] = Form.useForm();
  const [editAccountForm] = Form.useForm();

  // Transfer component states for user/device management
  const [targetKeys, setTargetKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);

  useEffect(() => {
    fetchData({ page: 1, size: pagination.size });
  }, [filters]);

  const fetchData = async ({ page = pagination.page, size = pagination.size } = {}) => {
    setLoading(true);
    try {
      // Always fetch accounts first so the table renders even if other calls fail
      const accountsRes = await getAllAccountsAPI(
        filters.organizationId,
        filters.accountType,
        filters.status,
        page,
        size
      );
      const { accounts: accountsData = [], pagination: apiPagination } = accountsRes?.data || {};
      setAccounts(accountsData);
      if (apiPagination) {
        setPagination({
          page: apiPagination.page,
          size: apiPagination.size,
          total: apiPagination.total,
        });
      } else {
        // Fallback when server returns non-paginated response
        setPagination((prev) => ({ ...prev, page, size, total: accountsData.length }));
      }

      // Fetch ancillary data without blocking the accounts table
      const [orgsRes, usersRes, devicesRes] = await Promise.allSettled([
        getOrganizationsAPI(),
        getAllUsersAPI(),
        getAllDevicesAPI(),
      ]);

      if (orgsRes.status === 'fulfilled') {
        setOrganizations(orgsRes.value?.data || []);
      } else {
        logger.warn('Organizations fetch failed:', orgsRes.reason);
      }

      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value?.data || []);
      } else {
        logger.warn('Users fetch failed:', usersRes.reason);
      }

      if (devicesRes.status === 'fulfilled') {
        setDevices(devicesRes.value?.data || []);
      } else {
        logger.warn('Devices fetch failed:', devicesRes.reason);
      }

      if (accountsData.length === 0) {
        message.info('No accounts found or you may not have sufficient permissions.');
      }
    } catch (error) {
      // Surface permission issues distinctly
      if (error?.status === 401 || error?.status === 403) {
        message.error('Insufficient permissions to view accounts.');
      } else {
        logger.error('Error fetching super admin accounts:', error);
        message.error('Failed to load super admin data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (values) => {
    try {
      setLoading(true);
      await createAccountAnyOrgAPI({
        account_name: values.account_name,
        organization_id: values.organization_id,
        account_type: values.account_type,
        description: values.description,
        initial_user_ids: values.initial_user_ids || []
      }, values.mfa_token);
      
      message.success('Account created successfully');
      setIsCreateAccountVisible(false);
      createAccountForm.resetFields();
      fetchData();
    } catch (error) {
      logger.error('Error creating account:', error);
      message.error(error.response?.data?.detail || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId, reason) => {
    try {
      setLoading(true);
      // Note: This would need MFA token in real implementation
      await deleteAccountAPI(accountId, { reason, mfa_token: 'placeholder' });
      message.success('Account deleted successfully');
      fetchData();
    } catch (error) {
      logger.error('Error deleting account:', error);
      message.error(error.response?.data?.detail || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  const handleManageUsers = (account) => {
    setSelectedAccount(account);
    // Get users already linked to this account
    const accountUserIds = account.linked_users?.map(u => u.id) || [];
    setTargetKeys(accountUserIds);
    setIsManageUsersVisible(true);
  };

  const handleManageDevices = (account) => {
    setSelectedAccount(account);
    // Get devices already linked to this account
    const accountDeviceIds = devices.filter(d => d.account_id === account.id).map(d => d.id);
    setTargetKeys(accountDeviceIds);
    setIsManageDevicesVisible(true);
  };

  const handleUserTransferChange = async (newTargetKeys) => {
    const addedUsers = newTargetKeys.filter(key => !targetKeys.includes(key));
    const removedUsers = targetKeys.filter(key => !newTargetKeys.includes(key));

    try {
      setLoading(true);
      
      // Add new users
      for (const userId of addedUsers) {
        await addUserToAccountAPI(selectedAccount.id, userId);
      }
      
      // Remove users
      for (const userId of removedUsers) {
        await removeUserFromAccountAPI(selectedAccount.id, userId);
      }
      
      setTargetKeys(newTargetKeys);
      message.success('User access updated successfully');
      fetchData();
    } catch (error) {
      logger.error('Error updating user access:', error);
      message.error('Failed to update user access');
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceTransferChange = async (newTargetKeys) => {
    const addedDevices = newTargetKeys.filter(key => !targetKeys.includes(key));
    // Note: Device removal would need additional implementation
    
    try {
      setLoading(true);
      
      // Add new devices
      for (const deviceId of addedDevices) {
        await addDeviceToAccountAPI(selectedAccount.id, deviceId);
      }
      
      setTargetKeys(newTargetKeys);
      message.success('Device assignments updated successfully');
      fetchData();
    } catch (error) {
      logger.error('Error updating device assignments:', error);
      message.error('Failed to update device assignments');
    } finally {
      setLoading(false);
    }
  };

  const accountColumns = [
    {
      title: 'Account Name',
      dataIndex: 'account_name',
      key: 'account_name',
      render: (name, record) => (
        <Space>
          <BankOutlined />
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              ID: {record.id}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Organization',
      dataIndex: 'organization_name',
      key: 'organization_name',
      render: (name, record) => (
        <div>
          <div>{name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ID: {record.organization_id}
          </Text>
        </div>
      )
    },
    {
      title: 'Type',
      dataIndex: 'account_type',
      key: 'account_type',
      render: (type) => {
        const colors = {
          PRODUCTION: 'green',
          TRADING: 'blue',
          CONSUMPTION: 'orange',
          SUPER_ADMIN: 'purple'
        };
        return <Tag color={colors[type] || 'default'}>{type}</Tag>;
      }
    },
    {
      title: 'Status',
      dataIndex: 'account_status',
      key: 'account_status',
      render: (status) => {
        const colors = {
          ACTIVE: 'green',
          PENDING: 'orange',
          SUSPENDED: 'red'
        };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      }
    },
    {
      title: 'Users',
      dataIndex: 'user_count',
      key: 'user_count',
      render: (count) => (
        <Tag icon={<UserAddOutlined />} color="blue">
          {count || 0}
        </Tag>
      )
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Manage Users">
            <Button
              type="text"
              icon={<UserAddOutlined />}
              onClick={() => handleManageUsers(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Manage Devices">
            <Button
              type="text"
              icon={<ExperimentOutlined />}
              onClick={() => handleManageDevices(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Edit Account">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedAccount(record);
                editAccountForm.setFieldsValue(record);
                setIsEditAccountVisible(true);
              }}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Delete Account">
            <Popconfirm
              title="Delete Account"
              description="Are you sure you want to delete this account? This action cannot be undone."
              onConfirm={() => handleDeleteAccount(record.id, 'Super admin deletion')}
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

  const userTransferData = users.map(user => ({
    key: user.id,
    title: `${user.name} (${user.email})`,
    description: user.organisation || 'No organization'
  }));

  const deviceTransferData = devices.map(device => ({
    key: device.id,
    title: `${device.device_name}`,
    description: `${device.technology_type} - ${device.energy_source}`
  }));

  return (
    <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0, color: '#1f2937' }}>
            Super Admin Account Management
          </Title>
          <Text type="secondary">
            Create, manage, and oversee accounts across all organizations
          </Text>
        </div>

        {/* Filters and Actions */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={16} align="middle">
            <Col span={6}>
              <Select
                placeholder="Filter by Organization"
                style={{ width: '100%' }}
                allowClear
                value={filters.organizationId}
                onChange={(value) => setFilters({ ...filters, organizationId: value })}
              >
                {organizations.map(org => (
                  <Option key={org.id} value={org.id}>{org.name}</Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="Account Type"
                style={{ width: '100%' }}
                allowClear
                value={filters.accountType}
                onChange={(value) => setFilters({ ...filters, accountType: value })}
              >
                <Option value="PRODUCTION">Production</Option>
                <Option value="TRADING">Trading</Option>
                <Option value="CONSUMPTION">Consumption</Option>
                <Option value="SUPER_ADMIN">Super Admin</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="Status"
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
                onClick={() => setIsCreateAccountVisible(true)}
                size="large"
              >
                Create New Account
              </Button>
            </Col>
            <Col span={4}>
              <Text strong>
                Total Accounts: {accounts.length}
              </Text>
            </Col>
          </Row>
        </Card>

        {/* Accounts Table */}
        <Card>
          <Table
            columns={accountColumns}
            dataSource={accounts}
            rowKey="id"
            loading={loading}
            onChange={(pager) => {
              const nextPage = pager.current || 1;
              const nextSize = pager.pageSize || 20;
              // Keep filters; update pagination
              fetchData({ page: nextPage, size: nextSize });
            }}
            pagination={{
              current: pagination.page,
              pageSize: pagination.size,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} accounts`,
            }}
            scroll={{ x: 1200 }}
          />
        </Card>

        {/* Create Account Modal */}
        <Modal
          title="Create New Account"
          open={isCreateAccountVisible}
          onCancel={() => {
            setIsCreateAccountVisible(false);
            createAccountForm.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={createAccountForm}
            layout="vertical"
            onFinish={handleCreateAccount}
          >
            <Form.Item
              label="Account Name"
              name="account_name"
              rules={[{ required: true, message: 'Please enter account name' }]}
            >
              <Input placeholder="Enter account name" />
            </Form.Item>

            <Form.Item
              label="Organization"
              name="organization_id"
              rules={[{ required: true, message: 'Please select organization' }]}
            >
              <Select placeholder="Select organization">
                {organizations.map(org => (
                  <Option key={org.id} value={org.id}>{org.name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Account Type"
              name="account_type"
              rules={[{ required: true, message: 'Please select account type' }]}
            >
              <Select placeholder="Select account type">
                <Option value="PRODUCTION">Production</Option>
                <Option value="TRADING">Trading</Option>
                <Option value="CONSUMPTION">Consumption</Option>
                <Option value="SUPER_ADMIN">Super Admin</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Description"
              name="description"
            >
              <Input.TextArea rows={3} placeholder="Optional description" />
            </Form.Item>

            <Form.Item
              label="Initial Users"
              name="initial_user_ids"
            >
              <Select
                mode="multiple"
                placeholder="Select initial users (optional)"
                style={{ width: '100%' }}
              >
                {users.map(user => (
                  <Option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="MFA Token"
              name="mfa_token"
              rules={[{ required: true, message: 'Please enter MFA token' }]}
            >
              <Input placeholder="Enter MFA token for security verification" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Create Account
                </Button>
                <Button 
                  onClick={() => {
                    setIsCreateAccountVisible(false);
                    createAccountForm.resetFields();
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Manage Users Modal */}
        <Modal
          title={`Manage Users - ${selectedAccount?.account_name}`}
          open={isManageUsersVisible}
          onCancel={() => setIsManageUsersVisible(false)}
          footer={[
            <Button key="close" onClick={() => setIsManageUsersVisible(false)}>
              Close
            </Button>
          ]}
          width={800}
        >
          <Transfer
            dataSource={userTransferData}
            targetKeys={targetKeys}
            selectedKeys={selectedKeys}
            onChange={handleUserTransferChange}
            onSelectChange={(sourceSelectedKeys, targetSelectedKeys) => {
              setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
            }}
            titles={['Available Users', 'Account Users']}
            render={item => item.title}
            listStyle={{
              width: 350,
              height: 400,
            }}
            showSearch
            filterOption={(inputValue, option) =>
              option.title.toLowerCase().includes(inputValue.toLowerCase())
            }
          />
        </Modal>

        {/* Manage Devices Modal */}
        <Modal
          title={`Manage Devices - ${selectedAccount?.account_name}`}
          open={isManageDevicesVisible}
          onCancel={() => setIsManageDevicesVisible(false)}
          footer={[
            <Button key="close" onClick={() => setIsManageDevicesVisible(false)}>
              Close
            </Button>
          ]}
          width={800}
        >
          <Transfer
            dataSource={deviceTransferData}
            targetKeys={targetKeys}
            selectedKeys={selectedKeys}
            onChange={handleDeviceTransferChange}
            onSelectChange={(sourceSelectedKeys, targetSelectedKeys) => {
              setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
            }}
            titles={['Available Devices', 'Account Devices']}
            render={item => item.title}
            listStyle={{
              width: 350,
              height: 400,
            }}
            showSearch
            filterOption={(inputValue, option) =>
              option.title.toLowerCase().includes(inputValue.toLowerCase())
            }
          />
        </Modal>
      </div>
    </div>
  );
};

export default SuperAdminAccountManagement;

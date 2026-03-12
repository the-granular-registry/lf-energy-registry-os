import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Modal, Form, Input, Typography, message, Space, Tree, Tag, InputNumber, Row, Col, Select, Divider, Tooltip } from 'antd';
import { PlusOutlined, FolderOutlined, TeamOutlined, EditOutlined, DeleteOutlined, KeyOutlined, PartitionOutlined, BranchesOutlined, UserAddOutlined, UploadOutlined } from '@ant-design/icons';
import { useUser } from '../../../context/UserContext';
import { useDispatch, useSelector } from 'react-redux';
import { listAllAccounts, createAccount, updateAccount, deleteAccount } from '../../../store/account/accountThunk';
import { createSubAccountAPI, listSubAccountsAPI } from '../../../api/accountAPI';
import { getSessionStorage } from '../../../utils';
import { logger } from "../../../utils";
import APIKeyManagement from './APIKeyManagement';
import BulkImportModal from './BulkImportModal';

const { Title, Text } = Typography;
const { Option } = Select;

const AccountManagement = () => {
  const { userData } = useUser();
  const dispatch = useDispatch();
  const { accounts, loading, error } = useSelector((state) => state.account);
  
  // Account CRUD states
  const [isCreateAccountModalVisible, setIsCreateAccountModalVisible] = useState(false);
  const [isEditAccountModalVisible, setIsEditAccountModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  
  // SubAccount states
  const [isCreateSubAccountModalVisible, setIsCreateSubAccountModalVisible] = useState(false);
  const [isBulkImportModalVisible, setIsBulkImportModalVisible] = useState(false);
  const [selectedParentAccount, setSelectedParentAccount] = useState(null);
  const [subAccountsData, setSubAccountsData] = useState({});
  const [expandedKeys, setExpandedKeys] = useState([]);
  
  const createAccountForm = Form.useForm()[0];
  const editAccountForm = Form.useForm()[0];
  const createSubAccountForm = Form.useForm()[0];

  // Check if user has permission to manage accounts
  const canManageAccounts = userData?.userInfo?.role === 'ADMIN' || 
                           userData?.userInfo?.role === 4;

  // Check if user can view accounts (all authenticated users)
  const canViewAccounts = true;

  // Load accounts for management
  useEffect(() => {
    logger.debug("Loading accounts for management...");
    if (canViewAccounts) {
      dispatch(listAllAccounts());
    }
  }, [dispatch, canViewAccounts]);

  // Show error message if any
  useEffect(() => {
    if (error) {
      if (error.status === 401 || error.status === 403) {
        message.error('You do not have permission to view accounts. Please contact an administrator.');
      } else if (error.status === 422) {
        message.error('Unable to fetch accounts. Please try again later.');
      } else {
        const errorMessage = typeof error.message === 'string' 
          ? error.message 
          : 'An error occurred while loading accounts';
        message.error(errorMessage);
      }
    }
  }, [error]);

  // Load subaccounts from API when accounts change
  useEffect(() => {
    const loadSubAccounts = async () => {
      if (accounts && accounts.length > 0) {
        const subAccountsMap = {};
        
        // Fetch subaccounts for each account
        for (const account of accounts) {
          // Skip virtual subaccounts (they don't have children)
          if (String(account.id).startsWith('subacct:')) {
            continue;
          }
          
          try {
            const response = await listSubAccountsAPI(account.id);
            const subAccountsList = response.data.sub_accounts || [];
            
            subAccountsMap[account.id] = subAccountsList.map(sa => ({
              id: sa.id,
              name: sa.metadata?.name || `Subaccount ${String(sa.id).substring(0, 8)}`,
              type: sa.type.toUpperCase(),
              pro_rata_share: sa.pro_rata_share,
              status: sa.status.toUpperCase(),
              created_at: sa.created_at,
              metadata: sa.metadata
            }));
          } catch (error) {
            logger.debug(`No subaccounts found for account ${account.id} or error loading:`, error);
            subAccountsMap[account.id] = [];
          }
        }
        
        setSubAccountsData(subAccountsMap);
      }
    };
    
    loadSubAccounts();
  }, [accounts]);

  // Account CRUD handlers
  const handleCreateAccount = async (values) => {
    try {
      const accountData = {
        account_name: values.accountName,
        description: values.description,
        account_type: values.accountType || 'PRODUCTION'
      };
      
      await dispatch(createAccount(accountData)).unwrap();
      message.success('Account created successfully!');
      setIsCreateAccountModalVisible(false);
      createAccountForm.resetFields();
    } catch (error) {
      message.error(error.message || 'Failed to create account');
    }
  };

  const handleEditAccount = (account) => {
    setSelectedAccount(account);
    editAccountForm.setFieldsValue({
      accountName: account.account_name,
      description: account.description || '',
      accountType: account.account_type || 'PRODUCTION',
      transferDisabled: account.transfer_disabled || false,
    });
    setIsEditAccountModalVisible(true);
  };

  const handleUpdateAccount = async (values) => {
    try {
      const updateData = {
        account_name: values.accountName,
        description: values.description,
        account_type: values.accountType,
        transfer_disabled: values.transferDisabled
      };
      
      await dispatch(updateAccount({
        accountId: selectedAccount.id,
        accountData: updateData
      })).unwrap();
      
      message.success('Account updated successfully!');
      setIsEditAccountModalVisible(false);
      editAccountForm.resetFields();
      setSelectedAccount(null);
    } catch (error) {
      message.error(error.message || 'Failed to update account');
    }
  };

  const handleDeleteAccount = (account) => {
    Modal.confirm({
      title: 'Delete Account',
      content: `Are you sure you want to delete account "${account.account_name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await dispatch(deleteAccount(account.id)).unwrap();
          message.success('Account deleted successfully!');
        } catch (error) {
          message.error(error.message || 'Failed to delete account');
        }
      }
    });
  };

  // SubAccount handlers
  const handleCreateSubAccount = (parentAccount) => {
    setSelectedParentAccount(parentAccount);
    setIsCreateSubAccountModalVisible(true);
    createSubAccountForm.resetFields();
  };

  const handleBulkImport = (parentAccount) => {
    setSelectedParentAccount(parentAccount);
    setIsBulkImportModalVisible(true);
  };

  const handleBulkImportComplete = async (result) => {
    message.success(`Imported ${result.created_count} customer subaccounts successfully!`);
    
    // Refresh subaccounts list for the parent account
    if (selectedParentAccount) {
      try {
        const response = await listSubAccountsAPI(selectedParentAccount.id);
        const subAccountsList = response.data.sub_accounts || [];
        
        setSubAccountsData(prev => ({
          ...prev,
          [selectedParentAccount.id]: subAccountsList.map(sa => ({
            id: sa.id,
            name: sa.metadata?.name || 'Unnamed',
            type: sa.type.toUpperCase(),
            pro_rata_share: sa.pro_rata_share,
            status: sa.status.toUpperCase(),
            created_at: sa.created_at,
            metadata: sa.metadata
          }))
        }));
        
        setExpandedKeys(prev => [...prev, selectedParentAccount.id.toString()]);
      } catch (error) {
        logger.error('Error refreshing subaccounts:', error);
      }
    }
  };

  const handleCreateSubAccountSubmit = async (values) => {
    try {
      // Prepare API payload
      const subAccountData = {
        type: values.type.toLowerCase(), // Convert "INTERNAL" to "internal"
        pro_rata_share: values.proRataShare / 100, // Convert percentage to decimal
        metadata: {
          name: values.name,
          description: values.description,
          region: values.region,
          purpose: values.purpose
        }
      };

      logger.debug('Creating subaccount:', subAccountData);
      
      // Call API
      const response = await createSubAccountAPI(selectedParentAccount.id, subAccountData);
      const newSubAccount = response.data;
      
      logger.debug('Subaccount created:', newSubAccount);

      // Fetch updated subaccounts list
      const listResponse = await listSubAccountsAPI(selectedParentAccount.id);
      const subAccountsList = listResponse.data.sub_accounts || [];
      
      // Update local state with API response
      setSubAccountsData(prev => ({
        ...prev,
        [selectedParentAccount.id]: subAccountsList.map(sa => ({
          id: sa.id,
          name: sa.metadata?.name || 'Unnamed',
          type: sa.type.toUpperCase(),
          pro_rata_share: sa.pro_rata_share,
          status: sa.status.toUpperCase(),
          created_at: sa.created_at,
          metadata: sa.metadata
        }))
      }));

      message.success('Sub-account created successfully!');
      setIsCreateSubAccountModalVisible(false);
      createSubAccountForm.resetFields();
      setSelectedParentAccount(null);
      
      // Expand the parent account to show new sub-account
      setExpandedKeys(prev => [...prev, selectedParentAccount.id.toString()]);
      
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create sub-account';
      logger.error('Error creating subaccount:', error);
      message.error(errorMessage);
    }
  };

  // Tree data for hierarchical view
  const getTreeData = () => {
    if (!accounts || accounts.length === 0) return [];

    return accounts.map(account => {
      const subAccounts = subAccountsData[account.id] || [];
      const totalAllocated = subAccounts.reduce((sum, sub) => sum + (sub.pro_rata_share || 0), 0);
      const availableShare = Math.max(0, 1 - totalAllocated);

      return {
        key: account.id.toString(),
        title: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderOutlined style={{ color: '#1890ff' }} />
              <span style={{ fontWeight: '600', fontSize: '14px' }}>{account.account_name}</span>
              <Tag color="blue">{account.account_type}</Tag>
              <Tag color={account.transfer_disabled ? 'red' : 'green'}>
                {account.transfer_disabled ? 'Transfers Disabled' : 'Active'}
              </Tag>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tooltip title={`Available allocation: ${(availableShare * 100).toFixed(1)}%`}>
                <Tag color="orange">{(availableShare * 100).toFixed(1)}% Available</Tag>
              </Tooltip>
              {canManageAccounts && (
                <Space size="small">
                  <Tooltip title="Create Sub-account">
                    <Button
                      type="link"
                      size="small"
                      icon={<UserAddOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateSubAccount(account);
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="Bulk Import Customers">
                    <Button
                      type="link"
                      size="small"
                      icon={<UploadOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBulkImport(account);
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="Edit Account">
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditAccount(account);
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="Delete Account">
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAccount(account);
                      }}
                    />
                  </Tooltip>
                </Space>
              )}
            </div>
          </div>
        ),
        children: subAccounts.map(subAccount => ({
          key: subAccount.id,
          title: (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TeamOutlined style={{ color: subAccount.type === 'INTERNAL' ? '#52c41a' : '#fa8c16' }} />
                <span>{subAccount.name}</span>
                <Tag color={subAccount.type === 'INTERNAL' ? 'green' : 'orange'}>
                  {subAccount.type}
                </Tag>
                <Tag color={subAccount.status === 'ACTIVE' ? 'green' : 'gold'}>
                  {subAccount.status}
                </Tag>
                <Tag color="purple">{(subAccount.pro_rata_share * 100).toFixed(1)}%</Tag>
              </div>
              {subAccount.metadata?.description && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {subAccount.metadata.description}
                </Text>
              )}
            </div>
          )
        }))
      };
    });
  };

  const accountColumns = [
    {
      title: 'Account Name',
      dataIndex: 'account_name',
      key: 'account_name',
      sorter: (a, b) => a.account_name.localeCompare(b.account_name),
    },
    {
      title: 'Type',
      dataIndex: 'account_type',
      key: 'account_type',
      render: (type) => <Tag color="blue">{type || 'PRODUCTION'}</Tag>,
    },
    {
      title: 'Account ID',
      dataIndex: 'id',
      key: 'id',
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Sub-accounts',
      key: 'subaccounts',
      render: (_, record) => {
        const subAccounts = subAccountsData[record.id] || [];
        return (
          <Space>
            <Tag color="cyan">{subAccounts.length} sub-accounts</Tag>
            {canManageAccounts && (
              <Button
                type="link"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleCreateSubAccount(record)}
              >
                Add Sub-account
              </Button>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Status',
      key: 'transfer_status',
      render: (_, record) => (
        <Tag color={record.transfer_disabled ? 'red' : 'green'}>
          {record.transfer_disabled ? 'Disabled' : 'Enabled'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {canManageAccounts && (
            <>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEditAccount(record)}
              >
                Edit
              </Button>
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteAccount(record)}
              >
                Delete
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: "24px" }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            Account Management
          </Title>
          <Text type="secondary">
            Manage accounts, sub-accounts, permissions, and API access
          </Text>
        </Col>
      </Row>

      <Card style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: "16px" }}>
          <Col>
            <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BranchesOutlined />
              Account Hierarchy
            </Title>
            <Text type="secondary">
              Hierarchical view of accounts and their sub-accounts with allocation details
            </Text>
          </Col>
          <Col>
            {canManageAccounts && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateAccountModalVisible(true)}
              >
                Create Account
              </Button>
            )}
          </Col>
        </Row>

        <div style={{ border: '1px solid #f0f0f0', borderRadius: '6px', padding: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Text>Loading accounts...</Text>
            </div>
          ) : accounts && accounts.length > 0 ? (
            <Tree
              showLine
              showIcon
              expandedKeys={expandedKeys}
              onExpand={setExpandedKeys}
              treeData={getTreeData()}
              style={{ fontSize: '14px' }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <FolderOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
              <Title level={4} style={{ color: '#999' }}>No Accounts</Title>
              <Text type="secondary">Create your first account to get started</Text>
              {canManageAccounts && (
                <div style={{ marginTop: '16px' }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsCreateAccountModalVisible(true)}
                  >
                    Create Account
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Table View */}
      <Card style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: "16px" }}>
          <Col>
            <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PartitionOutlined />
              Account List
            </Title>
            <Text type="secondary">
              Detailed table view with account management actions
            </Text>
          </Col>
        </Row>

        <Table
          columns={accountColumns}
          dataSource={accounts}
          rowKey="id"
          loading={loading}
          locale={{
            emptyText: loading ? 'Loading accounts...' : 'No accounts available'
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} accounts`,
          }}
        />
      </Card>

      {/* API Key Management */}
      <Card>
        <Title level={4} style={{ margin: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <KeyOutlined />
          API Key Management
        </Title>
        <APIKeyManagement />
      </Card>

      {/* Create Account Modal */}
      <Modal
        title="Create New Account"
        open={isCreateAccountModalVisible}
        onCancel={() => {
          setIsCreateAccountModalVisible(false);
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
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="accountName"
                label="Account Name"
                rules={[{ required: true, message: 'Please enter account name' }]}
              >
                <Input placeholder="Enter account name" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="accountType"
                label="Account Type"
                initialValue="PRODUCTION"
              >
                <Select placeholder="Select account type">
                  <Option value="PRODUCTION">Production</Option>
                  <Option value="TRADING">Trading</Option>
                  <Option value="CONSUMPTION">Consumption</Option>
                  <Option value="AUDIT">Audit</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Description"
                name="description"
              >
                <Input.TextArea placeholder="Enter account description" rows={3} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setIsCreateAccountModalVisible(false);
                createAccountForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Create Account
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Account Modal */}
      <Modal
        title="Edit Account"
        open={isEditAccountModalVisible}
        onCancel={() => {
          setIsEditAccountModalVisible(false);
          editAccountForm.resetFields();
          setSelectedAccount(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editAccountForm}
          layout="vertical"
          onFinish={handleUpdateAccount}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="accountName"
                label="Account Name"
                rules={[{ required: true, message: 'Please enter account name' }]}
              >
                <Input placeholder="Enter account name" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="accountType"
                label="Account Type"
              >
                <Select placeholder="Select account type">
                  <Option value="PRODUCTION">Production</Option>
                  <Option value="TRADING">Trading</Option>
                  <Option value="CONSUMPTION">Consumption</Option>
                  <Option value="AUDIT">Audit</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Description"
                name="description"
              >
                <Input.TextArea placeholder="Enter account description" rows={3} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setIsEditAccountModalVisible(false);
                editAccountForm.resetFields();
                setSelectedAccount(null);
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Update Account
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Bulk Import Modal */}
      <BulkImportModal
        visible={isBulkImportModalVisible}
        onClose={() => {
          setIsBulkImportModalVisible(false);
          setSelectedParentAccount(null);
        }}
        selectedAccount={selectedParentAccount}
        onImportComplete={handleBulkImportComplete}
      />

      {/* Create Sub-Account Modal */}
      <Modal
        title={`Create Sub-Account for ${selectedParentAccount?.account_name}`}
        open={isCreateSubAccountModalVisible}
        onCancel={() => {
          setIsCreateSubAccountModalVisible(false);
          createSubAccountForm.resetFields();
          setSelectedParentAccount(null);
        }}
        footer={null}
        width={700}
      >
        <Form
          form={createSubAccountForm}
          layout="vertical"
          onFinish={handleCreateSubAccountSubmit}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="name"
                label="Sub-Account Name"
                rules={[{ required: true, message: 'Please enter sub-account name' }]}
              >
                <Input placeholder="Enter sub-account name" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Sub-Account Type"
                rules={[{ required: true, message: 'Please select sub-account type' }]}
              >
                <Select placeholder="Select type">
                  <Option value="INTERNAL">
                    <Space>
                      <TeamOutlined style={{ color: '#52c41a' }} />
                      Internal - Organizational use
                    </Space>
                  </Option>
                  <Option value="BENEFICIARY">
                    <Space>
                      <UserAddOutlined style={{ color: '#fa8c16' }} />
                      Beneficiary - External sharing
                    </Space>
                  </Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="proRataShare"
                label="Allocation Percentage (%)"
                rules={[
                  { required: true, message: 'Please enter allocation percentage' },
                  { type: 'number', min: 0.1, max: 100, message: 'Must be between 0.1% and 100%' }
                ]}
              >
                <InputNumber
                  min={0.1}
                  max={100}
                  step={0.1}
                  placeholder="e.g., 25.5"
                  style={{ width: '100%' }}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="region"
                label="Region (Optional)"
              >
                <Input placeholder="e.g., North, ERCOT, California" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="purpose"
                label="Purpose (Optional)"
              >
                <Input placeholder="e.g., Regional segmentation, Tenant allocation" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="description"
                label="Description (Optional)"
              >
                <Input.TextArea 
                  placeholder="Describe the purpose and use of this sub-account" 
                  rows={3} 
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />
          
          <div style={{ backgroundColor: '#f6ffed', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
            <Text style={{ fontSize: '12px', color: '#389e0d' }}>
              <strong>Info:</strong> Internal sub-accounts are for organizational use within your company. 
              Beneficiary sub-accounts can be shared with external parties for pro-rata certificate allocation.
            </Text>
          </div>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setIsCreateSubAccountModalVisible(false);
                createSubAccountForm.resetFields();
                setSelectedParentAccount(null);
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Create Sub-Account
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AccountManagement;

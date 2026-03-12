import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useUser } from '../../context/UserContext';
import { Card, Row, Col, Typography, Button, Space, Table, Tag, Modal, Form, Input, Select, message, Transfer, Spin, Alert } from 'antd';
import { CreditCardOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UserAddOutlined, SearchOutlined, TeamOutlined, LinkOutlined, CopyOutlined } from '@ant-design/icons';

import { listAllAccounts, createAccount, updateAccount, deleteAccount, getAccountDetails } from '../../store/account/accountThunk';
import { createLinkRequestAPI, listLinkRequestsAPI, acceptLinkRequestAPI, declineLinkRequestAPI, revokeLinkRequestAPI, getAccountWhitelistAPI, getAccountWhitelistInverseAPI } from '../../api/accountAPI';
import { getAccountUsersAPI } from '../../api/accountAPI';
import { getOrganizationsAPI, getOrganizationUsersAPI } from '../../api/organizationAPI';
import { createAccountAnyOrgAPI, addUserToAccountAPI, removeUserFromAccountAPI } from '../../api/superAdminAPI';
import { fetchSubaccounts, generateMagicLink } from '../../store/subaccount/subaccountThunk';
import SubaccountWizard from '../../components/SubaccountWizard';

const { Title, Text } = Typography;
const { Option } = Select;

const AccountManagement = () => {
  const dispatch = useDispatch();
  const { userData } = useUser();
  const { accounts, loading, error } = useSelector((state) => state.account);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isManageUsersVisible, setIsManageUsersVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form] = Form.useForm();
  const [userList, setUserList] = useState([]);
  const [targetUserIds, setTargetUserIds] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  // Linked Accounts UI state
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkRequests, setLinkRequests] = useState([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkForm] = Form.useForm();
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [linkedInverse, setLinkedInverse] = useState([]);
  const [linkedAccountsById, setLinkedAccountsById] = useState({});
  const [linkedInverseById, setLinkedInverseById] = useState({});
  const [globalLinkRequests, setGlobalLinkRequests] = useState([]);
  const [createLinkVisible, setCreateLinkVisible] = useState(false);
  const [acceptVisible, setAcceptVisible] = useState(false);
  const [acceptRequestId, setAcceptRequestId] = useState(null);
  const [acceptForm] = Form.useForm();
  // Subaccount state
  const [showSubaccountWizard, setShowSubaccountWizard] = useState(false);
  const [subaccountParentId, setSubaccountParentId] = useState(null);
  const [subaccountParentName, setSubaccountParentName] = useState('');
  const [magicLinkModal, setMagicLinkModal] = useState({ visible: false, link: '', name: '' });
  const { subaccounts, loading: subaccountLoading } = useSelector(state => state.subaccount || { subaccounts: [], loading: false });

  const isSuperAdmin = userData?.userInfo?.role === 'SUPER_ADMIN' || userData?.userInfo?.role === 5;
  const isAdmin = userData?.userInfo?.role === 'ADMIN' || userData?.userInfo?.role === 4;
  const isRegularUser = !isAdmin && !isSuperAdmin;
  const userOrganization = userData?.userInfo?.organisation;

  // Helper functions for link request button visibility
  const isUserSender = (request) => request.sender_user_id === userData?.userInfo?.id;

  const isUserRecipientAdmin = (request) => {
    if (!request.recipient_account_id) return false;
    // Check if current user is admin and linked to recipient account
    const recipientAccount = (accounts || []).find(a => a.id === request.recipient_account_id);
    if (!recipientAccount) return false;
    // Check if user has access to this account and is admin
    return isAdmin && (recipientAccount.user_ids || []).includes(userData?.userInfo?.id);
  };

  useEffect(() => {
    dispatch(listAllAccounts());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      message.error(typeof error === 'string' ? error : (error?.message || 'Failed to load accounts'));
    }
  }, [error]);

  // Load organizations when creating and user is super admin
  useEffect(() => {
    const loadOrgs = async () => {
      if (!isCreateModalVisible || !isSuperAdmin) return;
      try {
        setOrgsLoading(true);
        const res = await getOrganizationsAPI();
        setOrganizations(res?.data || []);
      } catch (e) {
        message.error('Failed to load organizations');
      } finally {
        setOrgsLoading(false);
      }
    };
    loadOrgs();
  }, [isCreateModalVisible, isSuperAdmin]);

  const filteredAccounts = useMemo(() => {
    let list = accounts || [];

    // Role filtering
    if (isRegularUser) {
      const userId = userData?.userInfo?.userID;
      list = list.filter(acc => (acc.user_ids || []).includes(userId));
    } else if (isAdmin && !isSuperAdmin) {
      // Admins: filter by organization name if available on account detail after selection
      // Fallback: show all (server should scope in future)
      list = list;
    }

    // Client-side search and status filter (status may not be present in base list)
    if (searchText) {
      const key = searchText.toLowerCase();
      list = list.filter(acc => acc.account_name?.toLowerCase().includes(key) || String(acc.id).includes(key));
    }
    return list;
  }, [accounts, isRegularUser, isAdmin, isSuperAdmin, userData, searchText]);

  const openEdit = (account) => {
    setSelectedAccount(account);
    form.setFieldsValue({
      account_name: account.account_name,
      account_type: account.account_type || 'PRODUCTION',
      description: account.description,
      transfer_disabled: account.transfer_disabled || false,
    });
    setIsEditModalVisible(true);
  };

  const handleSave = async (values) => {
    try {
      if (selectedAccount) {
        await dispatch(updateAccount({ accountId: selectedAccount.id, accountData: values })).unwrap();
        message.success('Account updated successfully');
      } else {
        if (isSuperAdmin) {
          // Super admin can create in any organization
          const payload = {
            account_name: values.account_name,
            organization_id: values.organization_id,
            account_type: values.account_type,
            description: values.description,
          };
          await createAccountAnyOrgAPI(payload);
          message.success('Account created successfully');
          // Refresh list as we bypassed redux thunk
          dispatch(listAllAccounts());
        } else {
          await dispatch(createAccount(values)).unwrap();
          message.success('Account created successfully');
        }
      }
      setIsEditModalVisible(false);
      setIsCreateModalVisible(false);
    } catch (e) {
      message.error('Failed to save account');
    }
  };

  const handleDelete = async (accountId) => {
    try {
      await dispatch(deleteAccount(accountId)).unwrap();
      message.success('Account deleted');
    } catch {
      message.error('Failed to delete account');
    }
  };

  const openManageUsers = async (account) => {
    setSelectedAccount(account);
    setUsersLoading(true);
    try {
      // Fetch full account details to ensure we have organization_id
      let orgId = account.organization_id;
      try {
        const details = await dispatch(getAccountDetails(account.id)).unwrap();
        orgId = details?.detail?.organization_id || orgId;
      } catch {
        // ignore detail fetch failure and continue with whatever we have
      }

      // Load current account users (right list)
      const res = await getAccountUsersAPI(account.id);
      const currentUsers = res.data || [];
      const linkedIds = new Set(currentUsers.map(u => u.id));
      setTargetUserIds(currentUsers.map(u => u.id));

      // Load all users in the account's organization for the left list
      if (!orgId) {
        const fallback = organizations.find(o => o.name === userOrganization)?.id;
        orgId = fallback;
      }
      let availableUsers = [];
      if (orgId) {
        try {
          const orgUsersRes = await getOrganizationUsersAPI(orgId);
          availableUsers = (orgUsersRes.data || [])
            .filter(u => !linkedIds.has(u.id))
            .map(u => ({ key: String(u.id), title: `${u.name} (${u.email})` }));
        } catch {
          availableUsers = [];
        }
      } else {
        message.warning('Organization not set for this account; unable to list available users.');
      }

      // Data for both panes
      const linkedPane = currentUsers.map(u => ({ key: String(u.id), title: `${u.name} (${u.email})` }));
      setUserList([...availableUsers, ...linkedPane]);
      setIsManageUsersVisible(true);
    } catch {
      message.error('Failed to load users for account');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchLinkRequests = async () => {
    try {
      setLinkLoading(true);
      const res = await listLinkRequestsAPI({});
      setLinkRequests(res?.data || []);
      setGlobalLinkRequests(res?.data || []);
    } catch {
      setLinkRequests([]);
      setGlobalLinkRequests([]);
    } finally {
      setLinkLoading(false);
    }
  };

  const fetchLinkedAccounts = async (accountId) => {
    try {
      setLinkLoading(true);
      const [whitelistRes, inverseRes] = await Promise.all([
        getAccountWhitelistAPI(accountId),
        getAccountWhitelistInverseAPI(accountId)
      ]);
      // Filter to external only (different organization_id from the current account)
      const current = (accounts || []).find(a => a.id === accountId);
      const currentOrg = current?.organization_id;
      const onlyExternal = (arr) => (arr || []).filter(a => a && a.organization_id && currentOrg && a.organization_id !== currentOrg);
      setLinkedAccounts(onlyExternal(whitelistRes?.data));
      setLinkedInverse(onlyExternal(inverseRes?.data));
    } catch {
      setLinkedAccounts([]);
      setLinkedInverse([]);
    } finally {
      setLinkLoading(false);
    }
  };

  const fetchGlobalLinkedData = async () => {
    if (!accounts || accounts.length === 0) {
      setLinkedAccountsById({});
      setLinkedInverseById({});
      setGlobalLinkRequests([]);
      return;
    }
    try {
      setLinkLoading(true);
      const whitelistPromises = accounts.map(a => getAccountWhitelistAPI(a.id).then(r => ({ id: a.id, data: r?.data || [] })).catch(() => ({ id: a.id, data: [] })));
      const inversePromises = accounts.map(a => getAccountWhitelistInverseAPI(a.id).then(r => ({ id: a.id, data: r?.data || [] })).catch(() => ({ id: a.id, data: [] })));
      const [whitelistResults, inverseResults, requestsRes] = await Promise.all([
        Promise.all(whitelistPromises),
        Promise.all(inversePromises),
        listLinkRequestsAPI({})
      ]);
      const byId = {};
      const invById = {};
      const orgMap = Object.fromEntries((accounts || []).map(a => [a.id, a.organization_id]));
      const filterExternal = (ownerId, items) => (items || []).filter(a => a && a.organization_id && orgMap[ownerId] && a.organization_id !== orgMap[ownerId]);
      whitelistResults.forEach(({ id, data }) => { byId[id] = filterExternal(id, data); });
      inverseResults.forEach(({ id, data }) => { invById[id] = filterExternal(id, data); });
      setLinkedAccountsById(byId);
      setLinkedInverseById(invById);
      setGlobalLinkRequests(requestsRes?.data || []);
    } catch {
      setLinkedAccountsById({});
      setLinkedInverseById({});
      setGlobalLinkRequests([]);
    } finally {
      setLinkLoading(false);
    }
  };

  useEffect(() => {
    if (accounts && accounts.length > 0) {
      fetchGlobalLinkedData();
    }
  }, [accounts]);

  const onUsersChange = async (nextTargetKeys) => {
    const desiredIds = nextTargetKeys.map(k => Number(k));
    const currentIds = targetUserIds;
    const toAdd = desiredIds.filter(id => !currentIds.includes(id));
    const toRemove = currentIds.filter(id => !desiredIds.includes(id));

    if (!selectedAccount) {
      return;
    }

    try {
      // Prefer super-admin endpoints for precise add/remove
      await Promise.all([
        ...toAdd.map(id => addUserToAccountAPI(selectedAccount.id, id)),
        ...toRemove.map(id => removeUserFromAccountAPI(selectedAccount.id, id)),
      ]);
      setTargetUserIds(desiredIds);
      message.success('Account user links updated');
    } catch (e) {
      message.error('Failed to update user links');
    }
  };

  const handleSelectAccount = async (account) => {
    setSelectedAccount(account);
    await fetchLinkedAccounts(account.id);
    await fetchLinkRequests();
  };

  const handleCreateSubaccounts = (account) => {
    setSubaccountParentId(account.id);
    setSubaccountParentName(account.account_name);
    setShowSubaccountWizard(true);
  };

  const handleGenerateMagicLink = async (subaccount) => {
    try {
      const result = await dispatch(generateMagicLink(subaccount.id)).unwrap();
      setMagicLinkModal({
        visible: true,
        link: result.magic_link,
        name: subaccount.name,
      });
    } catch (error) {
      message.error('Failed to generate magic link');
    }
  };

  const handleCopyMagicLink = () => {
    navigator.clipboard.writeText(magicLinkModal.link);
    message.success('Magic link copied to clipboard!');
  };

  // Fetch subaccounts when needed
  const handleRowExpand = (expanded, record) => {
    if (expanded && record.account_type === 'TRADING') {
      dispatch(fetchSubaccounts(record.id));
    }
  };

  // Helper to convert UUID(int) back to integer
  // UUID format: 00000000-0000-0000-0000-0000000003ec where 3ec (hex) = 1004 (decimal)
  const uuidToInt = (uuid) => {
    if (!uuid) return null;
    // Extract last 12 hex digits from UUID and convert to integer
    const hex = uuid.replace(/-/g, '').slice(-12);
    return parseInt(hex, 16);
  };

  // Expandable row renderer for subaccounts
  const expandedRowRender = (record) => {
    // Only show for TRADING accounts
    if (record.account_type !== 'TRADING') {
      return null;
    }

    const subaccountColumns = [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      { 
        title: 'Share', 
        dataIndex: 'pro_rata_share', 
        key: 'share',
        render: (share) => `${(share * 100).toFixed(1)}%`
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status) => (
          <Tag color={
            status === 'ACTIVE' ? 'green' :
            status === 'PENDING' ? 'orange' :
            status === 'CLAIMED' ? 'blue' : 'red'
          }>
            {status}
          </Tag>
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, subRecord) => (
          <Space size="small">
            <Button 
              size="small" 
              icon={<LinkOutlined />}
              onClick={() => handleGenerateMagicLink(subRecord)}
            >
              Magic Link
            </Button>
          </Space>
        ),
      },
    ];

    // Fix: Convert UUID parent_id to integer for comparison
    const accountSubaccounts = (subaccounts || []).filter(s => uuidToInt(s.parent_id) === record.id);

    return (
      <div style={{ padding: '0 24px 16px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={5}>Subaccounts</Title>
            <Button
              type="primary"
              size="small"
              icon={<TeamOutlined />}
              onClick={() => handleCreateSubaccounts(record)}
            >
              Create Subaccounts
            </Button>
          </div>
          <Table
            dataSource={accountSubaccounts}
            columns={subaccountColumns}
            loading={subaccountLoading}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: 'No subaccounts created yet. Click "Create Subaccounts" to add customer allocations.' }}
          />
        </Space>
      </div>
    );
  };

  const columns = [
    { title: 'Name', dataIndex: 'account_name', key: 'account_name' },
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Type', dataIndex: 'account_type', key: 'account_type', render: (t) => <Tag color="blue">{t || 'PRODUCTION'}</Tag> },
    { title: 'Transfers', key: 'transfer_disabled', render: (_, r) => <Tag color={r.transfer_disabled ? 'red' : 'green'}>{r.transfer_disabled ? 'Disabled' : 'Enabled'}</Tag> },
    {
      title: 'Actions', key: 'actions', render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} disabled={isRegularUser}>
            Edit
          </Button>
          <Button type="text" icon={<UserAddOutlined />} onClick={() => openManageUsers(record)} disabled={isRegularUser}>
            Users
          </Button>
          <Button type="text" onClick={async (e) => { e.stopPropagation(); await handleSelectAccount(record); }}>
            View Links
          </Button>
          {(isSuperAdmin || isAdmin) && (
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
              Delete
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0 }}>
            <CreditCardOutlined /> Account Management
          </Title>
          <Text type="secondary">Basic CRUD for accounts</Text>
        </div>

        <Card style={{ marginBottom: '16px' }}>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Input placeholder="Search accounts..." prefix={<SearchOutlined />} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            </Col>
            <Col span={8}>
              {(isSuperAdmin || isAdmin) && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setSelectedAccount(null); form.resetFields(); setIsCreateModalVisible(true); }}>
                  Add Account
                </Button>
              )}
            </Col>
          </Row>
        </Card>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <p>Loading accounts...</p>
          </div>
        ) : (
          <Table 
            columns={columns} 
            dataSource={filteredAccounts} 
            rowKey="id" 
            pagination={{ showSizeChanger: true, showQuickJumper: true }}
            expandable={{
              expandedRowRender,
              rowExpandable: (record) => record.account_type === 'TRADING',
              onExpand: handleRowExpand,
            }}
          />
        )}

        {/* Edit/Create Modal */}
        <Modal
          title={selectedAccount ? 'Edit Account' : 'Create Account'}
          open={isEditModalVisible || isCreateModalVisible}
          onCancel={() => { setIsEditModalVisible(false); setIsCreateModalVisible(false); }}
          onOk={() => form.submit()}
          confirmLoading={loading}
          width={600}
        >
          <Form form={form} layout="vertical" onFinish={handleSave}>
            <Form.Item label="Account Name" name="account_name">
              <Input />
            </Form.Item>
            {isSuperAdmin ? (
              <Form.Item label="Organization" name="organization_id" rules={[{ required: true, message: 'Please select organization' }]}>
                <Select placeholder="Select organization" loading={orgsLoading}>
                  {organizations.map((org) => (
                    <Option key={org.id} value={org.id}>{org.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            ) : (
              <Form.Item label="Organization">
                <Input value={userOrganization || 'N/A'} disabled />
              </Form.Item>
            )}
            <Form.Item label="Account Type" name="account_type" initialValue="PRODUCTION">
              <Select>
                <Option value="PRODUCTION">Production</Option>
                <Option value="TRADING">Trading</Option>
                <Option value="CONSUMPTION">Consumption</Option>
                <Option value="AUDIT">Audit</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Description" name="description">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item label="Disable Transfers" name="transfer_disabled" valuePropName="checked">
              <Select>
                <Option value={false}>Enabled</Option>
                <Option value={true}>Disabled</Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        {/* Accept Link Modal */}
        <Modal
          title="Accept Link Request"
          open={acceptVisible}
          onCancel={() => setAcceptVisible(false)}
          onOk={() => acceptForm.submit()}
          okText="Accept"
          confirmLoading={linkLoading}
        >
          <Form form={acceptForm} layout="vertical" onFinish={async (vals) => {
            try {
              setLinkLoading(true);
              await acceptLinkRequestAPI(acceptRequestId, { target_account_id: vals.target_account_id });
              message.success('Accepted');
              setAcceptVisible(false);
              acceptForm.resetFields();
              await fetchGlobalLinkedData();
            } catch {
              message.error('Accept failed');
            } finally {
              setLinkLoading(false);
            }
          }}>
            <Form.Item label="Target Account" name="target_account_id" rules={[{ required: true, message: 'Select your target account' }]}>
              <Select placeholder="Select your account to link">
                {(accounts || []).map(acc => (
                  <Option key={acc.id} value={acc.id}>{acc.account_name} (#{acc.id})</Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        {/* Manage Users Modal */}
        <Modal
          title={`Manage Account Users${selectedAccount ? ` - ${selectedAccount.account_name}` : ''}`}
          open={isManageUsersVisible}
          onCancel={() => setIsManageUsersVisible(false)}
          footer={null}
          width={700}
        >
          {usersLoading ? (
            <Spin />
          ) : (
            <Transfer
              titles={["Available", "Linked"]}
              dataSource={userList}
              targetKeys={targetUserIds.map(id => String(id))}
              onChange={onUsersChange}
              render={item => item.title}
              rowKey={item => item.key}
              listStyle={{ width: 300, height: 400 }}
            />
          )}
        </Modal>

        {/* Linked Accounts Section (Global) */}
        <Card
          style={{ marginTop: '16px' }}
          title={
            <Space>
              <span>Linked Accounts</span>
            </Space>
          }
          extra={
            <Button type="primary" onClick={() => { setCreateLinkVisible(true); }}>
              New Link
            </Button>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }}>
              <Row gutter={16}>
                <Col span={24}>
                  <Card size="small" title="Existing Links">
                    <Table
                      size="small"
                      rowKey={(r) => r.row_key || `${r.for_account?.id}-${r.id}`}
                      dataSource={
                        (accounts || []).flatMap(acc => {
                          const recv = (linkedAccountsById[acc.id] || []).map(a => ({ ...a, for_account: acc, row_key: `f${acc.id}-r-${a.id}` }));
                          const send = (linkedInverseById[acc.id] || []).map(a => ({ ...a, for_account: acc, row_key: `f${acc.id}-s-${a.id}` }));
                          // De-duplicate external links across directions to present a single link enabling bi-directional transfer
                          const seen = new Set();
                          const combined = [...recv, ...send].filter(r => {
                            const key = `${acc.id}-${r.id}`;
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                          });
                          return combined;
                        })
                      }
                      pagination={{ pageSize: 10, showSizeChanger: true }}
                      columns={[
                        { title: 'For Account', dataIndex: 'for', render: (_, r) => `${r.for_account?.account_name || 'Account'} (#${r.for_account?.id})` },
                        { title: 'Linked Account', dataIndex: 'account_name', render: (_, r) => `${r.account_name || r.description || 'Account'} (#${r.id})` },
                        { 
                          title: 'Organization', 
                          dataIndex: 'organization_id', 
                          render: (orgId, r) => {
                            const org = (organizations || []).find(o => o.id === orgId);
                            return org ? org.name : (orgId ? `Org #${orgId}` : 'N/A');
                          }
                        },
                        { title: 'Transfers', dataIndex: 'transfer_disabled', render: v => <Tag color={v ? 'red' : 'green'}>{v ? 'Disabled' : 'Enabled'}</Tag> },
                      ]}
                    />
                  </Card>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={24}>
                  <Card size="small" title="Link Requests">
                    <Table
                      size="small"
                      rowKey="id"
                      dataSource={globalLinkRequests}
                      loading={linkLoading}
                      pagination={{ pageSize: 10, showSizeChanger: true }}
                      columns={[
                        { title: 'ID', dataIndex: 'id' },
                        { title: 'Source Account', render: (_, r) => `${r.source_account_name || ''} (#${r.source_account_id})` },
                        { title: 'Source Org', dataIndex: 'source_organization_name', render: (name) => name || 'N/A' },
                        { title: 'Recipient Account', render: (_, r) => r.recipient_account_name ? `${r.recipient_account_name} (#${r.recipient_account_id})` : 'N/A' },
                        { title: 'Recipient Org', dataIndex: 'recipient_organization_name', render: (name) => name || 'N/A' },
                        { title: 'Status', dataIndex: 'status', render: s => <Tag color={s === 'pending' ? 'orange' : s === 'accepted' ? 'green' : 'red'}>{s}</Tag> },
                        {
                          title: 'Actions',
                          render: (_, r) => {
                            const isSender = isUserSender(r);
                            const isRecipientAdmin = isUserRecipientAdmin(r);
                            
                            return (
                              <Space>
                                {/* Accept/Decline: Only for recipient admins OR super admin */}
                                {(isRecipientAdmin || isSuperAdmin) && !isSender && r.status === 'pending' && (
                                  <>
                                    <Button size="small" onClick={() => { setAcceptRequestId(r.id); setAcceptVisible(true); }}>Accept</Button>
                                    <Button size="small" onClick={async () => {
                                      try { setLinkLoading(true); await declineLinkRequestAPI(r.id); message.success('Declined'); await fetchGlobalLinkedData(); } 
                                      catch { message.error('Decline failed'); } 
                                      finally { setLinkLoading(false); }
                                    }}>Decline</Button>
                                  </>
                                )}
                                
                                {/* Revoke: Only for sender OR super admin */}
                                {(isSender || isSuperAdmin) && r.status !== 'revoked' && (
                                  <Button size="small" danger onClick={async () => {
                                    try { setLinkLoading(true); await revokeLinkRequestAPI(r.id); message.success('Revoked'); await fetchGlobalLinkedData(); } 
                                    catch { message.error('Revoke failed'); } 
                                    finally { setLinkLoading(false); }
                                  }}>Revoke</Button>
                                )}
                              </Space>
                            );
                          }
                        }
                      ]}
                    />
                  </Card>
                </Col>
              </Row>
            </Space>
        </Card>

        {/* Create New Link Modal */}
        <Modal
          title={`Create New Link`}
          open={createLinkVisible}
          onCancel={() => setCreateLinkVisible(false)}
          onOk={() => linkForm.submit()}
          okText="Create"
          confirmLoading={linkLoading}
        >
          <Form layout="vertical" form={linkForm} onFinish={async (vals) => {
            try {
              setLinkLoading(true);
              const payload = { target_identifier: vals.target_identifier, note: vals.note || undefined };
              await createLinkRequestAPI(vals.source_account_id, payload);
              message.success('Link request sent');
              linkForm.resetFields();
              setCreateLinkVisible(false);
              await fetchGlobalLinkedData();
            } catch (e) {
              message.error(e?.message || 'Failed to create link request');
            } finally {
              setLinkLoading(false);
            }
          }}>
            <Form.Item label="Source Account" name="source_account_id" rules={[{ required: true, message: 'Select a source account' }]}>
              <Select placeholder="Select source account">
                {(accounts || []).map(acc => (
                  <Option key={acc.id} value={acc.id}>{acc.account_name} (#{acc.id})</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="Target (Account ID or Email)" name="target_identifier" rules={[{ required: true, message: 'Account ID or email' }]}>
              <Input placeholder="Target Account ID or Email" />
            </Form.Item>
            <Form.Item label="Note" name="note">
              <Input placeholder="Optional note" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Subaccount Wizard Modal */}
        {showSubaccountWizard && (
          <SubaccountWizard
            visible={showSubaccountWizard}
            onCancel={() => {
              setShowSubaccountWizard(false);
              // Refresh subaccounts after creation
              if (subaccountParentId) {
                dispatch(fetchSubaccounts(subaccountParentId));
              }
            }}
            accountId={subaccountParentId}
            accountName={subaccountParentName}
          />
        )}

        {/* Magic Link Modal */}
        <Modal
          title={`Magic Link for ${magicLinkModal.name}`}
          open={magicLinkModal.visible}
          onCancel={() => setMagicLinkModal({ visible: false, link: '', name: '' })}
          footer={[
            <Button key="close" onClick={() => setMagicLinkModal({ visible: false, link: '', name: '' })}>
              Close
            </Button>,
            <Button 
              key="copy" 
              type="primary" 
              icon={<CopyOutlined />}
              onClick={handleCopyMagicLink}
            >
              Copy Link
            </Button>,
          ]}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>
              Share this link with your customer to allow them to claim their subaccount and view GC allocations.
            </Text>
            <Input.TextArea
              value={magicLinkModal.link}
              readOnly
              autoSize={{ minRows: 3, maxRows: 5 }}
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
            />
            <Text type="secondary" style={{ marginTop: 8 }}>
              <strong>Security Notes:</strong>
              <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                <li>This link is single-use and unique to this customer</li>
                <li>Customer will need to login or register to claim</li>
                <li>After claiming, customer gets read-only access to GC allocations</li>
              </ul>
            </Text>
          </Space>
        </Modal>
      </div>
    </div>
  );
};

export default AccountManagement;



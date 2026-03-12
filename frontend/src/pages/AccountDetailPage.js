import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Button, Table, Tag, Space, message, Modal, Typography, Input } from 'antd';
import { PlusOutlined, TeamOutlined, LinkOutlined, CopyOutlined } from '@ant-design/icons';
import { fetchAccountDetails } from '../store/account/accountThunk';
import { fetchSubaccounts, generateMagicLink } from '../store/subaccount/subaccountThunk';
import SubaccountWizard from '../components/SubaccountWizard';

const { Paragraph } = Typography;

const AccountDetailPage = () => {
  const { accountId } = useParams();
  const dispatch = useDispatch();
  const [showSubaccountWizard, setShowSubaccountWizard] = useState(false);
  const [magicLinkModal, setMagicLinkModal] = useState({ visible: false, link: '', name: '' });

  const { currentAccount, loading: accountLoading } = useSelector(state => state.account);
  const { subaccounts, loading: subaccountLoading } = useSelector(state => state.subaccount);

  useEffect(() => {
    if (accountId) {
      dispatch(fetchAccountDetails(accountId));
      dispatch(fetchSubaccounts(accountId));
    }
  }, [accountId, dispatch]);

  const handleCreateSubaccounts = () => {
    setShowSubaccountWizard(true);
  };

  const handleWizardCancel = () => {
    setShowSubaccountWizard(false);
    // Refresh subaccounts after creation
    dispatch(fetchSubaccounts(accountId));
  };

  const subaccountColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Share',
      dataIndex: 'pro_rata_share',
      key: 'share',
      render: (share) => `${(share * 100).toFixed(1)}%`,
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
      title: 'Virtual Energy',
      key: 'virtual_energy',
      render: (_, record) => {
        // Calculate virtual energy based on parent account energy
        const parentEnergy = currentAccount?.total_energy_wh || 0;
        const virtualEnergy = Math.max(1, Math.floor(parentEnergy * record.pro_rata_share));
        return `${virtualEnergy.toLocaleString()} Wh`;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button 
            size="small" 
            icon={<LinkOutlined />}
            onClick={() => handleGenerateMagicLink(record)}
          >
            Magic Link
          </Button>
          <Button size="small" onClick={() => handleViewAllocations(record.id)}>
            View Allocations
          </Button>
        </Space>
      ),
    },
  ];

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

  const handleViewAllocations = (subaccountId) => {
    // TODO: Navigate to subaccount detail page
    message.info('Allocation detail view coming soon');
  };

  if (accountLoading) {
    return <div>Loading account details...</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={`${currentAccount?.account_name || 'Account'} Details`}
        extra={
          <Space>
            <Button
              type="primary"
              icon={<TeamOutlined />}
              onClick={handleCreateSubaccounts}
            >
              Create Subaccounts
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 24 }}>
          <p><strong>Account ID:</strong> {currentAccount?.id}</p>
          <p><strong>Type:</strong> {currentAccount?.account_type}</p>
          <p><strong>Total Energy:</strong> {currentAccount?.total_energy_wh?.toLocaleString() || 0} Wh</p>
          <p><strong>Active Certificates:</strong> {currentAccount?.active_certificates || 0}</p>
        </div>

        <Card title="Subaccounts" size="small">
          <Table
            dataSource={subaccounts}
            columns={subaccountColumns}
            loading={subaccountLoading}
            rowKey="id"
            pagination={false}
          />
        </Card>
      </Card>

      <SubaccountWizard
        visible={showSubaccountWizard}
        onCancel={handleWizardCancel}
        accountId={accountId}
        accountName={currentAccount?.account_name}
      />

      <Modal
        title={`Magic Link for ${magicLinkModal.name}`}
        visible={magicLinkModal.visible}
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
          <Paragraph>
            Share this link with your customer to allow them to claim their subaccount and view GC allocations.
          </Paragraph>
          <Input.TextArea
            value={magicLinkModal.link}
            readOnly
            autoSize={{ minRows: 3, maxRows: 5 }}
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          />
          <Paragraph type="secondary" style={{ marginTop: 8 }}>
            <strong>Security Notes:</strong>
            <ul style={{ marginTop: 4, paddingLeft: 20 }}>
              <li>This link is single-use and unique to this customer</li>
              <li>Customer will need to login or register to claim</li>
              <li>After claiming, customer gets read-only access to GC allocations</li>
            </ul>
          </Paragraph>
        </Space>
      </Modal>
    </div>
  );
};

export default AccountDetailPage;

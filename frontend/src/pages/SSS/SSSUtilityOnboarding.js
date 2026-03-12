import React, { useState, useEffect } from 'react';
import { Card, Tabs, Typography, Steps, Progress, Tag, Divider, Space, Form, Input, Button, Select, Alert, Modal, Table } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { TabPane } = Tabs;
const { Step } = Steps;
const { Title, Paragraph } = Typography;
const { Option } = Select;
const { Item } = Form;

const SSSUtilityOnboarding = () => {
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState(localStorage.getItem('sss_verificationStatus') || 'pending');
  const [claimedSuppliers, setClaimedSuppliers] = useState([]);

  useEffect(() => {
    localStorage.setItem('sss_verificationStatus', verificationStatus);
  }, [verificationStatus]);

  const steps = [
    {
      key: 'create-account',
      title: 'Create Utility Account & Claim Estimates',
      description: 'Create your utility account and claim ownership of existing SSS estimates for your service territories.',
      status: 'complete',
    },
    {
      key: 'admin-verification',
      title: 'Await Admin Verification (KYC)',
      description: 'Super admin will review your claim and perform KYC verification.',
      status: verificationStatus === 'verified' ? 'complete' : (verificationStatus === 'in-review' ? 'in-progress' : 'pending'),
    },
    {
      key: 'upload-factors',
      title: 'Upload Factors, RPS, RECs',
      description: 'Upload accurate data to replace estimates. Status will change to Verified upon approval.',
      status: 'pending',
    },
    {
      key: 'manage-resources',
      title: 'Manage Resources & Issue GCs',
      description: 'Add resources and issue Granular Certificates (GCs).',
      status: 'pending',
    },
    {
      key: 'allocate-customers',
      title: 'Allocate to Customers',
      description: 'Assign resources and factors to customer accounts.',
      status: 'pending',
    },
    {
      key: 'upload-additional',
      title: 'Upload Additional Data',
      description: 'Upload supporting data as needed.',
      status: 'pending',
    },
  ];

  const completedSteps = steps.filter(s => s.status === 'complete').length;
  const progressPercent = Math.round((completedSteps / steps.length) * 100);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'in-progress':
        return <LoadingOutlined style={{ color: '#faad14' }} />;
      case 'pending':
      default:
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
    }
  };

  const handleClaim = (supplier) => {
    setClaimedSuppliers([...claimedSuppliers, supplier]);
    setVerificationStatus('in-review');
    Modal.success({ content: 'Claim submitted for verification.' });
  };

  return (
    <Card style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Title level={2}>Utility Onboarding Portal</Title>
      <Paragraph>
        Welcome to the SSS Utility Onboarding Portal. Complete each step to verify your supplier and enable granular energy certificate management for your customers.
      </Paragraph>

      <Table
        dataSource={steps}
        columns={[
          { title: 'Title', dataIndex: 'title', key: 'title' },
          { title: 'Description', dataIndex: 'description', key: 'description' },
          {
            title: 'Status',
            key: 'status',
            render: (_, record) => <Tag color={record.status === 'complete' ? 'green' : 'orange'}>{record.status}</Tag>,
          },
          {
            title: 'Action',
            key: 'action',
            render: (_, record) => <Button onClick={() => navigate(`/sss/onboarding/${record.key}`)}>Go to Step</Button>,
          },
        ]}
        pagination={false}
      />

      {/* Progress Section */}
      <Space direction="vertical" size="large" style={{ width: '100%', marginBottom: 24 }}>
        <Progress percent={progressPercent} status="active" />
        <Tag color="blue">{completedSteps} of {steps.length} steps completed</Tag>
        <Divider />
      </Space>
    </Card>
  );
};

export default SSSUtilityOnboarding; 
import React, { useState, useEffect } from 'react';
import { Card, Typography, Progress, Tag, Divider, Table, Button } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const SSSEndUserOnboarding = () => {
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState(localStorage.getItem('sss_enduser_status') || 'pending');

  useEffect(() => {
    localStorage.setItem('sss_enduser_status', verificationStatus);
  }, [verificationStatus]);

  const steps = [
    {
      key: 'baseline-mix',
      title: 'View Baseline SSS Mix',
      description: 'Select your U.S. state or balancing authority, choose your supplier, and view the resource mix, CFE percentage, emissions factor, and provenance.',
      status: 'complete', // Mock, can be dynamic based on user progress
    },
    {
      key: 'customer-links',
      title: 'Claim Granular Certificates',
      description: 'Link your SSS account to automatically receive pro-rata shares of retired GCs based on your interval load.',
      status: verificationStatus === 'verified' ? 'complete' : (verificationStatus === 'in-review' ? 'in-progress' : 'pending'),
    },
  ];

  const completedSteps = steps.filter(s => s.status === 'complete').length;
  const progressPercent = Math.round((completedSteps / steps.length) * 100);

  return (
    <Card style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Title level={2}>End User SSS Portal</Title>
      <Paragraph>
        Welcome to the SSS End User Portal. Complete these steps to view your baseline supply service information and claim your granular certificates.
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
            render: (_, record) => <Button onClick={() => navigate(`/sss/enduser/${record.key}`)}>Go to Step</Button>,
          },
        ]}
        pagination={false}
      />

      {/* Progress Section */}
      <Divider />
      <Progress percent={progressPercent} status="active" />
      <Tag color="blue">{completedSteps} of {steps.length} steps completed</Tag>
    </Card>
  );
};

export default SSSEndUserOnboarding; 
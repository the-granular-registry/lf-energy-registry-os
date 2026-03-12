import React, { useState } from 'react';
import { Card, Steps, Button, Typography, Space, Progress, Divider, Tag } from 'antd';

import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Step } = Steps;
const { Title, Paragraph } = Typography;

const SSSUtilityLanding = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Select Your Provider',
      description: 'Choose your utility provider from the list of published suppliers in U.S. states. If not listed, request addition via admin.',
      status: 'complete', // Mock status: 'pending', 'complete', 'in-progress'
    },
    {
      title: 'Manage Provider Details',
      description: 'Update compliance contacts, regions served, and other provider information. Ensure all details are accurate for SSS compliance.',
      status: 'in-progress',
    },
    {
      title: 'Upload Baseline Mix Factors',
      description: 'Upload annual or monthly renewable energy mix and emissions factors to improve estimate accuracy. Use the Data Upload tab for bulk imports.',
      status: 'pending',
    },
    {
      title: 'Manage Resources',
      description: 'Add and manage energy resources (e.g., solar farms, wind turbines) associated with your provider.',
      status: 'pending',
    },
    {
      title: 'Allocate to Customers',
      description: 'Assign SSS resources and factors to customer accounts for granular tracking and certificate issuance.',
      status: 'pending',
    },
    {
      title: 'Upload Additional Data',
      description: 'Upload supporting data for retirements, allocations, or historical records to complete your SSS setup.',
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
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'pending':
      default:
        return null;
    }
  };

  return (
    <Card
      title={
        <div>
          <Title level={2} style={{ margin: 0 }}>Welcome to SSS Utility Onboarding</Title>
          <Paragraph type="secondary">
            Follow these steps to set up your Standard Supply Service (SSS) provider account.
          </Paragraph>
        </div>
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Progress percent={progressPercent} status="active" />
        <Tag color="blue">{completedSteps} of {steps.length} steps completed</Tag>
        <Divider />
        <Steps current={currentStep} direction="vertical">
          {steps.map((step, index) => (
            <Step
              key={index}
              title={<span>{step.title} {getStatusIcon(step.status)}</span>}
              description={<Paragraph>{step.description}</Paragraph>}
              onStepClick={() => setCurrentStep(index)}
            />
          ))}
        </Steps>
        <Divider />
        <Button type="primary" onClick={onComplete}>
          Complete Onboarding & Proceed to SSS Dashboard
        </Button>
      </Space>
    </Card>
  );
};

export default SSSUtilityLanding; 
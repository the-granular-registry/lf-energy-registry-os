import React from 'react';
import { Typography, Card, Row, Col, Button, Space } from 'antd';
import { ArrowLeftOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function ComplianceSummaryReport() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '20px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/reporting')}
            style={{ marginBottom: '16px' }}
          >
            Back to Reports
          </Button>
          <Title level={2}>
            <SafetyCertificateOutlined style={{ marginRight: '8px' }} />
            Compliance Summary Report
          </Title>
          <Text type="secondary">
            Pre-formatted reports aligning with regulatory requirements
          </Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="Regulatory Compliance" size="small">
              <Text>Compliance status will be displayed here</Text>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="GHG Protocol Scope 2" size="small">
              <Text>Scope 2 compliance details will be shown here</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="SEC Climate Disclosures" size="small">
              <Text>SEC disclosure requirements will be displayed here</Text>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
} 
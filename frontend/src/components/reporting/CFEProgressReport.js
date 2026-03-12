import React from 'react';
import { Typography, Card, Row, Col, Button, Space } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function CFEProgressReport() {
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
            <CheckCircleOutlined style={{ marginRight: '8px' }} />
            24/7 CFE Progress Report
          </Title>
          <Text type="secondary">
            Comprehensive report on 24/7 carbon-free energy achievement
          </Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="CFE Achievement Summary" size="small">
              <Text>Overall CFE percentage will be calculated here</Text>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="Hourly CFE Breakdown" size="small">
              <Text>Hour-by-hour CFE analysis will be shown here</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Location-based CFE" size="small">
              <Text>Geographic CFE performance will be displayed here</Text>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
} 
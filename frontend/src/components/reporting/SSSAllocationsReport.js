import React from 'react';
import { Typography, Card, Row, Col, Button, Space } from 'antd';
import { ArrowLeftOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function SSSAllocationsReport() {
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
            <DatabaseOutlined style={{ marginRight: '8px' }} />
            SSS Allocations Report
          </Title>
          <Text type="secondary">
            Standard Supply Service allocation tracking and analysis
          </Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="Allocation Overview" size="small">
              <Text>SSS allocation summary will be displayed here</Text>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="Allocation Breakdown" size="small">
              <Text>Detailed allocation analysis will be shown here</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Provider Performance" size="small">
              <Text>SSS provider metrics will be displayed here</Text>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
} 
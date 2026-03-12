import React from 'react';
import { Typography, Card, Row, Col, Button, Space } from 'antd';
import { ArrowLeftOutlined, AuditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function AuditTrailReport() {
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
            <AuditOutlined style={{ marginRight: '8px' }} />
            Audit Trail Report
          </Title>
          <Text type="secondary">
            Detailed audit trail of all GC lifecycle events for compliance verification
          </Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="Event Timeline" size="small">
              <Text>Chronological log of all GC events will be displayed here</Text>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="Verification Summary" size="small">
              <Text>Audit verification results will be shown here</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Anomaly Detection" size="small">
              <Text>Flagged anomalies will be displayed here</Text>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
} 
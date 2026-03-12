import React from 'react';
import { Card, Row, Col, Typography, Divider } from 'antd';
import { 
  BarChartOutlined, 
  FileTextOutlined, 
  EnvironmentOutlined,
  CheckCircleOutlined,
  AuditOutlined,
  SafetyCertificateOutlined,
  FileSearchOutlined,
  DatabaseOutlined,
  ThunderboltFilled
} from '@ant-design/icons';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function Reporting() {
  const { userData } = useUser();
  const navigate = useNavigate();
  const role = userData?.userInfo?.role;
  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 5;

  const reportCategories = [
    {
      title: "REC Desk/Trading",
      description: "Operational procurement, trading, and portfolio management",
      visible: role !== 'AUDIT_USER',
      reports: [
        {
          key: 'inventory',
          title: 'GC Inventory Report',
          description: 'Summary of GC inventory and transactions',
          icon: <FileTextOutlined style={{ fontSize: '20px' }} />,
          path: '/reporting/inventory'
        },
        {
          key: 'certificate-history',
          title: 'Certificate History',
          description: 'All certificate activities: issuances, retirements, transfers, splits',
          icon: <FileSearchOutlined style={{ fontSize: '20px' }} />,
          path: '/reporting/certificate-history'
        }
      ]
    },
    {
      title: "Sustainability",
      description: "ESG reporting, carbon accounting, and strategic insights",
      visible: isSuperAdmin || role === 'TRADING_USER' || role === 'ADMIN',
      reports: [
        {
          key: 'timestamp-report',
          title: 'Timestamp Report',
          description: 'Generation analysis by local hour and time',
          icon: <BarChartOutlined style={{ fontSize: '20px' }} />,
          path: '/reporting/timestamp'
        },
        {
          key: 'carbon-impact',
          title: 'Carbon Impact Report',
          description: 'Quantified avoided emissions for ESG disclosures',
          icon: <EnvironmentOutlined style={{ fontSize: '20px' }} />,
          path: '/reporting/carbon-impact'
        },
        {
          key: 'sss-allocations',
          title: 'SSS Allocations',
          description: 'Standard Supply Service allocation tracking',
          icon: <DatabaseOutlined style={{ fontSize: '20px' }} />,
          path: '/reporting/sss-allocations'
        }
      ]
    },
    {
      title: "Attestation",
      description: "Verification, audit trails, and regulatory alignment",
      visible: isSuperAdmin || role === 'AUDIT_USER' || role === 'ADMIN',
      reports: [
        {
          key: 'audit-trail',
          title: 'Audit Trail Report',
          description: 'Detailed audit trail of all GC lifecycle events',
          icon: <AuditOutlined style={{ fontSize: '20px' }} />,
          path: '/reporting/audit-trail'
        },
        {
          key: 'compliance-summary',
          title: 'Compliance Summary',
          description: 'Pre-formatted regulatory compliance reports',
          icon: <SafetyCertificateOutlined style={{ fontSize: '20px' }} />,
          path: '/reporting/compliance-summary'
        }
      ]
    },
    {
      title: "Storage",
      description: "Time-shifted energy tracking and storage efficiency analysis",
      visible: true,
      reports: [
        {
          key: 'star-report',
          title: 'STAR Report',
          description: 'Storage Time Allocation Records with energy conservation verification and SOC tracking',
          icon: <ThunderboltFilled style={{ fontSize: '20px' }} />,
          path: '/reporting/star'
        },
        {
          key: 'storage-measurements-report',
          title: 'Storage Measurement Reports',
          description: 'QA report for submitted storage meter data',
          icon: <BarChartOutlined style={{ fontSize: '20px' }} />,
          path: '/reporting/storage-measurements'
        }
      ]
    }
  ];

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>Reporting Overview by Use Case</Title>
      <Text type="secondary" style={{ marginBottom: '32px', display: 'block' }}>
        Select a report category and specific report to view detailed analytics and insights
      </Text>
      
      <Row gutter={[24, 24]}>
        {reportCategories.filter(category => category.visible).map(category => (
          <Col xs={24} lg={8} key={category.title}>
            <div style={{ height: '100%' }}>
              <Title level={4} style={{ textAlign: 'center', marginBottom: '8px' }}>
                {category.title}
              </Title>
              <Text type="secondary" style={{ 
                display: 'block', 
                textAlign: 'center', 
                marginBottom: '16px',
                fontSize: '12px'
              }}>
                {category.description}
              </Text>
              <Divider style={{ margin: '16px 0' }} />
              
              <Row gutter={[16, 16]}>
                {category.reports.map(report => (
                  <Col span={24} key={report.key}>
                    <Card
                      hoverable
                      size="small"
                      onClick={() => navigate(report.path)}
                      style={{ height: '100%' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '8px 0' }}>
                        <div style={{ marginBottom: '8px' }}>
                          {report.icon}
                        </div>
                        <div>
                          <Title level={5} style={{ marginBottom: '4px' }}>
                            {report.title}
                          </Title>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {report.description}
                          </Text>
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
} 
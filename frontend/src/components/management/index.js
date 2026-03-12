import React from 'react';
import { Card, Row, Col, Typography, Divider } from 'antd';
import { 
  UserOutlined,
  BankOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { DeviceIcon } from '../../assets/icon/DeviceIcon';
import { AccountIcon } from '../../assets/icon/AccountIcon';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function Management() {
  const { userData } = useUser();
  const navigate = useNavigate();
  const role = userData?.userInfo?.role;
  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 5;

  const managementCategories = [
    {
      title: "System Administration",
      description: "Core administrative functions and oversight",
      visible: isSuperAdmin,
      items: [
        {
          key: 'super-admin-dashboard',
          title: 'Dashboard',
          description: 'System overview and administrative controls',
          icon: <DashboardOutlined style={{ fontSize: '20px' }} />,
          path: '/super-admin'
        },
        {
          key: 'csv-reformat-tool',
          title: 'CSV Reformat Tool',
          description: 'AI-powered CSV/Excel reformatting',
          icon: <FileTextOutlined style={{ fontSize: '20px' }} />,
          path: '/super-admin/csv-tool'
        }
      ]
    },
    {
      title: "Entity Management",
      description: "Manage organizations, accounts, and users",
      visible: true,
      items: [
        {
          key: 'organizations',
          title: 'Organizations',
          description: 'Manage organizations and their configurations',
          icon: <BankOutlined style={{ fontSize: '20px' }} />,
          path: '/organization-management'
        },
        {
          key: 'accounts',
          title: 'Accounts',
          description: 'Manage registry accounts and access',
          icon: <AccountIcon width={20} height={20} />,
          path: '/account-management'
        },
        {
          key: 'users',
          title: 'Users',
          description: 'User management and permissions',
          icon: <UserOutlined style={{ fontSize: '20px' }} />,
          path: '/users'
        }
      ]
    },
    {
      title: "Resource Management",
      description: "Manage devices and measurement data",
      visible: true,
      items: [
        {
          key: 'devices',
          title: 'Devices',
          description: 'Register and manage generation devices',
          icon: <DeviceIcon width={20} height={20} />,
          path: '/devices'
        },
        {
          key: 'measurement-reports',
          title: 'Measurement Reports',
          description: 'Generation measurement data and validation',
          icon: <FileTextOutlined style={{ fontSize: '20px' }} />,
          path: '/measurement-reports'
        }
      ]
    }
  ];

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>Management Overview</Title>
      <Text type="secondary" style={{ marginBottom: '32px', display: 'block' }}>
        Select a management area to configure and administer the registry
      </Text>
      
      <Row gutter={[24, 24]}>
        {managementCategories.filter(category => category.visible).map(category => (
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
                {category.items.map(item => (
                  <Col span={24} key={item.key}>
                    <Card
                      hoverable
                      size="small"
                      onClick={() => navigate(item.path)}
                      style={{ height: '100%' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '8px 0' }}>
                        <div style={{ marginBottom: '8px' }}>
                          {item.icon}
                        </div>
                        <div>
                          <Title level={5} style={{ marginBottom: '4px' }}>
                            {item.title}
                          </Title>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {item.description}
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


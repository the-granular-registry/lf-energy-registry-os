import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Button, 
  Space, 
  Divider, 
  Typography, 
  Avatar,
  Tag,
  Table,
  Spin
} from 'antd';
import { 
  BankOutlined, 
  UserOutlined, 
  CreditCardOutlined, 
  ExperimentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  DatabaseOutlined,
  ApiOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { getOrganizationsAPI, getOrganizationStatsAPI } from '../../api/organizationAPI';
import ApprovalDashboard from './ApprovalDashboard';
import { setDashboardStats, setLoading } from '../../store/superAdmin/superAdminSlice';
import { logger } from '../../utils';

const { Title, Text } = Typography;

const SuperAdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { dashboardStats, loading } = useSelector(state => state.superAdmin);
  const { userData } = useUser();
  const currentUser = userData?.userInfo;
  
  const [orgStatsTable, setOrgStatsTable] = useState([]);

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  // No org context on dashboard anymore

  const fetchGlobalStats = async () => {
    try {
      dispatch(setLoading(true));
      const orgsResponse = await getOrganizationsAPI();
      
      // TODO: Replace with backend aggregates when available
      dispatch(setDashboardStats({
        organizations: orgsResponse.data?.length || 0,
        users: 0,
        accounts: 0,
        devices: 0,
        pendingApprovals: 0
      }));
      
      // Build per-org stats using the organization stats endpoint (single call per org)
      const orgs = orgsResponse.data || [];
      const table = await Promise.all(
        orgs.map(async (org) => {
          try {
            // Use the organization stats endpoint which returns all counts in one call
            const statsRes = await getOrganizationStatsAPI(org.id);
            const stats = statsRes?.data || {};
            
            logger.debug(`Organization ${org.name} stats:`, stats);
            
            return {
              id: org.id,
              name: org.name,
              total_accounts: stats.total_accounts || 0,
              total_users: stats.total_users || 0,
              total_devices: stats.total_devices || 0,
              sum_certificate_energy: stats.total_certificates || 0,
            };
          } catch (error) {
            logger.warn(`Failed to fetch stats for organization ${org.name}:`, error);
            return {
              id: org.id,
              name: org.name,
              total_accounts: 0,
              total_users: 0,
              total_devices: 0,
              sum_certificate_energy: 0,
            };
          }
        })
      );
      
      setOrgStatsTable(table);
      logger.info(`Loaded stats for ${table.length} organizations`);
    } catch (error) {
      logger.error('Failed to fetch global stats:', error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleNavigateToManagement = (section) => {
    navigate(`/super-admin/${section}`);
  };

  // Removed org-specific stats

  // Temporarily removed pending organizations table until endpoint is available

  return (
    <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0, color: '#1f2937' }}>
            Super Admin Dashboard
          </Title>
          <Text type="secondary">
            Platform-wide management and oversight
          </Text>
        </div>

        {/* Org context removed */}

        {/* Global Platform Stats */}
        <Card title="Platform Overview" style={{ marginBottom: '24px' }}>
          <Row gutter={24}>
            <Col span={6}>
              <Statistic
                title="Total Organizations"
                value={dashboardStats.organizations}
                prefix={<BankOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Total Users"
                value={dashboardStats.users}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Total Accounts"
                value={dashboardStats.accounts}
                prefix={<CreditCardOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Pending Approvals"
                value={dashboardStats.pendingApprovals}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
          </Row>
        </Card>

        {/* Per-Organization Stats Table */}
        <Card title="Organizations Overview" style={{ marginBottom: '24px' }}>
          <Table
            rowKey="id"
            dataSource={orgStatsTable}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            columns={[
              { title: 'Organization', dataIndex: 'name', key: 'name' },
              { title: 'Accounts', dataIndex: 'total_accounts', key: 'total_accounts' },
              { title: 'Users', dataIndex: 'total_users', key: 'total_users' },
              { title: 'Devices', dataIndex: 'total_devices', key: 'total_devices' },
              { title: 'Sum Certificate Energy', dataIndex: 'sum_certificate_energy', key: 'sum_certificate_energy' },
            ]}
          />
        </Card>

        {/* Management Actions */}
        <Card title="Management Actions" style={{ marginBottom: '24px' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Button 
                type="primary" 
                block 
                size="large"
                icon={<BankOutlined />}
                onClick={() => navigate('/organization-management')}
              >
                Manage Organizations
              </Button>
            </Col>
            <Col span={6}>
              <Button 
                type="primary" 
                block 
                size="large"
                icon={<UserOutlined />}
                onClick={() => navigate('/users')}
              >
                Manage Users
              </Button>
            </Col>
            <Col span={6}>
              <Button 
                type="primary" 
                block 
                size="large"
                icon={<CreditCardOutlined />}
                onClick={() => navigate('/account-management')}
              >
                Manage Accounts
              </Button>
            </Col>
            <Col span={6}>
              <Button 
                type="primary" 
                block 
                size="large"
                icon={<ExperimentOutlined />}
                onClick={() => navigate('/devices')}
              >
                Manage Devices
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Approvals Section embedded */}
        <Card title="Approvals" style={{ marginBottom: '24px' }}>
          <ApprovalDashboard />
        </Card>

        {/* Data Sources Section */}
        <Card title="Data Sources" style={{ marginBottom: '24px' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
            View and manage external data sources for the platform
          </Text>
          <Button 
            type="primary" 
            icon={<DatabaseOutlined />}
            onClick={() => navigate('/super-admin/data-sources')}
          >
            Manage Data Sources
          </Button>
        </Card>

        {/* OIDC Clients Section */}
        <Card title="OIDC Clients" style={{ marginBottom: '24px' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
            Manage OAuth/OIDC client applications for authentication
          </Text>
          <Button 
            type="primary" 
            icon={<ApiOutlined />}
            onClick={() => navigate('/super-admin/oidc-clients')}
          >
            Manage OIDC Clients
          </Button>
        </Card>

        {/* Pending Organization Approvals - Temporarily disabled until endpoint is available */}
        {/* TODO: Add pending organizations endpoint and re-enable this section */}
      </div>
    </div>
  );
};

export default SuperAdminDashboard; 
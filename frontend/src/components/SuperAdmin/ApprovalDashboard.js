import React, { useState, useEffect } from 'react';
import { Card, Tabs, Spin, Alert, Button, Space } from 'antd';
import { 
  ClockCircleOutlined, 
  HistoryOutlined, 
  DashboardOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectActiveTab, 
  selectApprovalLoading, 
  selectApprovalErrors,
  setActiveTab,
  fetchPendingApprovals,
  fetchApprovalHistory,
  fetchApprovalStats,
  clearErrors
} from '../../store/approval/approvalSlice';
import { logger } from '../../utils';
import PendingApprovals from './PendingApprovals';
import ApprovalHistory from './ApprovalHistory';
import ApprovalStats from './ApprovalStats';

// Antd Tabs.TabPane is deprecated; use items prop

/**
 * Main approval dashboard component for super admin approval management
 */
const ApprovalDashboard = () => {
  const dispatch = useDispatch();
  const activeTab = useSelector(selectActiveTab);
  const loading = useSelector(selectApprovalLoading);
  const errors = useSelector(selectApprovalErrors);
  
  const [refreshing, setRefreshing] = useState(false);

  // Load initial data
  useEffect(() => {
    logger.debug('ApprovalDashboard: Loading initial data');
    handleRefresh();
  }, []);

  // Handle tab change
  const handleTabChange = (key) => {
    logger.debug('ApprovalDashboard: Changing tab to', key);
    dispatch(setActiveTab(key));
    
    // Load data for the selected tab if not already loaded
    switch (key) {
      case 'pending':
        dispatch(fetchPendingApprovals());
        break;
      case 'history':
        dispatch(fetchApprovalHistory());
        break;
      case 'stats':
        dispatch(fetchApprovalStats());
        break;
      default:
        break;
    }
  };

  // Handle refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    logger.debug('ApprovalDashboard: Refreshing all data');
    
    try {
      // Clear any existing errors
      dispatch(clearErrors());
      
      // Fetch all data in parallel
      await Promise.all([
        dispatch(fetchPendingApprovals()),
        dispatch(fetchApprovalHistory()),
        dispatch(fetchApprovalStats())
      ]);
      
      logger.debug('ApprovalDashboard: All data refreshed successfully');
    } catch (error) {
      logger.error('ApprovalDashboard: Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Check if there are any errors
  const hasErrors = Object.values(errors).some(error => error !== null);
  const errorMessages = Object.entries(errors)
    .filter(([key, value]) => value !== null)
    .map(([key, value]) => `${key}: ${value}`);

  return (
    <div className="approval-dashboard" style={{ padding: '24px' }}>
      <Card 
        title="Approval Management" 
        className="dashboard-card"
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
              loading={refreshing}
              type="default"
            >
              Refresh
            </Button>
          </Space>
        }
        style={{ 
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          borderRadius: '8px'
        }}
      >
        {hasErrors && (
          <Alert
            message="Error Loading Data"
            description={
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {errorMessages.map((msg, index) => (
                  <li key={index}>{msg}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
            closable
            onClose={() => dispatch(clearErrors())}
            style={{ marginBottom: '16px' }}
          />
        )}
        
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          size="large"
          type="card"
          items={[
            {
              key: 'pending',
              label: (
                <span>
                  <ClockCircleOutlined />
                  Pending Approvals
                </span>
              ),
              children: (
                <Spin spinning={loading.pendingApprovals && !refreshing}>
                  <PendingApprovals />
                </Spin>
              )
            },
            {
              key: 'history',
              label: (
                <span>
                  <HistoryOutlined />
                  Approval History
                </span>
              ),
              children: (
                <Spin spinning={loading.approvalHistory && !refreshing}>
                  <ApprovalHistory />
                </Spin>
              )
            },
            {
              key: 'stats',
              label: (
                <span>
                  <DashboardOutlined />
                  Statistics
                </span>
              ),
              children: (
                <Spin spinning={loading.approvalStats && !refreshing}>
                  <ApprovalStats />
                </Spin>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default ApprovalDashboard; 
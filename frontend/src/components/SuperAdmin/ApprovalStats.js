import React, { useEffect } from 'react';
import { 
  Card, 
  Statistic, 
  Row, 
  Col, 
  Progress, 
  Table, 
  Empty, 
  Typography,
  Space,
  Tag,
  List
} from 'antd';
import { 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  BarChartOutlined,
  TrophyOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectApprovalStats,
  selectApprovalLoading,
  fetchApprovalStats
} from '../../store/approval/approvalSlice';
import { logger } from '../../utils';
import moment from 'moment';

const { Title, Text } = Typography;

/**
 * Component for displaying approval statistics and dashboard metrics
 */
const ApprovalStats = () => {
  const dispatch = useDispatch();
  
  // Redux state
  const stats = useSelector(selectApprovalStats);
  const loading = useSelector(selectApprovalLoading);

  // Load data on mount
  useEffect(() => {
    logger.debug('ApprovalStats: Component mounted, fetching stats');
    dispatch(fetchApprovalStats());
  }, [dispatch]);

  // Calculate approval rate
  const totalProcessed = stats.approved + stats.rejected;
  const approvalRate = totalProcessed > 0 
    ? Math.round((stats.approved / totalProcessed) * 100) 
    : 0;

  // Get approval rate color
  const getApprovalRateColor = (rate) => {
    if (rate >= 80) return '#52c41a'; // Green
    if (rate >= 60) return '#faad14'; // Yellow
    return '#ff4d4f'; // Red
  };

  // Prepare type breakdown data for table
  const typeColumns = [
    {
      title: 'Request Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={getTypeColor(type)}>
          {type.replace('_', ' ')}
        </Tag>
      ),
    },
    {
      title: 'Total Count',
      dataIndex: 'count',
      key: 'count',
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: 'Percentage',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (percentage) => `${percentage}%`,
    },
  ];

  const typeData = Object.entries(stats.byType).map(([type, count]) => ({
    key: type,
    type,
    count,
    percentage: stats.total > 0 ? Math.round((count / stats.total) * 100) : 0,
  })).sort((a, b) => b.count - a.count);

  // Prepare priority breakdown data
  const priorityData = Object.entries(stats.byPriority).map(([priority, count]) => ({
    key: priority,
    priority,
    count,
    percentage: stats.total > 0 ? Math.round((count / stats.total) * 100) : 0,
  })).sort((a, b) => {
    const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  // Get type color for tags
  const getTypeColor = (type) => {
    const colors = {
      'METER_DATA': 'blue',
      'ORGANIZATION': 'green',
      'USER': 'orange',
      'DEVICE': 'purple',
    };
    return colors[type] || 'default';
  };

  // Get priority color for tags
  const getPriorityColor = (priority) => {
    const colors = {
      'HIGH': 'red',
      'MEDIUM': 'orange',
      'LOW': 'green',
    };
    return colors[priority] || 'default';
  };

  return (
    <div className="approval-stats">
      {/* Main Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading.approvalStats}>
            <Statistic
              title="Pending Approvals"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading.approvalStats}>
            <Statistic
              title="Approved"
              value={stats.approved}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading.approvalStats}>
            <Statistic
              title="Rejected"
              value={stats.rejected}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading.approvalStats}>
            <Statistic
              title="Total Processed"
              value={stats.total}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Detailed Analytics */}
      <Row gutter={[16, 16]}>
        {/* Approval Rate */}
        <Col xs={24} md={12}>
          <Card 
            title={
              <Space>
                <TrophyOutlined />
                Approval Rate
              </Space>
            }
            loading={loading.approvalStats}
          >
            {totalProcessed > 0 ? (
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={approvalRate}
                  format={percent => `${percent}%`}
                  strokeColor={getApprovalRateColor(approvalRate)}
                  size={120}
                />
                <div style={{ marginTop: 16 }}>
                  <Text>
                    {stats.approved} approved out of {totalProcessed} processed
                  </Text>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">
                    ({stats.pending} still pending)
                  </Text>
                </div>
              </div>
            ) : (
              <Empty 
                description="No processed approvals yet"
                style={{ padding: '40px 0' }}
              />
            )}
          </Card>
        </Col>

        {/* Request Types Breakdown */}
        <Col xs={24} md={12}>
          <Card 
            title={
              <Space>
                <BarChartOutlined />
                Requests by Type
              </Space>
            }
            loading={loading.approvalStats}
          >
            {typeData.length > 0 ? (
              <Table
                columns={typeColumns}
                dataSource={typeData}
                pagination={false}
                size="small"
                scroll={{ y: 200 }}
              />
            ) : (
              <Empty 
                description="No data available"
                style={{ padding: '40px 0' }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Priority Distribution & Recent Activity */}
      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        {/* Priority Distribution */}
        <Col xs={24} md={12}>
          <Card 
            title="Priority Distribution"
            loading={loading.approvalStats}
          >
            {priorityData.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {priorityData.map(item => (
                  <div key={item.priority} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0'
                  }}>
                    <Space>
                      <Tag color={getPriorityColor(item.priority)}>
                        {item.priority}
                      </Tag>
                      <Text>{item.count} requests</Text>
                    </Space>
                    <Text strong>{item.percentage}%</Text>
                  </div>
                ))}
              </Space>
            ) : (
              <Empty 
                description="No priority data available"
                style={{ padding: '40px 0' }}
              />
            )}
          </Card>
        </Col>

        {/* Recent Activity */}
        <Col xs={24} md={12}>
          <Card 
            title={
              <Space>
                <CalendarOutlined />
                Recent Activity
              </Space>
            }
            loading={loading.approvalStats}
          >
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              <List
                size="small"
                dataSource={stats.recentActivity}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Tag color={getTypeColor(item.request_type)}>
                            {item.request_type.replace('_', ' ')}
                          </Tag>
                          <Tag color={item.status === 'APPROVED' ? 'green' : 'red'}>
                            {item.status}
                          </Tag>
                        </Space>
                      }
                      description={
                        <div>
                          <Text type="secondary">
                            Request #{item.id} •{' '}
                            {moment(item.reviewed_at || item.submitted_at).fromNow()}
                          </Text>
                          {item.review_comments && (
                            <div style={{ marginTop: 4 }}>
                              <Text ellipsis style={{ maxWidth: '200px' }}>
                                "{item.review_comments}"
                              </Text>
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                description="No recent activity"
                style={{ padding: '40px 0' }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Performance Insights */}
      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card 
            title="Performance Insights"
            loading={loading.approvalStats}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Processing Efficiency"
                  value={totalProcessed}
                  suffix={`/ ${stats.total} total`}
                  valueStyle={{ 
                    color: totalProcessed / stats.total > 0.8 ? '#52c41a' : '#faad14' 
                  }}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Pending Backlog"
                  value={stats.pending}
                  valueStyle={{ 
                    color: stats.pending > 10 ? '#ff4d4f' : '#52c41a' 
                  }}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Approval Success Rate"
                  value={approvalRate}
                  suffix="%"
                  valueStyle={{ color: getApprovalRateColor(approvalRate) }}
                />
              </Col>
            </Row>
            
            <div style={{ marginTop: '16px', padding: '16px', background: '#f8f9fa', borderRadius: '6px' }}>
              <Title level={5} style={{ margin: 0 }}>Quick Insights</Title>
              <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                {stats.pending > 5 && (
                  <li>
                    <Text type="warning">
                      High pending backlog: {stats.pending} requests awaiting review
                    </Text>
                  </li>
                )}
                {approvalRate < 60 && totalProcessed > 5 && (
                  <li>
                    <Text type="danger">
                      Low approval rate: Only {approvalRate}% of requests are being approved
                    </Text>
                  </li>
                )}
                {approvalRate >= 90 && totalProcessed > 10 && (
                  <li>
                    <Text type="success">
                      Excellent approval rate: {approvalRate}% of requests approved
                    </Text>
                  </li>
                )}
                {stats.total === 0 && (
                  <li>
                    <Text type="secondary">
                      No approval requests have been submitted yet
                    </Text>
                  </li>
                )}
              </ul>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ApprovalStats; 
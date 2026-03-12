import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Card, 
  Row, 
  Col, 
  Button, 
  Space, 
  Table, 
  Statistic, 
  Tag, 
  Progress,
  Select,
  DatePicker,
  Divider,
  Spin,
  Alert,
  Empty,
  Badge,
  Tooltip,
  Modal,
  Timeline
} from 'antd';
import * as Icons from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { 
  getInventoryOrganizationalSummaryAPI,
  getInventoryHierarchicalDataAPI,
  getInventoryTransactionsAPI,
  getCacheStatusAPI,
  triggerRefreshAPI,
  getRefreshHistoryAPI
} from '../../api/reportingAPI';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function InventoryReport() {
  const navigate = useNavigate();
  const [selectedTimeRange, setSelectedTimeRange] = useState('month');
  const [selectedLocation, setSelectedLocation] = useState('all');
  
  // State for real data
  const [orgSummary, setOrgSummary] = useState(null);
  const [inventoryData, setInventoryData] = useState([]);
  const [transactionData, setTransactionData] = useState([]);
  const [cacheStatus, setCacheStatus] = useState(null);
  
  // Loading states
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingCacheStatus, setLoadingCacheStatus] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Error states
  const [errorSummary, setErrorSummary] = useState(null);
  const [errorInventory, setErrorInventory] = useState(null);
  const [errorTransactions, setErrorTransactions] = useState(null);
  
  // Modal states
  const [showRefreshHistory, setShowRefreshHistory] = useState(false);
  const [refreshHistory, setRefreshHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch organizational summary
  const fetchOrganizationalSummary = async (useCache = true) => {
    try {
      setLoadingSummary(true);
      setErrorSummary(null);
      const data = await getInventoryOrganizationalSummaryAPI(useCache);
      setOrgSummary(data);
    } catch (error) {
      console.error('Error fetching organizational summary:', error);
      setErrorSummary('Failed to load organizational summary. Please try again.');
    } finally {
      setLoadingSummary(false);
    }
  };

  // Fetch hierarchical inventory data
  const fetchHierarchicalData = async (useCache = true) => {
    try {
      setLoadingInventory(true);
      setErrorInventory(null);
      const data = await getInventoryHierarchicalDataAPI(useCache);
      setInventoryData(data);
    } catch (error) {
      console.error('Error fetching hierarchical data:', error);
      setErrorInventory('Failed to load inventory data. Please try again.');
    } finally {
      setLoadingInventory(false);
    }
  };

  // Fetch transaction data
  const fetchTransactionData = async () => {
    try {
      setLoadingTransactions(true);
      setErrorTransactions(null);
      const data = await getInventoryTransactionsAPI(10, 0);
      setTransactionData(data);
    } catch (error) {
      console.error('Error fetching transaction data:', error);
      setErrorTransactions('Failed to load transaction data. Please try again.');
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Fetch cache status
  const fetchCacheStatus = async () => {
    try {
      setLoadingCacheStatus(true);
      const data = await getCacheStatusAPI();
      setCacheStatus(data);
    } catch (error) {
      console.error('Error fetching cache status:', error);
    } finally {
      setLoadingCacheStatus(false);
    }
  };

  // Trigger refresh
  const handleRefresh = async (forceRealTime = false) => {
    if (forceRealTime) {
      // Force real-time data fetch
      await Promise.all([
        fetchOrganizationalSummary(false),
        fetchHierarchicalData(false),
        fetchTransactionData()
      ]);
    } else if (cacheStatus?.isUpToDate) {
      // Data is up to date, just refresh the display
      await Promise.all([
        fetchOrganizationalSummary(true),
        fetchHierarchicalData(true),
        fetchTransactionData()
      ]);
    } else {
      // Trigger background refresh and use cached data if available
      try {
        setRefreshing(true);
        const refreshResult = await triggerRefreshAPI();
        
        if (refreshResult.success) {
          // Show success message and continue loading current data
          await Promise.all([
            fetchOrganizationalSummary(true),
            fetchHierarchicalData(true),
            fetchTransactionData()
          ]);
          
          // Refresh cache status
          await fetchCacheStatus();
        }
      } catch (error) {
        console.error('Error triggering refresh:', error);
      } finally {
        setRefreshing(false);
      }
    }
  };

  // Fetch refresh history
  const fetchRefreshHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await getRefreshHistoryAPI(20);
      setRefreshHistory(data);
    } catch (error) {
      console.error('Error fetching refresh history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      await fetchCacheStatus();
      await Promise.all([
        fetchOrganizationalSummary(),
        fetchHierarchicalData(),
        fetchTransactionData()
      ]);
    };
    
    loadData();
  }, []);

  // Poll cache status when refreshing
  useEffect(() => {
    if (cacheStatus?.isRefreshing || refreshing) {
      const interval = setInterval(async () => {
        await fetchCacheStatus();
        if (cacheStatus && !cacheStatus.isRefreshing) {
          setRefreshing(false);
          // Reload data after refresh completes
          await Promise.all([
            fetchOrganizationalSummary(),
            fetchHierarchicalData()
          ]);
        }
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [cacheStatus?.isRefreshing, refreshing]);

  const inventoryColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Text strong={record.type === 'organization'}>
            {text}
          </Text>
          {record.type === 'device' && (
            <Tag color="blue" size="small">{record.deviceId}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Total GCs',
      dataIndex: 'totalGCs',
      key: 'totalGCs',
      render: (value) => value?.toLocaleString(),
      sorter: (a, b) => a.totalGCs - b.totalGCs,
    },
    {
      title: 'Active GCs',
      dataIndex: 'activeGCs',
      key: 'activeGCs',
      render: (value) => (
        <Text style={{ color: '#52c41a' }}>
          {value?.toLocaleString()}
        </Text>
      ),
      sorter: (a, b) => a.activeGCs - b.activeGCs,
    },
    {
      title: 'Retired GCs',
      dataIndex: 'retiredGCs',
      key: 'retiredGCs',
      render: (value) => (
        <Text style={{ color: '#1890ff' }}>
          {value?.toLocaleString()}
        </Text>
      ),
      sorter: (a, b) => a.retiredGCs - b.retiredGCs,
    },
    {
      title: 'Avg Carbon Impact',
      dataIndex: 'avgCarbonImpact',
      key: 'avgCarbonImpact',
      render: (value) => `${value} tCO₂e/MWh`,
      sorter: (a, b) => a.avgCarbonImpact - b.avgCarbonImpact,
    },
    {
      title: 'Expiring Soon',
      dataIndex: 'expiringGCs',
      key: 'expiringGCs',
      render: (value, record) => (
        <Space direction="vertical" size="small">
          <Text style={{ color: value > 50000 ? '#ff4d4f' : '#faad14' }}>
            {value?.toLocaleString()}
          </Text>
          <Progress 
            percent={Math.round((value / record.totalGCs) * 100)} 
            size="small" 
            status={value > 50000 ? 'exception' : 'normal'}
            showInfo={false}
          />
        </Space>
      ),
      sorter: (a, b) => a.expiringGCs - b.expiringGCs,
    }
  ];

  const transactionColumns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (value) => new Date(value).toLocaleString(),
      sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const color = type === 'Transfer' ? 'blue' : type === 'Retirement' ? 'green' : 'orange';
        return <Tag color={color}>{type}</Tag>;
      },
    },
    {
      title: 'GC IDs',
      dataIndex: 'gcIds',
      key: 'gcIds',
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: 'Volume',
      dataIndex: 'volume',
      key: 'volume',
      render: (value) => `${value.toLocaleString()} MWh`,
      sorter: (a, b) => a.volume - b.volume,
    },
    {
      title: 'Counterparty',
      dataIndex: 'counterparty',
      key: 'counterparty',
    },
    {
      title: 'Carbon Impact',
      dataIndex: 'carbonImpact',
      key: 'carbonImpact',
      render: (value) => `${value} tCO₂e/MWh`,
      sorter: (a, b) => a.carbonImpact - b.carbonImpact,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'Completed' ? 'success' : 'processing'}>
          {status}
        </Tag>
      ),
    }
  ];

  const handleExport = (format) => {
    // Export functionality
    console.log(`Exporting data as ${format}`);
  };

  const getCacheStatusIcon = () => {
    if (loadingCacheStatus) return <Spin size="small" />;
    if (!cacheStatus) return null;
    
    if (cacheStatus.isRefreshing || refreshing) {
      return <Icons.ClockCircleOutlined style={{ color: '#1890ff' }} />;
    } else if (cacheStatus.isUpToDate) {
      return <Icons.CheckCircleOutlined style={{ color: '#52c41a' }} />;
    } else {
      return <Icons.ExclamationCircleOutlined style={{ color: '#faad14' }} />;
    }
  };

  const getCacheStatusText = () => {
    if (loadingCacheStatus) return 'Checking cache status...';
    if (!cacheStatus) return 'Cache status unknown';
    
    if (cacheStatus.isRefreshing || refreshing) {
      return 'Data is being refreshed...';
    } else if (cacheStatus.isUpToDate) {
      return `Up to date (${new Date(cacheStatus.lastRefresh).toLocaleString()})`;
    } else if (cacheStatus.hasCachedData) {
      return `Cached data from ${new Date(cacheStatus.lastRefresh).toLocaleString()}`;
    } else {
      return 'No cached data available';
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Button 
            icon={<Icons.ArrowLeftOutlined />} 
            onClick={() => navigate('/reporting')}
            style={{ marginBottom: '16px' }}
          >
            Back to Reports
          </Button>
          <Title level={2}>
            <Icons.FileTextOutlined style={{ marginRight: '8px' }} />
            GC Inventory Report
          </Title>
          <Text type="secondary">
            Summary of GC inventory, trades, transfers, and retirements for trading insights
          </Text>
        </div>

        {/* Cache Status & Controls */}
        <Card size="small">
          <Row gutter={16} align="middle">
            <Col span={12}>
              <Space>
                {getCacheStatusIcon()}
                <Text>{getCacheStatusText()}</Text>
                {orgSummary?.dataSource && (
                  <Tag color={orgSummary.dataSource === 'cached' ? 'green' : 'blue'}>
                    {orgSummary.dataSource === 'cached' ? 'Cached Data' : 
                     orgSummary.dataSource === 'refreshing' ? 'Refreshing' : 'Real-time Data'}
                  </Tag>
                )}
              </Space>
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              <Space>
                <Button 
                  icon={<Icons.HistoryOutlined />}
                  onClick={() => {
                    setShowRefreshHistory(true);
                    fetchRefreshHistory();
                  }}
                >
                  History
                </Button>
                <Button 
                  icon={<Icons.ReloadOutlined />} 
                  onClick={() => handleRefresh()}
                  loading={refreshing || cacheStatus?.isRefreshing}
                  disabled={refreshing || cacheStatus?.isRefreshing}
                >
                  {refreshing || cacheStatus?.isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                </Button>
                {!cacheStatus?.isUpToDate && (
                  <Tooltip title="Use real-time data (slower)">
                    <Button 
                      type="dashed"
                      icon={<Icons.ReloadOutlined />} 
                      onClick={() => handleRefresh(true)}
                      loading={loadingSummary || loadingInventory}
                    >
                      Real-time
                    </Button>
                  </Tooltip>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Filters */}
        <Card size="small" title="Filters">
          <Row gutter={16}>
            <Col span={6}>
              <Text strong>Time Range:</Text>
              <Select 
                value={selectedTimeRange} 
                onChange={setSelectedTimeRange}
                style={{ width: '100%', marginTop: 4 }}
              >
                <Select.Option value="week">Last Week</Select.Option>
                <Select.Option value="month">Last Month</Select.Option>
                <Select.Option value="quarter">Last Quarter</Select.Option>
                <Select.Option value="year">Last Year</Select.Option>
              </Select>
            </Col>
            <Col span={6}>
              <Text strong>Location:</Text>
              <Select 
                value={selectedLocation} 
                onChange={setSelectedLocation}
                style={{ width: '100%', marginTop: 4 }}
              >
                <Select.Option value="all">All Locations</Select.Option>
                <Select.Option value="us">United States</Select.Option>
                <Select.Option value="eu">European Union</Select.Option>
              </Select>
            </Col>
            <Col span={6}>
              <Text strong>Custom Date Range:</Text>
              <RangePicker style={{ width: '100%', marginTop: 4 }} />
            </Col>
            <Col span={6} style={{ display: 'flex', alignItems: 'end' }}>
              <Space>
                <Button type="primary" onClick={() => handleExport('csv')}>
                  <Icons.ExportOutlined /> Export CSV
                </Button>
                <Button onClick={() => handleExport('pdf')}>
                  <Icons.DownloadOutlined /> Export PDF
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Organizational Summary */}
        <Card title="Organizational Summary" size="small">
          {loadingSummary ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px' }}>Loading summary data...</div>
            </div>
          ) : errorSummary ? (
            <Alert
              message="Error Loading Summary"
              description={errorSummary}
              type="error"
              showIcon
              action={
                <Button size="small" onClick={() => fetchOrganizationalSummary()}>
                  Retry
                </Button>
              }
            />
          ) : orgSummary ? (
            <>
              {orgSummary.message && (
                <Alert
                  message="Data Refreshing"
                  description={orgSummary.message}
                  type="info"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
              )}
              <Row gutter={16}>
                <Col span={4}>
                  <Statistic
                    title="Total GCs"
                    value={orgSummary.totalGCs}
                    formatter={(value) => value.toLocaleString()}
                    suffix="MWh"
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="Active GCs"
                    value={orgSummary.activeGCs}
                    formatter={(value) => value.toLocaleString()}
                    suffix="MWh"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="Retired GCs"
                    value={orgSummary.retiredGCs}
                    formatter={(value) => value.toLocaleString()}
                    suffix="MWh"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="Avg Carbon Impact"
                    value={orgSummary.avgCarbonImpact}
                    precision={2}
                    suffix="tCO₂e/MWh"
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="Expiring Soon"
                    value={orgSummary.expiringGCs}
                    formatter={(value) => value.toLocaleString()}
                    suffix="MWh"
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="Portfolio Value"
                    value={orgSummary.totalValue}
                    formatter={(value) => `$${value.toLocaleString()}`}
                    precision={0}
                  />
                </Col>
              </Row>
            </>
          ) : (
            <Empty description="No summary data available" />
          )}
        </Card>

        {/* Hierarchical Inventory Table */}
        <Card title="Inventory Breakdown (Organization → Accounts → Devices)" size="small">
          {loadingInventory ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px' }}>Loading inventory data...</div>
            </div>
          ) : errorInventory ? (
            <Alert
              message="Error Loading Inventory"
              description={errorInventory}
              type="error"
              showIcon
              action={
                <Button size="small" onClick={() => fetchHierarchicalData()}>
                  Retry
                </Button>
              }
            />
          ) : inventoryData.length > 0 ? (
            <Table
              columns={inventoryColumns}
              dataSource={inventoryData}
              pagination={false}
              expandable={{
                childrenColumnName: 'children',
                defaultExpandAllRows: false,
              }}
              size="small"
            />
          ) : (
            <Empty description="No inventory data available" />
          )}
        </Card>

        {/* Transaction Log */}
        <Card title="Recent Transaction Log" size="small">
          {loadingTransactions ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px' }}>Loading transaction data...</div>
            </div>
          ) : errorTransactions ? (
            <Alert
              message="Error Loading Transactions"
              description={errorTransactions}
              type="error"
              showIcon
              action={
                <Button size="small" onClick={fetchTransactionData}>
                  Retry
                </Button>
              }
            />
          ) : transactionData.length > 0 ? (
            <Table
              columns={transactionColumns}
              dataSource={transactionData}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          ) : (
            <Empty description="No transaction data available" />
          )}
        </Card>

        {/* Additional Analytics */}
        <Row gutter={16}>
          <Col span={12}>
            <Card title="GC Sources Breakdown" size="small">
              <Text>Pie chart showing direct issuance vs market purchase will be displayed here</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Peak/Off-Peak Distribution" size="small">
              <Text>Hourly distribution analysis will be shown here</Text>
            </Card>
          </Col>
        </Row>
      </Space>

      {/* Refresh History Modal */}
      <Modal
        title="Refresh History"
        open={showRefreshHistory}
        onCancel={() => setShowRefreshHistory(false)}
        footer={null}
        width={800}
      >
        {loadingHistory ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <Timeline
            items={refreshHistory.map((job, index) => ({
              color: job.status === 'completed' ? 'green' : 
                     job.status === 'failed' ? 'red' : 'blue',
              children: (
                <div key={job.id}>
                  <div style={{ fontWeight: 'bold' }}>
                    {job.jobType === 'daily' ? 'Scheduled Refresh' : 'On-Demand Refresh'}
                    <Tag color={job.status === 'completed' ? 'success' : 
                               job.status === 'failed' ? 'error' : 'processing'} 
                         style={{ marginLeft: 8 }}>
                      {job.status}
                    </Tag>
                  </div>
                  <div style={{ color: '#666', fontSize: '0.9em' }}>
                    Started: {new Date(job.startedAt).toLocaleString()}
                    {job.completedAt && (
                      <span> • Completed: {new Date(job.completedAt).toLocaleString()}</span>
                    )}
                    {job.durationMs && (
                      <span> • Duration: {(job.durationMs / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                  {job.organizationsProcessed > 0 && (
                    <div style={{ color: '#666', fontSize: '0.9em' }}>
                      Processed: {job.organizationsProcessed} orgs, {job.accountsProcessed} accounts, {job.devicesProcessed} devices
                    </div>
                  )}
                  {job.errorMessage && (
                    <div style={{ color: '#ff4d4f', fontSize: '0.9em' }}>
                      Error: {job.errorMessage}
                    </div>
                  )}
                </div>
              )
            }))}
          />
        )}
      </Modal>
    </div>
  );
} 
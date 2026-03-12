import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Select, 
  InputNumber, 
  Button, 
  Table, 
  Tag, 
  Tooltip, 
  message,
  Row,
  Col,
  Statistic,
  Progress,
  Space,
  Modal,
  Alert,
  Descriptions,
  Divider,
  Empty
} from 'antd';
import { 
  SearchOutlined, 
  DownloadOutlined, 
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FilterOutlined,
  ReloadOutlined,
  PieChartOutlined,
  BarChartOutlined,
  FileExcelOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { mockSSSFactors, mockSSSProviders, usStates } from '../mockData';

const { Option } = Select;

const SSSBaselineMix = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [factors, setFactors] = useState([]);
  const [providers, setProviders] = useState([]);
  const [selectedFactors, setSelectedFactors] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFactor, setSelectedFactor] = useState(null);
  const [searchFilters, setSearchFilters] = useState({});
  
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);

  // Initialize data
  useEffect(() => {
    loadFactors();
    loadProviders();
  }, []);

  const loadFactors = async () => {
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setFactors(mockSSSFactors);
    } catch (error) {
      message.error('Failed to load baseline mix factors');
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      // Filter only active providers
      const activeProviders = mockSSSProviders.filter(p => p.status === 'ACTIVE');
      setProviders(activeProviders);
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const handleSearch = async (values) => {
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let filteredFactors = [...mockSSSFactors];
      
      // Apply filters
      if (values.state) {
        filteredFactors = filteredFactors.filter(f => f.state === values.state);
      }
      if (values.provider_id) {
        filteredFactors = filteredFactors.filter(f => f.provider_id === values.provider_id);
      }
      if (values.year) {
        filteredFactors = filteredFactors.filter(f => f.year === values.year);
      }
      if (values.month !== undefined) {
        filteredFactors = filteredFactors.filter(f => f.month === values.month);
      }
      if (values.data_source && values.data_source !== 'all') {
        filteredFactors = filteredFactors.filter(f => f.data_source === values.data_source);
      }
      
      setFactors(filteredFactors);
      setSearchFilters(values);
      
      if (filteredFactors.length === 0) {
        message.info('No factors found matching your criteria');
      } else {
        message.success(`Found ${filteredFactors.length} baseline mix factors`);
      }
    } catch (error) {
      message.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    form.resetFields();
    setFactors(mockSSSFactors);
    setSearchFilters({});
    setSelectedFactors([]);
    message.info('Filters cleared');
  };

  const handleExportSelected = () => {
    if (selectedFactors.length === 0) {
      message.warning('Please select factors to export');
      return;
    }
    
    const selectedData = factors.filter(f => selectedFactors.includes(f.id));
    
    // Simulate export functionality
    const dataStr = JSON.stringify(selectedData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `sss_baseline_mix_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    message.success(`Exported ${selectedFactors.length} factors`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'green';
      case 'PENDING_APPROVAL':
        return 'orange';
      case 'REJECTED':
        return 'red';
      case 'EXPIRED':
        return 'red';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircleOutlined />;
      case 'PENDING_APPROVAL':
        return <InfoCircleOutlined />;
      case 'REJECTED':
      case 'EXPIRED':
        return <ExclamationCircleOutlined />;
      default:
        return null;
    }
  };

  const getDataSourceTag = (dataSource) => {
    if (dataSource === 'supplier-verified') {
      return (
        <Tag color="green" icon={<CheckCircleOutlined />}>
          Supplier Verified
        </Tag>
      );
    }
    return (
      <Tag color="orange" icon={<ExclamationCircleOutlined />}>
        Third-party Estimate
      </Tag>
    );
  };

  const calculateRenewableStats = () => {
    if (factors.length === 0) return { avg: 0, max: 0, min: 0 };
    
    const renewablePercentages = factors.map(f => f.renewable_percentage);
    const avg = renewablePercentages.reduce((a, b) => a + b, 0) / renewablePercentages.length;
    const max = Math.max(...renewablePercentages);
    const min = Math.min(...renewablePercentages);
    
    return { avg: avg.toFixed(1), max: max.toFixed(1), min: min.toFixed(1) };
  };

  const calculateEmissionsStats = () => {
    if (factors.length === 0) return { avg: 0, max: 0, min: 0 };
    
    const emissionsFactors = factors.map(f => f.emissions_factor);
    const avg = emissionsFactors.reduce((a, b) => a + b, 0) / emissionsFactors.length;
    const max = Math.max(...emissionsFactors);
    const min = Math.min(...emissionsFactors);
    
    return { avg: avg.toFixed(3), max: max.toFixed(3), min: min.toFixed(3) };
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const renewableStats = calculateRenewableStats();
  const emissionsStats = calculateEmissionsStats();

  const columns = [
    {
      title: 'Provider',
      dataIndex: 'provider_name',
      key: 'provider_name',
      width: 200,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.state}</div>
        </div>
      )
    },
    {
      title: 'Period',
      key: 'period',
      width: 120,
      render: (_, record) => (
        <div>
          <div>{record.year}</div>
          {record.month && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {months.find(m => m.value === record.month)?.label}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Renewable %',
      dataIndex: 'renewable_percentage',
      key: 'renewable_percentage',
      width: 150,
      render: (percentage) => (
        <div>
          <Progress
            percent={percentage}
            size="small"
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
          <div style={{ fontSize: '12px', textAlign: 'center', marginTop: '4px' }}>
            {percentage.toFixed(1)}%
          </div>
        </div>
      ),
      sorter: (a, b) => a.renewable_percentage - b.renewable_percentage
    },
    {
      title: 'Emissions Factor',
      dataIndex: 'emissions_factor',
      key: 'emissions_factor',
      width: 130,
      render: (factor) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold' }}>{factor.toFixed(3)}</div>
          <div style={{ fontSize: '11px', color: '#666' }}>kg CO₂e/kWh</div>
        </div>
      ),
      sorter: (a, b) => a.emissions_factor - b.emissions_factor
    },
    {
      title: 'Technology Mix',
      dataIndex: 'technology_breakdown',
      key: 'technology_breakdown',
      width: 180,
      render: (breakdown) => (
        <div style={{ fontSize: '11px' }}>
          {Object.entries(breakdown).slice(0, 3).map(([tech, percentage]) => (
            <div key={tech} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{tech.charAt(0).toUpperCase() + tech.slice(1)}</span>
              <span>{percentage}%</span>
            </div>
          ))}
          {Object.keys(breakdown).length > 3 && (
            <div style={{ color: '#666', fontStyle: 'italic' }}>
              +{Object.keys(breakdown).length - 3} more
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Data Source',
      dataIndex: 'data_source',
      key: 'data_source',
      width: 150,
      render: (source, record) => (
        <div>
          {getDataSourceTag(source)}
          {record.source_url && (
            <div style={{ marginTop: '4px' }}>
              <Tooltip title="View source data">
                <a href={record.source_url} target="_blank" rel="noopener noreferrer">
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                </a>
              </Tooltip>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Tooltip title="View details">
            <Button 
              type="text" 
              icon={<InfoCircleOutlined />}
              size="small"
              onClick={() => {
                setSelectedFactor(record);
                setShowDetailModal(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Add to comparison">
            <Button 
              type="text" 
              icon={<PieChartOutlined />}
              size="small"
              onClick={() => {
                const newSelected = selectedFactors.includes(record.id) 
                  ? selectedFactors.filter(id => id !== record.id)
                  : [...selectedFactors, record.id];
                setSelectedFactors(newSelected);
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const rowSelection = {
    selectedRowKeys: selectedFactors,
    onChange: (selectedRowKeys) => {
      setSelectedFactors(selectedRowKeys);
    }
  };

  return (
    <div className="sss-baseline-mix">
      <Card title="SSS Baseline Mix Lookup" className="baseline-mix-card">
        <Alert
          message="Baseline Mix Lookup"
          description="Search and compare baseline energy mix data from verified SSS providers. This data shows the renewable percentage and emissions factors for different utilities and time periods."
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        {/* Summary Statistics */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Statistic 
              title="Total Factors" 
              value={factors.length}
              prefix={<BarChartOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Avg Renewable %" 
              value={renewableStats.avg}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Avg Emissions Factor" 
              value={emissionsStats.avg}
              suffix="kg CO₂e/kWh"
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Selected for Export" 
              value={selectedFactors.length}
              prefix={<FileExcelOutlined />}
            />
          </Col>
        </Row>

        <Divider />

        {/* Search Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSearch}
          initialValues={{
            year: currentYear,
            data_source: 'all'
          }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="state" label="State">
                <Select placeholder="Select state" allowClear>
                  {usStates.map(state => (
                    <Option key={state.code} value={state.code}>
                      {state.name} ({state.code})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="provider_id" label="Provider">
                <Select placeholder="Select provider" allowClear>
                  {providers.map(provider => (
                    <Option key={provider.id} value={provider.id}>
                      {provider.provider_name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="year" label="Year">
                <Select placeholder="Select year">
                  {years.map(year => (
                    <Option key={year} value={year}>{year}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="month" label="Month">
                <Select placeholder="All months" allowClear>
                  {months.map(month => (
                    <Option key={month.value} value={month.value}>
                      {month.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="data_source" label="Data Source">
                <Select defaultValue="all">
                  <Option value="all">All Sources</Option>
                  <Option value="supplier-verified">Supplier Verified</Option>
                  <Option value="third-party-estimate">Third-party Estimate</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  icon={<SearchOutlined />}
                  loading={loading}
                >
                  Search
                </Button>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </Button>
                <Button 
                  icon={<FileExcelOutlined />}
                  onClick={handleExportSelected}
                  disabled={selectedFactors.length === 0}
                >
                  Export Selected ({selectedFactors.length})
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>

        <Divider />

        {/* Results Table */}
        <Table
          columns={columns}
          dataSource={factors}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} factors`
          }}
          scroll={{ x: 1000 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <p>No baseline mix factors found</p>
                    <p style={{ color: '#666' }}>
                      Try adjusting your search criteria or contact your utility for more information.
                    </p>
                  </div>
                }
              />
            )
          }}
        />

        {/* Detail Modal */}
        <Modal
          title="Baseline Mix Factor Details"
          open={showDetailModal}
          onCancel={() => {
            setShowDetailModal(false);
            setSelectedFactor(null);
          }}
          footer={[
            <Button key="close" onClick={() => {
              setShowDetailModal(false);
              setSelectedFactor(null);
            }}>
              Close
            </Button>
          ]}
          width={700}
        >
          {selectedFactor && (
            <div>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Provider">
                  {selectedFactor.provider_name}
                </Descriptions.Item>
                <Descriptions.Item label="State">
                  {selectedFactor.state}
                </Descriptions.Item>
                <Descriptions.Item label="Year">
                  {selectedFactor.year}
                </Descriptions.Item>
                <Descriptions.Item label="Month">
                  {selectedFactor.month ? months.find(m => m.value === selectedFactor.month)?.label : 'Annual'}
                </Descriptions.Item>
                <Descriptions.Item label="Renewable Percentage">
                  <Progress
                    percent={selectedFactor.renewable_percentage}
                    size="small"
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                  />
                  <span style={{ marginLeft: '8px' }}>{selectedFactor.renewable_percentage.toFixed(1)}%</span>
                </Descriptions.Item>
                <Descriptions.Item label="Emissions Factor">
                  <span style={{ fontWeight: 'bold' }}>{selectedFactor.emissions_factor.toFixed(3)}</span>
                  <span style={{ marginLeft: '4px', color: '#666' }}>kg CO₂e/kWh</span>
                </Descriptions.Item>
                <Descriptions.Item label="Data Source" span={2}>
                  {getDataSourceTag(selectedFactor.data_source)}
                  {selectedFactor.source_url && (
                    <a href={selectedFactor.source_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px' }}>
                      View Source <InfoCircleOutlined />
                    </a>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Status" span={2}>
                  <Tag color={getStatusColor(selectedFactor.status)} icon={getStatusIcon(selectedFactor.status)}>
                    {selectedFactor.status}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>

              <Divider>Technology Breakdown</Divider>
              <Row gutter={16}>
                {Object.entries(selectedFactor.technology_breakdown).map(([tech, percentage]) => (
                  <Col span={8} key={tech}>
                    <Card size="small" style={{ marginBottom: '8px' }}>
                      <Statistic
                        title={tech.charAt(0).toUpperCase() + tech.slice(1)}
                        value={percentage}
                        suffix="%"
                        valueStyle={{ fontSize: '16px' }}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>

              <Divider>Metadata</Divider>
              <Descriptions bordered size="small">
                <Descriptions.Item label="Created">
                  {new Date(selectedFactor.created_at).toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="Approved">
                  {selectedFactor.approved_at ? new Date(selectedFactor.approved_at).toLocaleString() : 'Not approved'}
                </Descriptions.Item>
                <Descriptions.Item label="Version">
                  {selectedFactor.version}
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}
        </Modal>
      </Card>
    </div>
  );
};

export default SSSBaselineMix;
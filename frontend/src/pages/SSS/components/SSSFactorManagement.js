import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Table, 
  Tag, 
  message,
  Modal,
  Space,
  Row,
  Col,
  Statistic,
  Tooltip,
  Alert,
  Select,
  InputNumber,
  Progress,
  Descriptions,
  Divider,
  Empty,
  Typography,
  Badge,
  Upload,
  Checkbox,
  Result
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  UploadOutlined,
  ReloadOutlined,
  FilterOutlined,
  SafetyOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { mockSSSFactors, mockSSSProviders, usStates } from '../mockData';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

const SSSFactorManagement = ({ isAdmin = false }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [factors, setFactors] = useState([]);
  const [providers, setProviders] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedFactor, setSelectedFactor] = useState(null);
  const [editingFactor, setEditingFactor] = useState(null);
  const [technologyBreakdown, setTechnologyBreakdown] = useState({});
  const [filteredFactors, setFilteredFactors] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [qcReport, setQcReport] = useState(null);
  const [attestationAgreed, setAttestationAgreed] = useState(false);
  
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);

  const technologyTypes = [
    { value: 'solar', label: 'Solar' },
    { value: 'wind', label: 'Wind' },
    { value: 'hydro', label: 'Hydroelectric' },
    { value: 'biomass', label: 'Biomass' },
    { value: 'nuclear', label: 'Nuclear' },
    { value: 'geothermal', label: 'Geothermal' },
    { value: 'battery_storage', label: 'Battery Storage' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    loadFactors();
    loadProviders();
  }, []);

  useEffect(() => {
    filterFactors();
  }, [factors, statusFilter, stateFilter]);

  const loadFactors = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (isAdmin) {
        setFactors(mockSSSFactors);
      } else {
        const userFactors = mockSSSFactors.filter(f => f.provider_id === 1);
        setFactors(userFactors);
      }
    } catch (error) {
      message.error('Failed to load SSS factors');
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const activeProviders = mockSSSProviders.filter(p => p.status === 'ACTIVE');
      setProviders(activeProviders);
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const filterFactors = () => {
    let filtered = [...factors];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(factor => factor.status === statusFilter);
    }
    
    if (stateFilter !== 'all') {
      filtered = filtered.filter(factor => factor.state === stateFilter);
    }
    
    setFilteredFactors(filtered);
  };

  const handleCreateFactor = async (values) => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newFactor = {
        id: Date.now(),
        provider_id: isAdmin ? values.provider_id : 1,
        provider_name: isAdmin ? providers.find(p => p.id === values.provider_id)?.provider_name : 'Pacific Gas & Electric',
        state: values.state,
        year: values.year,
        month: values.month || null,
        renewable_percentage: values.renewable_percentage,
        emissions_factor: values.emissions_factor,
        technology_breakdown: technologyBreakdown,
        data_source: values.data_source,
        source_url: values.source_url || null,
        status: 'DRAFT',
        version: 1,
        created_at: new Date().toISOString(),
        approved_at: null,
        approved_by: null
      };
      
      setFactors([...factors, newFactor]);
      message.success('SSS factor created successfully');
      setShowCreateModal(false);
      form.resetFields();
      setTechnologyBreakdown({});
    } catch (error) {
      message.error('Failed to create SSS factor');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveFactor = async (factor, approved) => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedFactors = factors.map(f => 
        f.id === factor.id 
          ? { 
              ...f, 
              status: approved ? 'APPROVED' : 'REJECTED',
              approved_at: approved ? new Date().toISOString() : null,
              approved_by: approved ? user.id : null
            }
          : f
      );
      
      setFactors(updatedFactors);
      message.success(`SSS factor ${approved ? 'approved' : 'rejected'} successfully`);
      setShowApprovalModal(false);
      setSelectedFactor(null);
    } catch (error) {
      message.error(`Failed to ${approved ? 'approve' : 'reject'} SSS factor`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async (factor) => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedFactors = factors.map(f => 
        f.id === factor.id 
          ? { ...f, status: 'PENDING_APPROVAL' }
          : f
      );
      
      setFactors(updatedFactors);
      message.success('SSS factor submitted for approval');
    } catch (error) {
      message.error('Failed to submit factor for approval');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'green';
      case 'PENDING_APPROVAL': return 'orange';
      case 'REJECTED': return 'red';
      case 'DRAFT': return 'blue';
      case 'EXPIRED': return 'red';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED': return <CheckCircleOutlined />;
      case 'PENDING_APPROVAL': return <ClockCircleOutlined />;
      case 'REJECTED': 
      case 'EXPIRED': return <ExclamationCircleOutlined />;
      case 'DRAFT': return <FileTextOutlined />;
      default: return null;
    }
  };

  const approvedFactors = factors.filter(f => f.status === 'APPROVED');
  const pendingFactors = factors.filter(f => f.status === 'PENDING_APPROVAL');
  const draftFactors = factors.filter(f => f.status === 'DRAFT');
  const avgRenewablePercentage = factors.length > 0 ? (factors.reduce((sum, f) => sum + f.renewable_percentage, 0) / factors.length).toFixed(1) : 0;

  const columns = [
    {
      title: 'Provider',
      dataIndex: 'provider_name',
      key: 'provider_name',
      width: 150,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.state} • {record.year}</div>
        </div>
      )
    },
    {
      title: 'Period',
      key: 'period',
      width: 100,
      render: (_, record) => (
        <div>
          <div>{record.year}</div>
          {record.month && <div style={{ fontSize: '12px', color: '#666' }}>Month {record.month}</div>}
        </div>
      )
    },
    {
      title: 'Renewable %',
      dataIndex: 'renewable_percentage',
      key: 'renewable_percentage',
      width: 120,
      render: (percentage) => (
        <div style={{ textAlign: 'center' }}>
          <Progress
            type="circle"
            percent={percentage}
            size={50}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
            format={() => `${percentage.toFixed(1)}%`}
          />
        </div>
      ),
      sorter: (a, b) => a.renewable_percentage - b.renewable_percentage
    },
    {
      title: 'Emissions Factor',
      dataIndex: 'emissions_factor',
      key: 'emissions_factor',
      width: 120,
      render: (factor) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold' }}>{factor.toFixed(3)}</div>
          <div style={{ fontSize: '11px', color: '#666' }}>kg CO₂e/kWh</div>
        </div>
      ),
      sorter: (a, b) => a.emissions_factor - b.emissions_factor
    },
    {
      title: 'Data Source',
      dataIndex: 'data_source',
      key: 'data_source',
      width: 130,
      render: (source) => (
        <Tag color={source === 'supplier-verified' ? 'green' : 'orange'}>
          {source === 'supplier-verified' ? 'Verified' : 'Estimate'}
        </Tag>
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
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="View details">
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              size="small"
              onClick={() => {
                setSelectedFactor(record);
                setShowViewModal(true);
              }}
            />
          </Tooltip>
          
          {!isAdmin && record.status === 'DRAFT' && (
            <Tooltip title="Submit for approval">
              <Button 
                type="text" 
                icon={<UploadOutlined />}
                size="small"
                onClick={() => handleSubmitForApproval(record)}
              />
            </Tooltip>
          )}
          
          {isAdmin && record.status === 'PENDING_APPROVAL' && (
            <Tooltip title="Review factor">
              <Button 
                type="text" 
                icon={<CheckOutlined />}
                size="small"
                onClick={() => {
                  setSelectedFactor(record);
                  setShowApprovalModal(true);
                }}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.csv,.json',
    onChange(info) {
      if (info.file.status === 'done') {
        setUploadedFile(info.file);
        // Simulate QC
        setQcReport({ valid: true, message: 'All checks passed' });
        message.success(`${info.file.name} file uploaded successfully.`);
      }
    },
  };

  return (
    <div className="sss-factor-management">
      <Card title={isAdmin ? "SSS Factor Approval" : "SSS Factor Management"} className="sss-card">
        <Alert
          message={isAdmin ? "Factor Approval" : "Factor Management"}
          description={isAdmin ? "Review and approve emissions factors from SSS providers." : "Create and manage your emissions factors and renewable percentages."}
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Statistic 
              title="Total Factors" 
              value={factors.length}
              prefix={<SafetyOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Approved" 
              value={approvedFactors.length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Pending" 
              value={pendingFactors.length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Avg Renewable %" 
              value={avgRenewablePercentage}
              suffix="%"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
        </Row>

        <Divider />

        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            {!isAdmin && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setShowCreateModal(true)}
              >
                Create Factor
              </Button>
            )}
            <Button 
              icon={<ReloadOutlined />}
              onClick={loadFactors}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
          
          <Space>
            <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 150 }}>
              <Option value="all">All Status</Option>
              <Option value="APPROVED">Approved</Option>
              <Option value="PENDING_APPROVAL">Pending</Option>
              <Option value="DRAFT">Draft</Option>
              <Option value="REJECTED">Rejected</Option>
            </Select>
            <Select value={stateFilter} onChange={setStateFilter} style={{ width: 120 }}>
              <Option value="all">All States</Option>
              {usStates.map(state => (
                <Option key={state.code} value={state.code}>{state.code}</Option>
              ))}
            </Select>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filteredFactors}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 1000 }}
          locale={{
            emptyText: <Empty description="No factors found" />
          }}
        />
      </Card>

      {/* Create Factor Modal */}
      <Modal
        title="Create SSS Factor"
        open={showCreateModal}
        onOk={() => form.submit()}
        onCancel={() => {
          setShowCreateModal(false);
          form.resetFields();
          setTechnologyBreakdown({});
        }}
        width={800}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateFactor}>
          <Row gutter={16}>
            {isAdmin && (
              <Col span={12}>
                <Form.Item name="provider_id" label="Provider" rules={[{ required: true }]}>
                  <Select placeholder="Select provider">
                    {providers.map(provider => (
                      <Option key={provider.id} value={provider.id}>{provider.provider_name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            )}
            <Col span={12}>
              <Form.Item name="state" label="State" rules={[{ required: true }]}>
                <Select placeholder="Select state">
                  {usStates.map(state => (
                    <Option key={state.code} value={state.code}>{state.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="year" label="Year" rules={[{ required: true }]}>
                <InputNumber min={2020} max={2030} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="month" label="Month (Optional)">
                <Select placeholder="Annual" allowClear>
                  {Array.from({ length: 12 }, (_, i) => (
                    <Option key={i + 1} value={i + 1}>{new Date(2024, i).toLocaleString('default', { month: 'long' })}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="data_source" label="Data Source" rules={[{ required: true }]}>
                <Select>
                  <Option value="supplier-verified">Supplier Verified</Option>
                  <Option value="third-party-estimate">Third-party Estimate</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="renewable_percentage" label="Renewable %" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="emissions_factor" label="Emissions Factor" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.001} addonAfter="kg CO₂e/kWh" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="source_url" label="Source URL">
            <Input placeholder="https://example.com/data" />
          </Form.Item>
          
          <Divider>Technology Breakdown</Divider>
          <Row gutter={16}>
            {technologyTypes.map(tech => (
              <Col span={8} key={tech.value}>
                <Form.Item label={tech.label}>
                  <InputNumber
                    min={0}
                    max={100}
                    addonAfter="%"
                    style={{ width: '100%' }}
                    value={technologyBreakdown[tech.value] || 0}
                    onChange={(value) => setTechnologyBreakdown({
                      ...technologyBreakdown,
                      [tech.value]: value || 0
                    })}
                  />
                </Form.Item>
              </Col>
            ))}
          </Row>
        </Form>
      </Modal>

      {/* Approval Modal */}
      <Modal
        title="Review SSS Factor"
        open={showApprovalModal}
        footer={[
          <Button key="cancel" onClick={() => setShowApprovalModal(false)}>Cancel</Button>,
          <Button key="reject" danger onClick={() => handleApproveFactor(selectedFactor, false)}>Reject</Button>,
          <Button key="approve" type="primary" onClick={() => handleApproveFactor(selectedFactor, true)}>Approve</Button>
        ]}
        width={600}
      >
        {selectedFactor && (
          <Descriptions bordered>
            <Descriptions.Item label="Provider">{selectedFactor.provider_name}</Descriptions.Item>
            <Descriptions.Item label="State">{selectedFactor.state}</Descriptions.Item>
            <Descriptions.Item label="Year">{selectedFactor.year}</Descriptions.Item>
            <Descriptions.Item label="Renewable %">{selectedFactor.renewable_percentage}%</Descriptions.Item>
            <Descriptions.Item label="Emissions Factor">{selectedFactor.emissions_factor} kg CO₂e/kWh</Descriptions.Item>
            <Descriptions.Item label="Data Source">{selectedFactor.data_source}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* View Factor Modal */}
      <Modal
        title="SSS Factor Details"
        open={showViewModal}
        onCancel={() => setShowViewModal(false)}
        footer={[<Button key="close" onClick={() => setShowViewModal(false)}>Close</Button>]}
        width={700}
      >
        {selectedFactor && (
          <div>
            <Descriptions bordered>
              <Descriptions.Item label="Provider">{selectedFactor.provider_name}</Descriptions.Item>
              <Descriptions.Item label="State">{selectedFactor.state}</Descriptions.Item>
              <Descriptions.Item label="Year">{selectedFactor.year}</Descriptions.Item>
              <Descriptions.Item label="Month">{selectedFactor.month || 'Annual'}</Descriptions.Item>
              <Descriptions.Item label="Renewable %">{selectedFactor.renewable_percentage}%</Descriptions.Item>
              <Descriptions.Item label="Emissions Factor">{selectedFactor.emissions_factor} kg CO₂e/kWh</Descriptions.Item>
              <Descriptions.Item label="Data Source">{selectedFactor.data_source}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedFactor.status)} icon={getStatusIcon(selectedFactor.status)}>
                  {selectedFactor.status}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            
            <Divider>Technology Breakdown</Divider>
            <Row gutter={16}>
              {Object.entries(selectedFactor.technology_breakdown).map(([tech, percentage]) => (
                <Col span={8} key={tech}>
                  <Statistic title={tech.charAt(0).toUpperCase() + tech.slice(1)} value={percentage} suffix="%" />
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Modal>

      <Divider>Upload Resource-Mix File</Divider>
      <Upload.Dragger {...uploadProps}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Click or drag CSV/JSON file to upload</p>
        <p className="ant-upload-hint">Columns: hour|year, fuel_type, owned_gen_MWh, purchased_power_MWh, retired_RECs_MWh, REC_batch_IDs[]</p>
      </Upload.Dragger>
      {qcReport && (
        <Result
          status={qcReport.valid ? 'success' : 'error'}
          title="QC Report"
          subTitle={qcReport.message}
        />
      )}
      {qcReport?.valid && (
        <>
          <Checkbox checked={attestationAgreed} onChange={(e) => setAttestationAgreed(e.target.checked)}>
            I attest that the data is accurate
          </Checkbox>
          <Button type="primary" disabled={!attestationAgreed}>Publish</Button>
        </>
      )}
    </div>
  );
};

export default SSSFactorManagement;
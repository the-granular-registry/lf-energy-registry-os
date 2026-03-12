import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Tag, 
  Input, 
  DatePicker, 
  Select, 
  Space, 
  Button, 
  Card, 
  Row, 
  Col, 
  Typography,
  Tooltip,
  Modal,
  Divider
} from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  FilterOutlined, 
  EyeOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectFilteredApprovalHistory,
  selectApprovalLoading,
  selectApprovalFilters,
  fetchApprovalHistory,
  setFilters,
  resetFilters
} from '../../store/approval/approvalSlice';
import { logger } from '../../utils';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text, Title } = Typography;

/**
 * Component for viewing approval history
 */
const ApprovalHistory = () => {
  const dispatch = useDispatch();
  
  // Redux state
  const approvalHistory = useSelector(selectFilteredApprovalHistory);
  const loading = useSelector(selectApprovalLoading);
  const filters = useSelector(selectApprovalFilters);
  
  // Local state
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Load data on mount
  useEffect(() => {
    logger.debug('ApprovalHistory: Component mounted, fetching data');
    dispatch(fetchApprovalHistory());
  }, [dispatch]);

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    logger.debug('ApprovalHistory: Filter changed', { filterType, value });
    dispatch(setFilters({ [filterType]: value }));
  };

  // Reset filters
  const handleResetFilters = () => {
    logger.debug('ApprovalHistory: Resetting filters');
    dispatch(resetFilters());
    setSearchText('');
  };

  // View approval details
  const viewApprovalDetails = (approval) => {
    logger.debug('ApprovalHistory: Viewing approval details', approval.id);
    setSelectedApproval(approval);
    setDetailsModalVisible(true);
  };

  // Export data (placeholder implementation)
  const handleExport = () => {
    logger.debug('ApprovalHistory: Exporting data');
    // TODO: Implement CSV export functionality
    const dataStr = JSON.stringify(approvalHistory, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `approval-history-${moment().format('YYYY-MM-DD')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

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

  // Get status color for tags
  const getStatusColor = (status) => {
    const colors = {
      'APPROVED': 'green',
      'REJECTED': 'red',
      'CANCELLED': 'orange',
    };
    return colors[status] || 'default';
  };

  // Filter data based on search text
  const filteredData = approvalHistory.filter(item => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    
    return (
      item.request_type.toLowerCase().includes(searchLower) ||
      item.status.toLowerCase().includes(searchLower) ||
      item.target_entity_type.toLowerCase().includes(searchLower) ||
      (item.review_comments && item.review_comments.toLowerCase().includes(searchLower)) ||
      item.id.toString().includes(searchText)
    );
  });

  // Table columns
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Type',
      dataIndex: 'request_type',
      key: 'request_type',
      width: 130,
      render: (type) => (
        <Tag color={getTypeColor(type)}>
          {type.replace('_', ' ')}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: 'Requester',
      dataIndex: 'requester_id',
      key: 'requester_id',
      width: 120,
      render: (requesterId) => (
        <Text>ID: {requesterId}</Text>
      ),
    },
    {
      title: 'Target',
      key: 'target_entity',
      width: 150,
      render: (_, record) => (
        <div>
          <Text>{record.target_entity_type}</Text>
          <div>
            <Text type="secondary">ID: {record.target_entity_id}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Reviewed By',
      dataIndex: 'reviewed_by',
      key: 'reviewed_by',
      width: 120,
      render: (reviewedBy) => (
        <Text>{reviewedBy ? `ID: ${reviewedBy}` : 'N/A'}</Text>
      ),
    },
    {
      title: 'Reviewed At',
      dataIndex: 'reviewed_at',
      key: 'reviewed_at',
      width: 160,
      render: (date) => date ? moment(date).format('YYYY-MM-DD HH:mm') : 'N/A',
      sorter: (a, b) => {
        const dateA = a.reviewed_at ? new Date(a.reviewed_at) : new Date(0);
        const dateB = b.reviewed_at ? new Date(b.reviewed_at) : new Date(0);
        return dateA - dateB;
      },
    },
    {
      title: 'Comments',
      dataIndex: 'review_comments',
      key: 'review_comments',
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (comments) => (
        <Tooltip title={comments || 'No comments'}>
          <Text ellipsis style={{ maxWidth: 180 }}>
            {comments || 'No comments'}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Tooltip title="View Details">
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => viewApprovalDetails(record)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="approval-history">
      {/* Filters */}
      <Card 
        size="small" 
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <FilterOutlined />
            Filters & Search
          </Space>
        }
        extra={
          <Space>
            <Button 
              size="small" 
              onClick={handleResetFilters}
            >
              Reset
            </Button>
            <Button 
              size="small" 
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              Export
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={6}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>Search:</Text>
              <Input
                placeholder="Search approvals..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Space>
          </Col>
          <Col xs={24} sm={4}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>Status:</Text>
              <Select
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
                style={{ width: '100%' }}
                placeholder="All Status"
              >
                <Option value="all">All Status</Option>
                <Option value="APPROVED">Approved</Option>
                <Option value="REJECTED">Rejected</Option>
                <Option value="CANCELLED">Cancelled</Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={5}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>Type:</Text>
              <Select
                value={filters.type}
                onChange={(value) => handleFilterChange('type', value)}
                style={{ width: '100%' }}
                placeholder="All Types"
              >
                <Option value="all">All Types</Option>
                <Option value="METER_DATA">Meter Data</Option>
                <Option value="ORGANIZATION">Organization</Option>
                <Option value="USER">User</Option>
                <Option value="DEVICE">Device</Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={6}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>Date Range:</Text>
              <RangePicker
                value={filters.dateRange}
                onChange={(dates) => handleFilterChange('dateRange', dates)}
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
              />
            </Space>
          </Col>
          <Col xs={24} sm={3}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>Actions:</Text>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => dispatch(fetchApprovalHistory())}
                loading={loading.approvalHistory}
                style={{ width: '100%' }}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Summary */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col>
            <Text strong>Total Records: {filteredData.length}</Text>
          </Col>
          <Col>
            <Text strong>
              Approved: {filteredData.filter(item => item.status === 'APPROVED').length}
            </Text>
          </Col>
          <Col>
            <Text strong>
              Rejected: {filteredData.filter(item => item.status === 'REJECTED').length}
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={loading.approvalHistory}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} items`,
          pageSizeOptions: ['10', '20', '50', '100']
        }}
        scroll={{ x: 1200 }}
        size="small"
      />

      {/* Details Modal */}
      <Modal
        title={`Approval Request Details - ${selectedApproval?.status}`}
        open={detailsModalVisible}
        onCancel={() => {
          setDetailsModalVisible(false);
          setSelectedApproval(null);
        }}
        footer={null}
        width={800}
      >
        {selectedApproval && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div><Text strong>ID:</Text> {selectedApproval.id}</div>
                  <div><Text strong>Type:</Text> {selectedApproval.request_type}</div>
                  <div>
                    <Text strong>Status:</Text>{' '}
                    <Tag color={getStatusColor(selectedApproval.status)}>
                      {selectedApproval.status}
                    </Tag>
                  </div>
                  <div><Text strong>Priority:</Text> {selectedApproval.priority}</div>
                  <div><Text strong>Requester ID:</Text> {selectedApproval.requester_id}</div>
                </Space>
              </Col>
              <Col span={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div><Text strong>Target Entity:</Text> {selectedApproval.target_entity_type}</div>
                  <div><Text strong>Target ID:</Text> {selectedApproval.target_entity_id}</div>
                  <div><Text strong>Submitted:</Text> {moment(selectedApproval.submitted_at).format('YYYY-MM-DD HH:mm:ss')}</div>
                  <div><Text strong>Reviewed:</Text> {selectedApproval.reviewed_at ? moment(selectedApproval.reviewed_at).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}</div>
                  <div><Text strong>Reviewed By:</Text> {selectedApproval.reviewed_by || 'N/A'}</div>
                </Space>
              </Col>
            </Row>
            
            {selectedApproval.review_comments && (
              <div style={{ marginTop: 16 }}>
                <Divider />
                <Title level={5}>Review Comments</Title>
                <Text>{selectedApproval.review_comments}</Text>
              </div>
            )}
            
            {selectedApproval.extra_metadata && (
              <div style={{ marginTop: 16 }}>
                <Divider />
                <Title level={5}>Additional Information</Title>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '12px', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '300px'
                }}>
                  {JSON.stringify(selectedApproval.extra_metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ApprovalHistory; 
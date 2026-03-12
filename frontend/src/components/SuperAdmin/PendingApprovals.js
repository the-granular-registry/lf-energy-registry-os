import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Tag, 
  Button, 
  Modal, 
  Input, 
  Space, 
  Select, 
  message, 
  Tooltip,
  Card,
  Typography,
  Row,
  Col,
  Divider
} from 'antd';
import { 
  CheckOutlined, 
  CloseOutlined, 
  EyeOutlined, 
  ReloadOutlined,
  FilterOutlined
} from '@ant-design/icons';
import MeasurementReportDetailsPanel from '../measurement/MeasurementReportDetailsPanel';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectFilteredPendingApprovals,
  selectApprovalLoading,
  selectApprovalFilters,
  fetchPendingApprovals,
  approveRequest,
  rejectRequest,
  setFilters,
  resetFilters
} from '../../store/approval/approvalSlice';
import { logger } from '../../utils';

const { TextArea } = Input;
const { Option } = Select;
const { Text, Title } = Typography;

/**
 * Component for managing pending approval requests
 */
const PendingApprovals = () => {
  const dispatch = useDispatch();
  
  // Redux state
  const pendingApprovals = useSelector(selectFilteredPendingApprovals);
  const loading = useSelector(selectApprovalLoading);
  const filters = useSelector(selectApprovalFilters);
  
  // Local state
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState('approve');
  const [comments, setComments] = useState('');
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  // Load data on mount
  useEffect(() => {
    logger.debug('PendingApprovals: Component mounted, fetching data');
    dispatch(fetchPendingApprovals());
  }, [dispatch]);

  // Handle approval action (approve/reject)
  const handleApprovalAction = async () => {
    if (!selectedApproval) return;
    
    try {
      const actionData = {
        approvalId: selectedApproval.id,
        data: { comments: comments.trim() }
      };
      
      if (actionType === 'approve') {
        await dispatch(approveRequest(actionData)).unwrap();
        message.success('Request approved successfully');
      } else {
        await dispatch(rejectRequest(actionData)).unwrap();
        message.success('Request rejected successfully');
      }
      
      // Close modal and reset state
      setActionModalVisible(false);
      setComments('');
      setSelectedApproval(null);
      
    } catch (error) {
      logger.error('PendingApprovals: Error processing action:', error);
      message.error(`Failed to ${actionType} request: ${error}`);
    }
  };

  // Open action modal
  const openActionModal = (approval, type) => {
    logger.debug('PendingApprovals: Opening action modal', { approval: approval.id, type });
    setSelectedApproval(approval);
    setActionType(type);
    setActionModalVisible(true);
  };

  // View approval details
  const viewApprovalDetails = (approval) => {
    logger.debug('PendingApprovals: Viewing approval details', approval.id);
    setSelectedApproval(approval);
    setDetailsModalVisible(true);
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    logger.debug('PendingApprovals: Filter changed', { filterType, value });
    dispatch(setFilters({ [filterType]: value }));
  };

  // Reset filters
  const handleResetFilters = () => {
    logger.debug('PendingApprovals: Resetting filters');
    dispatch(resetFilters());
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

  // Get priority color for tags
  const getPriorityColor = (priority) => {
    const colors = {
      'HIGH': 'red',
      'MEDIUM': 'orange',
      'LOW': 'green',
    };
    return colors[priority] || 'default';
  };

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
      width: 150,
      render: (type) => (
        <Tag color={getTypeColor(type)}>
          {type.replace('_', ' ')}
        </Tag>
      ),
      filters: [
        { text: 'Meter Data', value: 'METER_DATA' },
        { text: 'Organization', value: 'ORGANIZATION' },
        { text: 'User', value: 'USER' },
        { text: 'Device', value: 'DEVICE' },
      ],
    },
    {
      title: 'Requester',
      dataIndex: 'requester_id',
      key: 'requester_id',
      width: 200,
      render: (requesterId, record) => (
        <div>
          <Text strong>ID: {requesterId}</Text>
          {record.requester_email && (
            <div>
              <Text type="secondary">{record.requester_email}</Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Target Entity',
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
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority) => (
        <Tag color={getPriorityColor(priority)}>{priority}</Tag>
      ),
      sorter: (a, b) => {
        const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      },
    },
    {
      title: 'Submitted',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      width: 180,
      render: (date) => new Date(date).toLocaleString(),
      sorter: (a, b) => new Date(a.submitted_at) - new Date(b.submitted_at),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => viewApprovalDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Approve">
            <Button
              type="primary"
              icon={<CheckOutlined />}
              size="small"
              onClick={() => openActionModal(record, 'approve')}
              loading={loading.approveRequest}
            />
          </Tooltip>
          <Tooltip title="Reject">
            <Button
              danger
              icon={<CloseOutlined />}
              size="small"
              onClick={() => openActionModal(record, 'reject')}
              loading={loading.rejectRequest}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="pending-approvals">
      {/* Filters */}
      <Card 
        size="small" 
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <FilterOutlined />
            Filters
          </Space>
        }
        extra={
          <Button 
            size="small" 
            onClick={handleResetFilters}
          >
            Reset
          </Button>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
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
          <Col xs={24} sm={8}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>Priority:</Text>
              <Select
                value={filters.priority}
                onChange={(value) => handleFilterChange('priority', value)}
                style={{ width: '100%' }}
                placeholder="All Priorities"
              >
                <Option value="all">All Priorities</Option>
                <Option value="HIGH">High</Option>
                <Option value="MEDIUM">Medium</Option>
                <Option value="LOW">Low</Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={8}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>Actions:</Text>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => dispatch(fetchPendingApprovals())}
                loading={loading.pendingApprovals}
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
            <Text strong>Total Pending: {pendingApprovals.length}</Text>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={pendingApprovals}
        rowKey="id"
        loading={loading.pendingApprovals}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} items`,
        }}
        scroll={{ x: 1200 }}
        size="small"
      />

      {/* Action Modal */}
      <Modal
        title={`${actionType === 'approve' ? 'Approve' : 'Reject'} Request`}
        open={actionModalVisible}
        onOk={handleApprovalAction}
        onCancel={() => {
          setActionModalVisible(false);
          setComments('');
          setSelectedApproval(null);
        }}
        okText={actionType === 'approve' ? 'Approve' : 'Reject'}
        okButtonProps={{ 
          danger: actionType === 'reject',
          type: actionType === 'approve' ? 'primary' : 'default',
          loading: loading.approveRequest || loading.rejectRequest
        }}
        width={600}
      >
        {selectedApproval && (
          <div>
            <p>
              Are you sure you want to {actionType} this{' '}
              <strong>{selectedApproval.request_type.replace('_', ' ')}</strong> request?
            </p>
            
            <Divider />
            
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Request ID:</Text> {selectedApproval.id}
              </div>
              <div>
                <Text strong>Type:</Text> {selectedApproval.request_type.replace('_', ' ')}
              </div>
              <div>
                <Text strong>Priority:</Text> {selectedApproval.priority}
              </div>
              <div>
                <Text strong>Target:</Text> {selectedApproval.target_entity_type} (ID: {selectedApproval.target_entity_id})
              </div>
            </Space>
            
            <Divider />
            
            <TextArea
              placeholder="Add comments (optional)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              maxLength={500}
              showCount
            />
          </div>
        )}
      </Modal>

      {/* Details Modal */}
      <Modal
        title={`Approval Request Details`}
        open={detailsModalVisible}
        onCancel={() => {
          setDetailsModalVisible(false);
          setSelectedApproval(null);
        }}
        footer={null}
        width={1000}
      >
        {selectedApproval && selectedApproval.target_entity_type === 'measurement_report' ? (
          <MeasurementReportDetailsPanel 
            deviceId={selectedApproval.extra_metadata?.device_id}
            measurementId={selectedApproval.target_entity_id}
          />
        ) : selectedApproval ? (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div><Text strong>ID:</Text> {selectedApproval.id}</div>
                  <div><Text strong>Type:</Text> {selectedApproval.request_type}</div>
                  <div><Text strong>Status:</Text> {selectedApproval.status}</div>
                  <div><Text strong>Priority:</Text> {selectedApproval.priority}</div>
                </Space>
              </Col>
              <Col span={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div><Text strong>Requester ID:</Text> {selectedApproval.requester_id}</div>
                  <div><Text strong>Target Entity:</Text> {selectedApproval.target_entity_type}</div>
                  <div><Text strong>Target ID:</Text> {selectedApproval.target_entity_id}</div>
                  <div><Text strong>Submitted:</Text> {new Date(selectedApproval.submitted_at).toLocaleString()}</div>
                </Space>
              </Col>
            </Row>
            {selectedApproval.extra_metadata && (
              <div style={{ marginTop: 16 }}>
                <Divider />
                <Title level={5}>Additional Information</Title>
                <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', fontSize: '12px', overflow: 'auto' }}>
                  {JSON.stringify(selectedApproval.extra_metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default PendingApprovals; 
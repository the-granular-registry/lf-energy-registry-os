import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Upload, 
  Select, 
  message, 
  Space, 
  Tag, 
  Row, 
  Col, 
  Statistic,
  Divider,
  Typography,
  Progress,
  Tooltip
} from 'antd';
import { 
  UploadOutlined, 
  SendOutlined, 
  EyeOutlined, 
  FileTextOutlined,
  UserAddOutlined,
  MailOutlined,
  DollarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { 
  uploadProjectMetadataAPI,
  createDraftOrganisationAPI,
  getDraftOrganisationsAPI,
  sendInvitationAPI,
  getInvitationStatusAPI
} from '../../api/invitationAPI';
import { logger } from '../../utils';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const InvitationManagement = () => {
  const [loading, setLoading] = useState(false);
  const [draftOrganisations, setDraftOrganisations] = useState([]);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(''); // 'upload', 'create', 'invite', 'view'
  const [form] = Form.useForm();
  const [uploadForm] = Form.useForm();
  const [inviteForm] = Form.useForm();
  
  // Statistics
  const [stats, setStats] = useState({
    totalDrafts: 0,
    pendingInvitations: 0,
    claimedInvitations: 0,
    totalEstimatedRevenue: 0
  });

  useEffect(() => {
    fetchDraftOrganisations();
  }, []);

  const fetchDraftOrganisations = async () => {
    try {
      setLoading(true);
      const response = await getDraftOrganisationsAPI();
      setDraftOrganisations(response.data || []);
      
      // Calculate statistics
      const totalDrafts = response.data?.length || 0;
      const totalRevenue = response.data?.reduce((sum, draft) => 
        sum + (parseFloat(draft.total_estimated_fees) || 0), 0
      ) || 0;
      
      setStats({
        totalDrafts,
        pendingInvitations: response.pending_invitations || 0,
        claimedInvitations: response.claimed_invitations || 0,
        totalEstimatedRevenue: totalRevenue
      });
    } catch (error) {
      message.error('Failed to fetch draft organisations');
      logger.error('Error fetching draft organisations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadMetadata = async (values) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', values.file.file);
      
      await uploadProjectMetadataAPI(formData);
      message.success('Project metadata uploaded successfully');
      setModalVisible(false);
      uploadForm.resetFields();
      fetchDraftOrganisations();
    } catch (error) {
      message.error('Failed to upload project metadata');
      logger.error('Error uploading metadata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDraft = async (values) => {
    try {
      setLoading(true);
      await createDraftOrganisationAPI(values);
      message.success('Draft organisation created successfully');
      setModalVisible(false);
      form.resetFields();
      fetchDraftOrganisations();
    } catch (error) {
      message.error('Failed to create draft organisation');
      logger.error('Error creating draft:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async (values) => {
    try {
      setLoading(true);
      await sendInvitationAPI(selectedDraft.id, values);
      message.success('Invitation sent successfully');
      setModalVisible(false);
      inviteForm.resetFields();
      fetchDraftOrganisations();
    } catch (error) {
      message.error('Failed to send invitation');
      logger.error('Error sending invitation:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      'PENDING': { color: 'orange', text: 'Pending' },
      'INVITATION_SENT': { color: 'blue', text: 'Invitation Sent' },
      'CLAIMED': { color: 'purple', text: 'Claimed' },
      'PAYMENT_PENDING': { color: 'gold', text: 'Payment Pending' },
      'PAYMENT_COMPLETED': { color: 'green', text: 'Payment Completed' },
      'ACTIVE': { color: 'success', text: 'Active' }
    };
    
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: 'Organisation Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Project ID',
      dataIndex: 'provisional_project_id',
      key: 'provisional_project_id',
      render: (text) => <Text code>{text}</Text>
    },
    {
      title: 'Contact Email',
      dataIndex: 'primary_contact_email',
      key: 'primary_contact_email'
    },
    {
      title: 'Estimated Annual MWh',
      dataIndex: 'estimated_annual_mwh',
      key: 'estimated_annual_mwh',
      render: (value) => value ? `${value.toLocaleString()} MWh` : 'N/A'
    },
    {
      title: 'Total Fees',
      dataIndex: 'total_estimated_fees',
      key: 'total_estimated_fees',
      render: (value) => value ? `$${parseFloat(value).toLocaleString()}` : 'N/A'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status)
    },
    {
      title: 'Payment Status',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (status) => status ? getStatusTag(String(status).toUpperCase()) : 'N/A'
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => {
                setSelectedDraft(record);
                setModalType('view');
                setModalVisible(true);
              }}
            />
          </Tooltip>
          {record.status === 'PENDING' && (
            <Tooltip title="Send Invitation">
              <Button 
                icon={<MailOutlined />} 
                type="primary" 
                size="small"
                onClick={() => {
                  setSelectedDraft(record);
                  setModalType('invite');
                  setModalVisible(true);
                }}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const renderUploadModal = () => (
    <Modal
      title="Upload Project Metadata"
      open={modalVisible && modalType === 'upload'}
      onCancel={() => setModalVisible(false)}
      footer={null}
      width={600}
    >
      <Form
        form={uploadForm}
        layout="vertical"
        onFinish={handleUploadMetadata}
      >
        <Form.Item
          name="file"
          label="Project Metadata CSV"
          rules={[{ required: true, message: 'Please upload a CSV file' }]}
        >
          <Upload
            beforeUpload={() => false}
            accept=".csv"
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Select CSV File</Button>
          </Upload>
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Upload
            </Button>
            <Button onClick={() => setModalVisible(false)}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );

  const renderCreateModal = () => (
    <Modal
      title="Create Draft Organisation"
      open={modalVisible && modalType === 'create'}
      onCancel={() => setModalVisible(false)}
      footer={null}
      width={800}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleCreateDraft}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label="Organisation Name"
              rules={[{ required: true, message: 'Please enter organisation name' }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="primary_contact_email"
              label="Primary Contact Email"
              rules={[
                { required: true, message: 'Please enter contact email' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item
          name="address"
          label="Address"
          rules={[{ required: true, message: 'Please enter address' }]}
        >
          <TextArea rows={2} />
        </Form.Item>
        
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="estimated_annual_mwh"
              label="Estimated Annual MWh"
              rules={[{ required: true, message: 'Please enter estimated MWh' }]}
            >
              <Input type="number" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="estimated_account_fee"
              label="Account Fee ($)"
              rules={[{ required: true, message: 'Please enter account fee' }]}
            >
              <Input type="number" step="0.01" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="estimated_onboarding_fee"
              label="Onboarding Fee ($)"
              rules={[{ required: true, message: 'Please enter onboarding fee' }]}
            >
              <Input type="number" step="0.01" />
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Create Draft
            </Button>
            <Button onClick={() => setModalVisible(false)}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );

  const renderInviteModal = () => (
    <Modal
      title={`Send Invitation - ${selectedDraft?.name}`}
      open={modalVisible && modalType === 'invite'}
      onCancel={() => setModalVisible(false)}
      footer={null}
      width={600}
    >
      <Form
        form={inviteForm}
        layout="vertical"
        onFinish={handleSendInvitation}
        initialValues={{
          recipient_email: selectedDraft?.primary_contact_email,
          expires_in_days: 7
        }}
      >
        <Form.Item
          name="recipient_email"
          label="Recipient Email"
          rules={[
            { required: true, message: 'Please enter recipient email' },
            { type: 'email', message: 'Please enter a valid email' }
          ]}
        >
          <Input />
        </Form.Item>
        
        <Form.Item
          name="recipient_name"
          label="Recipient Name"
          rules={[{ required: true, message: 'Please enter recipient name' }]}
        >
          <Input />
        </Form.Item>
        
        <Form.Item
          name="custom_message"
          label="Custom Message"
        >
          <TextArea 
            rows={3} 
            placeholder="Optional custom message to include in the invitation email"
          />
        </Form.Item>
        
        <Form.Item
          name="expires_in_days"
          label="Expires In (Days)"
          rules={[{ required: true, message: 'Please enter expiry days' }]}
        >
          <Select>
            <Option value={3}>3 Days</Option>
            <Option value={7}>7 Days</Option>
            <Option value={14}>14 Days</Option>
            <Option value={30}>30 Days</Option>
          </Select>
        </Form.Item>
        
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SendOutlined />}>
              Send Invitation
            </Button>
            <Button onClick={() => setModalVisible(false)}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );

  const renderViewModal = () => (
    <Modal
      title={`Organisation Details - ${selectedDraft?.name}`}
      open={modalVisible && modalType === 'view'}
      onCancel={() => setModalVisible(false)}
      footer={[
        <Button key="close" onClick={() => setModalVisible(false)}>
          Close
        </Button>
      ]}
      width={800}
    >
      {selectedDraft && (
        <div>
          <Row gutter={16}>
            <Col span={12}>
              <Card size="small" title="Basic Information">
                <p><strong>Name:</strong> {selectedDraft.name}</p>
                <p><strong>Email:</strong> {selectedDraft.primary_contact_email}</p>
                <p><strong>Address:</strong> {selectedDraft.address}</p>
                <p><strong>Project ID:</strong> {selectedDraft.provisional_project_id}</p>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="Financial Information">
                <p><strong>Annual MWh:</strong> {selectedDraft.estimated_annual_mwh?.toLocaleString() || 'N/A'}</p>
                <p><strong>Account Fee:</strong> ${parseFloat(selectedDraft.estimated_account_fee || 0).toLocaleString()}</p>
                <p><strong>Onboarding Fee:</strong> ${parseFloat(selectedDraft.estimated_onboarding_fee || 0).toLocaleString()}</p>
                <p><strong>Total Fees:</strong> ${parseFloat(selectedDraft.total_estimated_fees || 0).toLocaleString()}</p>
              </Card>
            </Col>
          </Row>
          
          <Divider />
          
          <Card size="small" title="Status Information">
            <Row gutter={16}>
              <Col span={8}>
                <p><strong>Status:</strong> {getStatusTag(selectedDraft.status)}</p>
              </Col>
              <Col span={8}>
                <p><strong>Payment Status:</strong> {selectedDraft.payment_status ? getStatusTag(String(selectedDraft.payment_status).toUpperCase()) : 'N/A'}</p>
              </Col>
              <Col span={8}>
                <p><strong>Created:</strong> {new Date(selectedDraft.created_at).toLocaleDateString()}</p>
              </Col>
            </Row>
          </Card>
          
          {selectedDraft.project_metadata && Object.keys(selectedDraft.project_metadata).length > 0 && (
            <>
              <Divider />
              <Card size="small" title="Project Metadata">
                <pre>{JSON.stringify(selectedDraft.project_metadata, null, 2)}</pre>
              </Card>
            </>
          )}
        </div>
      )}
    </Modal>
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>Invitation Management</Title>
        <Text type="secondary">Manage organisation invitations and onboarding</Text>
      </div>
      
      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Drafts"
              value={stats.totalDrafts}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Invitations"
              value={stats.pendingInvitations}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Claimed Invitations"
              value={stats.claimedInvitations}
              prefix={<UserAddOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Estimated Revenue"
              value={stats.totalEstimatedRevenue}
              prefix={<DollarOutlined />}
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      {/* Action Buttons */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Button 
            type="primary" 
            icon={<UploadOutlined />}
            onClick={() => {
              setModalType('upload');
              setModalVisible(true);
            }}
          >
            Upload Project Metadata
          </Button>
          <Button 
            icon={<UserAddOutlined />}
            onClick={() => {
              setModalType('create');
              setModalVisible(true);
            }}
          >
            Create Draft Organisation
          </Button>
          <Button onClick={fetchDraftOrganisations} loading={loading}>
            Refresh
          </Button>
        </Space>
      </Card>

      {/* Main Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={draftOrganisations}
          rowKey="id"
          loading={loading}
          pagination={{
            total: draftOrganisations.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} draft organisations`
          }}
        />
      </Card>

      {/* Modals */}
      {renderUploadModal()}
      {renderCreateModal()}
      {renderInviteModal()}
      {renderViewModal()}
    </div>
  );
};

export default InvitationManagement; 
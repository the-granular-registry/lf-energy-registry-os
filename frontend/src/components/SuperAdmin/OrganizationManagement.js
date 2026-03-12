import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Tag,
  Typography,
  Divider,
  Popconfirm,
  Tooltip,
  Upload,
  Steps
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BankOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  SendOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { logger } from '../../utils';
import { getOrganizationsAPI } from '../../api/organizationAPI';
import { 
  createOrganizationAPI,
  updateOrganizationAPI,
  deleteOrganizationAPI,
  activateOrganizationAPI,
  suspendOrganizationAPI,
  createDraftOrganizationAPI,
  sendInvitationAPI,
  getDraftOrganizationsAPI
} from '../../api/superAdminAPI';

const { Title, Text } = Typography;
const { Option } = Select;
const { Step } = Steps;

const SuperAdminOrganizationManagement = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [draftOrganizations, setDraftOrganizations] = useState([]);
  
  // Modal states
  const [isCreateOrgVisible, setIsCreateOrgVisible] = useState(false);
  const [isCreateDraftVisible, setIsCreateDraftVisible] = useState(false);
  const [isInviteVisible, setIsInviteVisible] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Filter states
  const [filters, setFilters] = useState({
    status: null,
    organizationType: null
  });

  // Forms
  const [createOrgForm] = Form.useForm();
  const [createDraftForm] = Form.useForm();
  const [inviteForm] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [orgsRes, draftsRes] = await Promise.all([
        getOrganizationsAPI(),
        getDraftOrganizationsAPI()
      ]);

      let filteredOrgs = orgsRes.data || [];
      
      // Apply filters
      if (filters.status) {
        filteredOrgs = filteredOrgs.filter(org => org.status === filters.status);
      }
      if (filters.organizationType) {
        filteredOrgs = filteredOrgs.filter(org => org.organization_type === filters.organizationType);
      }

      setOrganizations(filteredOrgs);
      setDraftOrganizations(draftsRes.data || []);
    } catch (error) {
      logger.error('Error fetching organizations:', error);
      message.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (values) => {
    try {
      setLoading(true);
      await createOrganizationAPI({
        name: values.name,
        business_registration_number: values.business_registration_number,
        address: values.address,
        primary_contact_email: values.primary_contact_email,
        website: values.website,
        organization_type: values.organization_type
      }, values.mfa_token);
      
      message.success('Organization created successfully');
      setIsCreateOrgVisible(false);
      createOrgForm.resetFields();
      fetchData();
    } catch (error) {
      logger.error('Error creating organization:', error);
      message.error(error.response?.data?.detail || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDraft = async (values) => {
    try {
      setLoading(true);
      await createDraftOrganizationAPI({
        name: values.name,
        address: values.address,
        primary_contact_email: values.primary_contact_email,
        organization_type: values.organization_type,
        provisional_project_id: values.provisional_project_id,
        estimated_annual_mwh: values.estimated_annual_mwh,
        project_metadata: values.project_metadata || {}
      });
      
      message.success('Draft organization created successfully');
      setIsCreateDraftVisible(false);
      createDraftForm.resetFields();
      setCurrentStep(0);
      fetchData();
    } catch (error) {
      logger.error('Error creating draft organization:', error);
      message.error(error.response?.data?.detail || 'Failed to create draft organization');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async (values) => {
    try {
      setLoading(true);
      await sendInvitationAPI(selectedOrg.id, {
        recipient_email: values.recipient_email,
        message: values.message
      });
      
      message.success('Invitation sent successfully');
      setIsInviteVisible(false);
      inviteForm.resetFields();
      setSelectedOrg(null);
    } catch (error) {
      logger.error('Error sending invitation:', error);
      message.error(error.response?.data?.detail || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrganization = async (orgId, reason) => {
    try {
      setLoading(true);
      await deleteOrganizationAPI(orgId, { 
        reason, 
        mfa_token: 'placeholder' // Would need real MFA implementation
      });
      message.success('Organization deleted successfully');
      fetchData();
    } catch (error) {
      logger.error('Error deleting organization:', error);
      message.error(error.response?.data?.detail || 'Failed to delete organization');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orgId, action) => {
    try {
      setLoading(true);
      if (action === 'activate') {
        await activateOrganizationAPI(orgId);
        message.success('Organization activated successfully');
      } else if (action === 'suspend') {
        await suspendOrganizationAPI(orgId, 'Suspended by super admin');
        message.success('Organization suspended successfully');
      }
      fetchData();
    } catch (error) {
      logger.error(`Error ${action}ing organization:`, error);
      message.error(`Failed to ${action} organization`);
    } finally {
      setLoading(false);
    }
  };

  const organizationColumns = [
    {
      title: 'Organization',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          <BankOutlined />
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              ID: {record.id}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'organization_type',
      key: 'organization_type',
      render: (type) => {
        const colors = {
          ENERGY_PRODUCER: 'green',
          TRADER: 'blue',
          CONSUMER: 'orange',
          UTILITY: 'purple'
        };
        return <Tag color={colors[type] || 'default'}>{type?.replace('_', ' ')}</Tag>;
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          ACTIVE: 'green',
          PENDING: 'orange',
          SUSPENDED: 'red',
          REJECTED: 'volcano'
        };
        const icons = {
          ACTIVE: <CheckCircleOutlined />,
          PENDING: <ClockCircleOutlined />,
          SUSPENDED: <WarningOutlined />,
          REJECTED: <WarningOutlined />
        };
        return (
          <Tag color={colors[status] || 'default'} icon={icons[status]}>
            {status}
          </Tag>
        );
      }
    },
    {
      title: 'Contact Email',
      dataIndex: 'primary_contact_email',
      key: 'primary_contact_email'
    },
    {
      title: 'Registration',
      dataIndex: 'business_registration_number',
      key: 'business_registration_number',
      render: (regNum) => regNum || 'N/A'
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
          {record.status === 'SUSPENDED' && (
            <Tooltip title="Activate Organization">
              <Button
                type="text"
                icon={<CheckCircleOutlined />}
                onClick={() => handleStatusChange(record.id, 'activate')}
                size="small"
                style={{ color: 'green' }}
              />
            </Tooltip>
          )}
          {record.status === 'ACTIVE' && (
            <Tooltip title="Suspend Organization">
              <Button
                type="text"
                icon={<WarningOutlined />}
                onClick={() => handleStatusChange(record.id, 'suspend')}
                size="small"
                style={{ color: 'orange' }}
              />
            </Tooltip>
          )}
          <Tooltip title="Edit Organization">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Delete Organization">
            <Popconfirm
              title="Delete Organization"
              description="Are you sure you want to delete this organization? This action cannot be undone."
              onConfirm={() => handleDeleteOrganization(record.id, 'Super admin deletion')}
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
                size="small"
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  const draftColumns = [
    {
      title: 'Name',
      dataIndex: 'organisation_name',
      key: 'organisation_name',
      render: (name, record) => (
        <Space>
          <BankOutlined />
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Project: {record.provisional_project_id || 'N/A'}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'organization_type',
      key: 'organization_type',
      render: (type) => <Tag>{type?.replace('_', ' ')}</Tag>
    },
    {
      title: 'Contact',
      dataIndex: 'contact_email',
      key: 'contact_email'
    },
    {
      title: 'Estimated MWh',
      dataIndex: 'estimated_annual_mwh',
      key: 'estimated_annual_mwh',
      render: (mwh) => mwh ? `${mwh.toLocaleString()} MWh` : 'N/A'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'DRAFT' ? 'blue' : 'orange'}>
          {status}
        </Tag>
      )
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
          <Tooltip title="Send Invitation">
            <Button
              type="text"
              icon={<SendOutlined />}
              onClick={() => {
                setSelectedOrg(record);
                setIsInviteVisible(true);
              }}
              size="small"
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const steps = [
    {
      title: 'Basic Info',
      content: 'Organization basic information'
    },
    {
      title: 'Project Details',
      content: 'Project-specific information'
    },
    {
      title: 'Review',
      content: 'Review and create draft'
    }
  ];

  return (
    <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0, color: '#1f2937' }}>
            Super Admin Organization Management
          </Title>
          <Text type="secondary">
            Create, manage, and oversee organizations across the platform
          </Text>
        </div>

        {/* Filters and Actions */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={16} align="middle">
            <Col span={4}>
              <Select
                placeholder="Status"
                style={{ width: '100%' }}
                allowClear
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
              >
                <Option value="ACTIVE">Active</Option>
                <Option value="PENDING">Pending</Option>
                <Option value="SUSPENDED">Suspended</Option>
                <Option value="REJECTED">Rejected</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="Type"
                style={{ width: '100%' }}
                allowClear
                value={filters.organizationType}
                onChange={(value) => setFilters({ ...filters, organizationType: value })}
              >
                <Option value="ENERGY_PRODUCER">Energy Producer</Option>
                <Option value="TRADER">Trader</Option>
                <Option value="CONSUMER">Consumer</Option>
                <Option value="UTILITY">Utility</Option>
              </Select>
            </Col>
            <Col span={8}>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsCreateOrgVisible(true)}
                >
                  Create Organization
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => setIsCreateDraftVisible(true)}
                >
                  Create Draft
                </Button>
              </Space>
            </Col>
            <Col span={8}>
              <Text strong>
                Total Organizations: {organizations.length} | Drafts: {draftOrganizations.length}
              </Text>
            </Col>
          </Row>
        </Card>

        {/* Organizations Table */}
        <Card title="Active Organizations" style={{ marginBottom: '24px' }}>
          <Table
            columns={organizationColumns}
            dataSource={organizations}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} organizations`
            }}
            scroll={{ x: 1200 }}
          />
        </Card>

        {/* Draft Organizations Table */}
        <Card title="Draft Organizations">
          <Table
            columns={draftColumns}
            dataSource={draftOrganizations}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} drafts`
            }}
            scroll={{ x: 1200 }}
          />
        </Card>

        {/* Create Organization Modal */}
        <Modal
          title="Create New Organization"
          open={isCreateOrgVisible}
          onCancel={() => {
            setIsCreateOrgVisible(false);
            createOrgForm.resetFields();
          }}
          footer={null}
          width={700}
        >
          <Form
            form={createOrgForm}
            layout="vertical"
            onFinish={handleCreateOrganization}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Organization Name"
                  name="name"
                  rules={[{ required: true, message: 'Please enter organization name' }]}
                >
                  <Input placeholder="Enter organization name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Organization Type"
                  name="organization_type"
                  rules={[{ required: true, message: 'Please select organization type' }]}
                >
                  <Select placeholder="Select type">
                    <Option value="ENERGY_PRODUCER">Energy Producer</Option>
                    <Option value="TRADER">Trader</Option>
                    <Option value="CONSUMER">Consumer</Option>
                    <Option value="UTILITY">Utility</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Business Registration Number"
                  name="business_registration_number"
                  rules={[{ required: true, message: 'Please enter registration number' }]}
                >
                  <Input placeholder="Enter registration number" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Primary Contact Email"
                  name="primary_contact_email"
                  rules={[
                    { required: true, message: 'Please enter contact email' },
                    { type: 'email', message: 'Please enter valid email' }
                  ]}
                >
                  <Input placeholder="Enter contact email" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Address"
              name="address"
              rules={[{ required: true, message: 'Please enter address' }]}
            >
              <Input.TextArea rows={2} placeholder="Enter organization address" />
            </Form.Item>

            <Form.Item
              label="Website"
              name="website"
            >
              <Input placeholder="Enter website URL (optional)" />
            </Form.Item>

            <Form.Item
              label="MFA Token"
              name="mfa_token"
              rules={[{ required: true, message: 'Please enter MFA token' }]}
            >
              <Input placeholder="Enter MFA token for security verification" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Create Organization
                </Button>
                <Button 
                  onClick={() => {
                    setIsCreateOrgVisible(false);
                    createOrgForm.resetFields();
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Create Draft Modal */}
        <Modal
          title="Create Draft Organization"
          open={isCreateDraftVisible}
          onCancel={() => {
            setIsCreateDraftVisible(false);
            createDraftForm.resetFields();
            setCurrentStep(0);
          }}
          footer={null}
          width={800}
        >
          <Steps current={currentStep} style={{ marginBottom: '24px' }}>
            {steps.map(item => (
              <Step key={item.title} title={item.title} />
            ))}
          </Steps>

          <Form
            form={createDraftForm}
            layout="vertical"
            onFinish={handleCreateDraft}
          >
            {currentStep === 0 && (
              <>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Organization Name"
                      name="name"
                      rules={[{ required: true, message: 'Please enter organization name' }]}
                    >
                      <Input placeholder="Enter organization name" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Organization Type"
                      name="organization_type"
                      rules={[{ required: true, message: 'Please select organization type' }]}
                    >
                      <Select placeholder="Select type">
                        <Option value="ENERGY_PRODUCER">Energy Producer</Option>
                        <Option value="TRADER">Trader</Option>
                        <Option value="CONSUMER">Consumer</Option>
                        <Option value="UTILITY">Utility</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label="Primary Contact Email"
                  name="primary_contact_email"
                  rules={[
                    { required: true, message: 'Please enter contact email' },
                    { type: 'email', message: 'Please enter valid email' }
                  ]}
                >
                  <Input placeholder="Enter contact email" />
                </Form.Item>

                <Form.Item
                  label="Address"
                  name="address"
                  rules={[{ required: true, message: 'Please enter address' }]}
                >
                  <Input.TextArea rows={2} placeholder="Enter organization address" />
                </Form.Item>
              </>
            )}

            {currentStep === 1 && (
              <>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Provisional Project ID"
                      name="provisional_project_id"
                    >
                      <Input placeholder="Enter project ID (optional)" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Estimated Annual MWh"
                      name="estimated_annual_mwh"
                    >
                      <Input type="number" placeholder="Enter estimated MWh" />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            )}

            {currentStep === 2 && (
              <div>
                <Title level={4}>Review Information</Title>
                <Text type="secondary">
                  Please review the information before creating the draft organization.
                </Text>
              </div>
            )}

            <Form.Item style={{ marginTop: '24px' }}>
              <Space>
                {currentStep > 0 && (
                  <Button onClick={() => setCurrentStep(currentStep - 1)}>
                    Previous
                  </Button>
                )}
                {currentStep < steps.length - 1 ? (
                  <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)}>
                    Next
                  </Button>
                ) : (
                  <Button type="primary" htmlType="submit" loading={loading}>
                    Create Draft
                  </Button>
                )}
                <Button 
                  onClick={() => {
                    setIsCreateDraftVisible(false);
                    createDraftForm.resetFields();
                    setCurrentStep(0);
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Send Invitation Modal */}
        <Modal
          title={`Send Invitation - ${selectedOrg?.organisation_name}`}
          open={isInviteVisible}
          onCancel={() => {
            setIsInviteVisible(false);
            inviteForm.resetFields();
            setSelectedOrg(null);
          }}
          footer={null}
          width={500}
        >
          <Form
            form={inviteForm}
            layout="vertical"
            onFinish={handleSendInvitation}
          >
            <Form.Item
              label="Recipient Email"
              name="recipient_email"
              rules={[
                { required: true, message: 'Please enter recipient email' },
                { type: 'email', message: 'Please enter valid email' }
              ]}
            >
              <Input placeholder="Enter recipient email" />
            </Form.Item>

            <Form.Item
              label="Message"
              name="message"
            >
              <Input.TextArea 
                rows={4} 
                placeholder="Enter invitation message (optional)"
                maxLength={500}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Send Invitation
                </Button>
                <Button 
                  onClick={() => {
                    setIsInviteVisible(false);
                    inviteForm.resetFields();
                    setSelectedOrg(null);
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default SuperAdminOrganizationManagement;

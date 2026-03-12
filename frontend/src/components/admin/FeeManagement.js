import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Tag,
  Space,
  Tabs,
  Row,
  Col,
  Statistic,
  notification,
  Descriptions,
  Popconfirm
} from 'antd';
import {
  DollarOutlined,
  ExceptionOutlined,
  AuditOutlined,
  CalculatorOutlined,
  PlusOutlined,
  EditOutlined
} from '@ant-design/icons';
import baseAPI from '../../utils/baseAPI';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const FeeManagement = () => {
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [waivers, setWaivers] = useState([]);
  const [billingEvents, setBillingEvents] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  
  // Modal states
  const [waiverModalVisible, setWaiverModalVisible] = useState(false);
  const [adjustmentModalVisible, setAdjustmentModalVisible] = useState(false);
  const [calculatorModalVisible, setCalculatorModalVisible] = useState(false);
  
  // Forms
  const [waiverForm] = Form.useForm();
  const [adjustmentForm] = Form.useForm();
  const [calculatorForm] = Form.useForm();

  useEffect(() => {
    loadOrganizations();
    loadWaivers();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const response = await baseAPI.get('/admin/billing/organizations');
      setOrganizations(response.data);
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to load organization billing data'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadWaivers = async (organizationId = null) => {
    try {
      const params = organizationId ? { organization_id: organizationId } : {};
      const response = await baseAPI.get('/admin/billing/waivers', { params });
      setWaivers(response.data);
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to load fee waivers'
      });
    }
  };

  const loadBillingEvents = async (organizationId) => {
    try {
      const response = await baseAPI.get(`/admin/billing/events/${organizationId}`);
      setBillingEvents(response.data);
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to load billing events'
      });
    }
  };

  const createWaiver = async (values) => {
    try {
      await baseAPI.post('/admin/billing/waivers', {
        ...values,
        amount: values.amount * 100 // Convert to cents
      });
      
      notification.success({
        message: 'Success',
        description: 'Fee waiver created successfully'
      });
      
      setWaiverModalVisible(false);
      waiverForm.resetFields();
      loadWaivers();
      loadOrganizations();
    } catch (error) {
      notification.error({
        message: 'Error',
        description: error.response?.data?.detail || 'Failed to create fee waiver'
      });
    }
  };

  const applyAdjustment = async (values) => {
    try {
      await baseAPI.post('/admin/billing/adjustments', {
        ...values,
        amount: values.amount * 100 // Convert to cents
      });
      
      notification.success({
        message: 'Success',
        description: 'Fee adjustment applied successfully'
      });
      
      setAdjustmentModalVisible(false);
      adjustmentForm.resetFields();
      loadWaivers();
      loadOrganizations();
    } catch (error) {
      notification.error({
        message: 'Error',
        description: error.response?.data?.detail || 'Failed to apply fee adjustment'
      });
    }
  };

  const testCalculation = async (values) => {
    try {
      const formData = new FormData();
      Object.keys(values).forEach(key => {
        formData.append(key, values[key]);
      });
      
      const response = await baseAPI.post('/admin/billing/test-calculation', formData);
      
      Modal.info({
        title: 'Fee Calculation Result',
        width: 800,
        content: (
          <div>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Organization">
                {response.data.organization.name}
              </Descriptions.Item>
              <Descriptions.Item label="Annual Fee">
                ${(response.data.fees.annual_organization.amount / 100).toFixed(2)}
                {response.data.fees.annual_organization.waiver_applied && (
                  <Tag color="green" style={{ marginLeft: 8 }}>Waiver Applied</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Onboarding Fee">
                ${(response.data.fees.project_onboarding.amount / 100).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="Issuance Fee">
                ${(response.data.fees.issuance.amount / 100).toFixed(2)}
                ({response.data.fees.issuance.mwh} MWh)
              </Descriptions.Item>
              <Descriptions.Item label="Transfer Fee">
                ${(response.data.fees.transfer.amount / 100).toFixed(2)}
                ({response.data.fees.transfer.gc_count} GCs)
              </Descriptions.Item>
              <Descriptions.Item label="Retirement Fee">
                ${(response.data.fees.retirement.amount / 100).toFixed(2)}
                ({response.data.fees.retirement.gc_count} GCs)
              </Descriptions.Item>
              <Descriptions.Item label="Total Estimated">
                <strong>${(response.data.total_estimated / 100).toFixed(2)}</strong>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )
      });
    } catch (error) {
      notification.error({
        message: 'Error',
        description: error.response?.data?.detail || 'Failed to calculate fees'
      });
    }
  };

  const updateWaiverStatus = async (waiverId, newStatus, reason) => {
    try {
      const formData = new FormData();
      formData.append('new_status', newStatus);
      formData.append('reason', reason);
      
      await baseAPI.patch(`/admin/billing/waivers/${waiverId}/status`, formData);
      
      notification.success({
        message: 'Success',
        description: 'Waiver status updated successfully'
      });
      
      loadWaivers();
    } catch (error) {
      notification.error({
        message: 'Error',
        description: error.response?.data?.detail || 'Failed to update waiver status'
      });
    }
  };

  // Column definitions
  const organizationColumns = [
    {
      title: 'Organization',
      dataIndex: 'organization_name',
      key: 'organization_name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            ID: {record.organization_id}
          </div>
        </div>
      )
    },
    {
      title: 'Billing Status',
      dataIndex: 'billing_status',
      key: 'billing_status',
      render: (status) => {
        const color = {
          'active': 'green',
          'inactive': 'red',
          'not_setup': 'orange'
        }[status] || 'default';
        return <Tag color={color}>{status.replace('_', ' ').toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Annual Fee Due',
      dataIndex: 'annual_fee_due_date',
      key: 'annual_fee_due_date',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A'
    },
    {
      title: 'Payment Failures',
      dataIndex: 'payment_failure_count',
      key: 'payment_failure_count',
      render: (count) => count > 0 ? <Tag color="red">{count}</Tag> : <Tag color="green">0</Tag>
    },
    {
      title: 'Total Waivers',
      dataIndex: 'total_waivers_amount',
      key: 'total_waivers_amount',
      render: (amount) => `$${(amount / 100).toFixed(2)}`
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<ExceptionOutlined />}
            onClick={() => {
              setSelectedOrg(record);
              setWaiverModalVisible(true);
              waiverForm.setFieldsValue({ organization_id: record.organization_id });
            }}
          >
            Create Waiver
          </Button>
          <Button
            size="small"
            icon={<AuditOutlined />}
            onClick={() => {
              setSelectedOrg(record);
              loadBillingEvents(record.organization_id);
            }}
          >
            View Events
          </Button>
        </Space>
      )
    }
  ];

  const waiverColumns = [
    {
      title: 'Organization',
      dataIndex: 'organization_name',
      key: 'organization_name'
    },
    {
      title: 'Fee Type',
      dataIndex: 'fee_type',
      key: 'fee_type',
      render: (type) => type.replace('_', ' ').toUpperCase()
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `$${(amount / 100).toFixed(2)}`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const color = {
          'ACTIVE': 'green',
          'EXPIRED': 'orange',
          'USED': 'blue',
          'CANCELLED': 'red'
        }[status] || 'default';
        return <Tag color={color}>{status}</Tag>;
      }
    },
    {
      title: 'Created By',
      dataIndex: 'created_by_name',
      key: 'created_by_name'
    },
    {
      title: 'Expires',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'Never'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'ACTIVE' && (
            <Popconfirm
              title="Cancel this waiver?"
              onConfirm={() => updateWaiverStatus(record.id, 'CANCELLED', 'Cancelled by admin')}
            >
              <Button size="small" danger>Cancel</Button>
            </Popconfirm>
          )}
          {record.status === 'ACTIVE' && (
            <Popconfirm
              title="Mark this waiver as used?"
              onConfirm={() => updateWaiverStatus(record.id, 'USED', 'Marked as used by admin')}
            >
              <Button size="small" type="primary">Mark Used</Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Organizations"
              value={organizations.length}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Waivers"
              value={waivers.filter(w => w.status === 'ACTIVE').length}
              prefix={<ExceptionOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Waiver Amount"
              value={waivers.reduce((sum, w) => sum + (w.status === 'ACTIVE' ? w.amount : 0), 0) / 100}
              prefix="$"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Payment Failures"
              value={organizations.reduce((sum, org) => sum + org.payment_failure_count, 0)}
              prefix={<ExceptionOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setWaiverModalVisible(true)}
          >
            Create Fee Waiver
          </Button>
        </Col>
        <Col>
          <Button
            icon={<EditOutlined />}
            onClick={() => setAdjustmentModalVisible(true)}
          >
            Apply Fee Adjustment
          </Button>
        </Col>
        <Col>
          <Button
            icon={<CalculatorOutlined />}
            onClick={() => setCalculatorModalVisible(true)}
          >
            Fee Calculator
          </Button>
        </Col>
      </Row>

      <Tabs defaultActiveKey="organizations">
        <TabPane tab="Organization Billing" key="organizations">
          <Table
            columns={organizationColumns}
            dataSource={organizations}
            rowKey="organization_id"
            loading={loading}
            scroll={{ x: 1200 }}
          />
        </TabPane>
        
        <TabPane tab="Fee Waivers" key="waivers">
          <Table
            columns={waiverColumns}
            dataSource={waivers}
            rowKey="id"
            scroll={{ x: 1000 }}
          />
        </TabPane>
        
        <TabPane tab="Billing Events" key="events">
          {selectedOrg && (
            <Card title={`Billing Events - ${selectedOrg.organization_name}`}>
              <Table
                dataSource={billingEvents}
                rowKey="id"
                columns={[
                  {
                    title: 'Event Type',
                    dataIndex: 'event_type',
                    key: 'event_type'
                  },
                  {
                    title: 'Amount',
                    dataIndex: 'amount_cents',
                    key: 'amount_cents',
                    render: (amount) => amount ? `$${(amount / 100).toFixed(2)}` : 'N/A'
                  },
                  {
                    title: 'Description',
                    dataIndex: 'description',
                    key: 'description'
                  },
                  {
                    title: 'Date',
                    dataIndex: 'created_at',
                    key: 'created_at',
                    render: (date) => new Date(date).toLocaleString()
                  }
                ]}
              />
            </Card>
          )}
        </TabPane>
      </Tabs>

      {/* Fee Waiver Modal */}
      <Modal
        title="Create Fee Waiver"
        visible={waiverModalVisible}
        onCancel={() => setWaiverModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={waiverForm}
          layout="vertical"
          onFinish={createWaiver}
        >
          <Form.Item
            name="organization_id"
            label="Organization"
            rules={[{ required: true, message: 'Please select an organization' }]}
          >
            <Select placeholder="Select organization">
              {organizations.map(org => (
                <Option key={org.organization_id} value={org.organization_id}>
                  {org.organization_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="fee_type"
            label="Fee Type"
            rules={[{ required: true, message: 'Please select a fee type' }]}
          >
            <Select placeholder="Select fee type">
              <Option value="annual_organization">Annual Organization Fee</Option>
              <Option value="project_onboarding">Project Onboarding Fee</Option>
              <Option value="issuance">Issuance Fee</Option>
              <Option value="transfer">Transfer Fee</Option>
              <Option value="retirement">Retirement Fee</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount (USD)"
            rules={[{ required: true, message: 'Please enter an amount' }]}
          >
            <InputNumber
              min={0}
              max={10000}
              precision={2}
              style={{ width: '100%' }}
              placeholder="Enter amount in USD"
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Please provide a reason' }]}
          >
            <TextArea
              rows={3}
              placeholder="Explain why this waiver is being granted"
            />
          </Form.Item>

          <Form.Item name="expires_at" label="Expiration Date (Optional)">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Create Waiver
              </Button>
              <Button onClick={() => setWaiverModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Fee Adjustment Modal */}
      <Modal
        title="Apply Fee Adjustment"
        visible={adjustmentModalVisible}
        onCancel={() => setAdjustmentModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={adjustmentForm}
          layout="vertical"
          onFinish={applyAdjustment}
        >
          <Form.Item
            name="organization_id"
            label="Organization"
            rules={[{ required: true, message: 'Please select an organization' }]}
          >
            <Select placeholder="Select organization">
              {organizations.map(org => (
                <Option key={org.organization_id} value={org.organization_id}>
                  {org.organization_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="adjustment_type"
            label="Adjustment Type"
            rules={[{ required: true, message: 'Please select adjustment type' }]}
          >
            <Select placeholder="Select adjustment type">
              <Option value="waiver">Waiver</Option>
              <Option value="discount">Discount</Option>
              <Option value="credit">Credit</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="fee_types"
            label="Fee Types"
            rules={[{ required: true, message: 'Please select fee types' }]}
          >
            <Select mode="multiple" placeholder="Select fee types to adjust">
              <Option value="annual_organization">Annual Organization Fee</Option>
              <Option value="project_onboarding">Project Onboarding Fee</Option>
              <Option value="issuance">Issuance Fee</Option>
              <Option value="transfer">Transfer Fee</Option>
              <Option value="retirement">Retirement Fee</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount (USD)"
            rules={[{ required: true, message: 'Please enter an amount' }]}
          >
            <InputNumber
              min={0}
              max={10000}
              precision={2}
              style={{ width: '100%' }}
              placeholder="Enter adjustment amount in USD"
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Please provide a reason' }]}
          >
            <TextArea
              rows={3}
              placeholder="Explain why this adjustment is being applied"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Apply Adjustment
              </Button>
              <Button onClick={() => setAdjustmentModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Fee Calculator Modal */}
      <Modal
        title="Fee Calculator"
        visible={calculatorModalVisible}
        onCancel={() => setCalculatorModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={calculatorForm}
          layout="vertical"
          onFinish={testCalculation}
        >
          <Form.Item
            name="organization_id"
            label="Organization"
            rules={[{ required: true, message: 'Please select an organization' }]}
          >
            <Select placeholder="Select organization">
              {organizations.map(org => (
                <Option key={org.organization_id} value={org.organization_id}>
                  {org.organization_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="mwh_amount"
            label="MWh Amount"
            initialValue={100}
          >
            <InputNumber
              min={0}
              max={10000}
              precision={2}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="gc_count"
            label="GC Count"
            initialValue={100}
          >
            <InputNumber
              min={0}
              max={10000}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Calculate Fees
              </Button>
              <Button onClick={() => setCalculatorModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FeeManagement; 
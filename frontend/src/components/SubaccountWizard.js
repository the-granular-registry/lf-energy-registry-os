import React, { useState, useRef } from 'react';
import { Modal, Form, Input, Upload, Button, message, Progress, Table, Space, Tag, Steps, Tabs, InputNumber, Divider } from 'antd';
import { UploadOutlined, CheckCircleOutlined, CloseCircleOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { createSubaccounts } from '../store/subaccount/subaccountThunk';

const { TabPane } = Tabs;

const SubaccountWizard = ({ visible, onCancel, accountId, accountName }) => {
  const [form] = Form.useForm();
  const [quickForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('quick');
  const [currentStep, setCurrentStep] = useState(0);
  const [csvData, setCsvData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef();

  const dispatch = useDispatch();

  const steps = [
    { title: 'Upload CSV', description: 'Upload customer allocation schedule' },
    { title: 'Review Data', description: 'Verify customer information' },
    { title: 'Create Subaccounts', description: 'Generate subaccounts and invitation links' },
  ];

  const handleCsvUpload = (file) => {
    setUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        // Expected headers: name,email,share
        const expectedHeaders = ['name', 'email', 'share'];
        const headerMatch = expectedHeaders.every(h => headers.includes(h));

        if (!headerMatch) {
          message.error('CSV must contain columns: name,email,share');
          setUploading(false);
          return;
        }

        const data = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = line.split(',').map(v => v.trim());
          if (values.length >= 3) {
            data.push({
              name: values[0],
              email: values[1],
              share: parseFloat(values[2]) || 0,
              key: i,
            });
          }
        }

        setCsvData(data);
        setUploading(false);
        message.success(`Loaded ${data.length} customers`);
      } catch (error) {
        message.error('Error parsing CSV file');
        setUploading(false);
      }
    };
    reader.readAsText(file);
    return false; // Prevent default upload behavior
  };

  const validateCsvData = () => {
    const errors = [];

    csvData.forEach((row, index) => {
      if (!row.name) errors.push(`Row ${index + 1}: Missing name`);
      if (!row.email || !row.email.includes('@')) errors.push(`Row ${index + 1}: Invalid email`);
      if (row.share <= 0 || row.share > 1) errors.push(`Row ${index + 1}: Share must be between 0 and 1`);
    });

    // Note: We no longer require total share to equal 100% (opt-in model)

    if (errors.length > 0) {
      message.error('Validation errors: ' + errors.join('; '));
      return false;
    }

    return true;
  };

  const handleQuickCreate = async (values) => {
    console.log('🚀 handleQuickCreate called with values:', values);
    console.log('📦 Account ID:', accountId);
    
    setCreating(true);
    try {
      const payload = {
        parentAccountId: accountId,
        subaccounts: [{
          name: values.name,
          email: values.email || `${values.name.toLowerCase().replace(/\s+/g, '.')}@customer.example.com`,
          share: values.share / 100, // Convert percentage to decimal
        }]
      };
      
      console.log('📤 Dispatching createSubaccounts with payload:', payload);
      
      const result = await dispatch(createSubaccounts(payload)).unwrap();

      console.log('✅ Success! Result:', result);
      
      // Success - result is the API response data
      message.success(`Subaccount "${values.name}" created successfully!`);
      quickForm.resetFields();
      
      // Refresh parent component if needed
      if (typeof onCancel === 'function') {
        onCancel(true); // Pass true to indicate success
      }
    } catch (error) {
      console.error('❌ Error creating subaccount:', error);
      message.error(error?.detail || error?.message || 'Failed to create subaccount');
    } finally {
      console.log('🏁 Setting creating to false');
      setCreating(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 0 && csvData.length === 0) {
      message.error('Please upload a CSV file first');
      return;
    }

    if (currentStep === 1 && !validateCsvData()) {
      return;
    }

    if (currentStep === 2) {
      handleCreateSubaccounts();
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleCreateSubaccounts = async () => {
    setCreating(true);
    try {
      const result = await dispatch(createSubaccounts({
        parentAccountId: accountId,
        subaccounts: csvData.map(row => ({
          name: row.name,
          email: row.email,
          share: row.share,
        }))
      }));

      if (result.payload?.success) {
        message.success('Subaccounts created successfully!');
        onCancel();
      } else {
        message.error('Failed to create subaccounts');
      }
    } catch (error) {
      message.error('Error creating subaccounts');
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Share',
      dataIndex: 'share',
      key: 'share',
      render: (share) => `${(share * 100).toFixed(1)}%`,
    },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div>
            <p>Upload a CSV file with customer allocation data.</p>
            <p><strong>CSV Format:</strong></p>
            <pre>
              name,email,share
              Acme Manufacturing,contact@acme.com,0.1
              Riverside Hospital,billing@riverside.com,0.1
            </pre>

            <Upload
              accept=".csv"
              beforeUpload={handleCsvUpload}
              showUploadList={false}
            >
              <Button
                icon={<UploadOutlined />}
                loading={uploading}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Select CSV File'}
              </Button>
            </Upload>

            {csvData.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p>✅ Loaded {csvData.length} customers</p>
              </div>
            )}
          </div>
        );

      case 1:
        return (
          <div>
            <p>Review the customer data before creating subaccounts.</p>
            <Table
              dataSource={csvData}
              columns={columns}
              pagination={false}
              size="small"
              scroll={{ y: 300 }}
            />
          </div>
        );

      case 2:
        return (
          <div>
            <p>Ready to create subaccounts. This will:</p>
            <ul>
              <li>Create {csvData.length} subaccounts under "{accountName}"</li>
              <li>Generate invitation links for each customer</li>
              <li>Send email invitations to customers</li>
            </ul>

            {creating && (
              <div style={{ marginTop: 16 }}>
                <Progress percent={50} status="active" />
                <p>Creating subaccounts...</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderQuickCreateTab = () => (
    <div>
      <p style={{ marginBottom: 16 }}>
        Create a single subaccount for a customer. Customers can opt-in incrementally—shares don't need to total 100%.
      </p>
      <Form
        form={quickForm}
        layout="vertical"
        onFinish={handleQuickCreate}
      >
        <Form.Item
          label="Customer Name"
          name="name"
          rules={[{ required: true, message: 'Please enter customer name' }]}
        >
          <Input 
            placeholder="e.g., Acme Manufacturing"
            prefix={<UserOutlined />}
          />
        </Form.Item>

        <Form.Item
          label="Email Address (Optional)"
          name="email"
          rules={[
            { type: 'email', message: 'Please enter a valid email' }
          ]}
        >
          <Input 
            placeholder="customer@example.com (optional - for email invitations)"
          />
        </Form.Item>

        <Form.Item
          label="Allocation Share (%)"
          name="share"
          rules={[
            { required: true, message: 'Please enter share percentage' },
            { type: 'number', min: 0.01, max: 100, message: 'Share must be between 0.01% and 100%' }
          ]}
          tooltip="Percentage of parent account energy this customer should receive"
        >
          <InputNumber
            min={0.01}
            max={100}
            step={0.1}
            precision={2}
            placeholder="e.g., 10.5"
            style={{ width: '100%' }}
            addonAfter="%"
          />
        </Form.Item>

        <Form.Item style={{ marginTop: 24 }}>
          <Space>
            <Button onClick={onCancel}>Cancel</Button>
            <Button 
              type="primary" 
              htmlType="submit"
              loading={creating}
              icon={<PlusOutlined />}
            >
              Create Subaccount
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <Divider />

      <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <strong>💡 Opt-In Enrollment Model</strong>
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#666' }}>
          Shares don't need to total 100%. Add customers as they opt-in to the program. 
          Example: First customer 10%, second customer 15%, third 8%, etc.
        </p>
      </div>
    </div>
  );

  const renderBulkUploadTab = () => (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Steps current={currentStep} size="small">
          {steps.map((step, index) => (
            <Steps.Step
              key={index}
              title={step.title}
              description={step.description}
            />
          ))}
        </Steps>
      </div>

      <div style={{ minHeight: 200 }}>
        {renderStepContent()}
      </div>

      <div style={{ marginTop: 24 }}>
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          {currentStep > 0 && <Button onClick={handlePrev}>Previous</Button>}
          <Button
            type="primary"
            onClick={handleNext}
            loading={creating}
            disabled={creating}
          >
            {currentStep === steps.length - 1 ? 'Create Subaccounts' : 'Next'}
          </Button>
        </Space>
      </div>
    </div>
  );

  return (
    <Modal
      title={`Create Subaccounts for ${accountName}`}
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={null}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Quick Create" key="quick">
          {renderQuickCreateTab()}
        </TabPane>
        <TabPane tab="Bulk Upload (CSV)" key="bulk">
          {renderBulkUploadTab()}
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default SubaccountWizard;

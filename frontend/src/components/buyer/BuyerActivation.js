import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Alert, Descriptions, Divider } from 'antd';
import { CreditCardOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import axios from 'axios';

const BuyerActivation = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activationResult, setActivationResult] = useState(null);
  const [error, setError] = useState(null);
  
  const currentUser = useSelector(state => state.user.userInfo);
  const currentAccount = useSelector(state => state.account.currentAccount);

  const handleActivation = async (values) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/v1/buyer/activate', {
        organization_id: currentAccount?.detail?.organization_id || 1,
        contact_email: values.contact_email,
        billing_address: {
          street: values.street,
          city: values.city,
          state: values.state,
          zip: values.zip
        }
      });
      
      setActivationResult(response.data);
      message.success('Buyer account successfully activated!');
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Activation failed');
      message.error('Failed to activate buyer account');
    } finally {
      setLoading(false);
    }
  };

  if (activationResult) {
    return (
      <Card 
        title={
          <span>
            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
            Buyer Account Activated
          </span>
        }
        style={{ maxWidth: 800, margin: '0 auto' }}
      >
        <Alert
          message="Account Successfully Activated"
          description="Your buyer account is now active and ready for GC transfers and retirements."
          type="success"
          showIcon
          style={{ marginBottom: 24 }}
        />
        
        <Descriptions title="Activation Details" bordered column={1}>
          <Descriptions.Item label="Status">
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
              {activationResult.status.toUpperCase()}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Customer ID">
            {activationResult.customer_id}
          </Descriptions.Item>
          <Descriptions.Item label="Subscription ID">
            {activationResult.subscription_id}
          </Descriptions.Item>
          <Descriptions.Item label="Annual Fee">
            ${(activationResult.annual_fee / 100).toFixed(2)} USD
          </Descriptions.Item>
          <Descriptions.Item label="Next Steps">
            <div>
              <p>• You can now transfer GCs between accounts</p>
              <p>• Retirement of GCs is enabled</p>
              <p>• Annual billing will be processed automatically</p>
            </div>
          </Descriptions.Item>
        </Descriptions>
        
        <Divider />
        
        <div style={{ textAlign: 'center' }}>
          <Button 
            type="primary" 
            size="large"
            onClick={() => window.location.href = '/certificates'}
          >
            Go to Certificate Management
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <span>
          <CreditCardOutlined style={{ marginRight: 8 }} />
          Activate Buyer Account
        </span>
      }
      style={{ maxWidth: 600, margin: '0 auto' }}
    >
      <Alert
        message="Buyer Account Activation"
        description="Activate your account to enable GC transfers and retirements. Annual fee: $2,000/year"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />
      
      {error && (
        <Alert
          message="Activation Error"
          description={error}
          type="error"
          closable
          style={{ marginBottom: 24 }}
        />
      )}
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleActivation}
        disabled={loading}
      >
        <Form.Item
          name="contact_email"
          label="Primary Contact Email"
          rules={[
            { required: true, message: 'Please enter contact email' },
            { type: 'email', message: 'Please enter a valid email' }
          ]}
          initialValue={currentUser?.email}
        >
          <Input placeholder="billing@company.com" />
        </Form.Item>
        
        <Divider orientation="left">Billing Address</Divider>
        
        <Form.Item
          name="street"
          label="Street Address"
          rules={[{ required: true, message: 'Please enter street address' }]}
        >
          <Input placeholder="123 Main Street" />
        </Form.Item>
        
        <Form.Item
          name="city"
          label="City"
          rules={[{ required: true, message: 'Please enter city' }]}
        >
          <Input placeholder="San Francisco" />
        </Form.Item>
        
        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item
            name="state"
            label="State"
            rules={[{ required: true, message: 'Please enter state' }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="CA" />
          </Form.Item>
          
          <Form.Item
            name="zip"
            label="ZIP Code"
            rules={[{ required: true, message: 'Please enter ZIP code' }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="94105" />
          </Form.Item>
        </div>
        
        <Divider />
        
        <div style={{ textAlign: 'center' }}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
            icon={loading ? <LoadingOutlined /> : <CreditCardOutlined />}
            style={{ minWidth: 200 }}
          >
            {loading ? 'Activating Account...' : 'Activate Buyer Account'}
          </Button>
        </div>
        
        <div style={{ marginTop: 16, textAlign: 'center', color: '#666' }}>
          <small>
            By activating, you agree to the annual fee of $2,000 USD.<br />
            Billing will begin immediately and renew annually.
          </small>
        </div>
      </Form>
    </Card>
  );
};

export default BuyerActivation; 
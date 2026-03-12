import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Result, Alert } from 'antd';
import { CheckCircleOutlined, LoginOutlined } from '@ant-design/icons';
import Cookies from 'js-cookie';
import { claimSubaccount } from '../store/subaccount/subaccountThunk';

const SubaccountClaimPage = () => {
  const [form] = Form.useForm();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [subaccountName, setSubaccountName] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Check if user is authenticated
  useEffect(() => {
    const token = Cookies.get('access_token');
    setIsAuthenticated(!!token);
  }, []);

  // Read token and subaccount ID from URL parameters
  useEffect(() => {
    const token = searchParams.get('token');
    const subacctId = searchParams.get('subacct');
    
    if (token) {
      // Auto-fill the form with the token from URL
      form.setFieldsValue({ invitationToken: token });
      
      // Store subaccount ID for later use if needed
      if (subacctId) {
        localStorage.setItem('claiming_subacct_id', subacctId);
      }
    }
  }, [searchParams, form]);

  // Handle login redirect
  const handleLoginRedirect = () => {
    // Save current URL to return after login
    const currentUrl = window.location.pathname + window.location.search;
    localStorage.setItem('redirect_after_login', currentUrl);
    navigate('/login');
  };

  const handleClaim = async (values) => {
    setClaiming(true);
    try {
      const result = await dispatch(claimSubaccount(values.invitationToken));

      if (result.payload?.success) {
        setSubaccountName(result.payload?.message || 'your subaccount');
        setClaimed(true);
        message.success('Subaccount claimed successfully!');
        // Clean up stored subaccount ID
        localStorage.removeItem('claiming_subacct_id');
      } else {
        message.error('Failed to claim subaccount');
      }
    } catch (error) {
      const errorMsg = error?.error?.detail || error?.message || 'Invalid invitation token or subaccount already claimed';
      message.error(errorMsg);
    } finally {
      setClaiming(false);
    }
  };

  if (claimed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
        <Result
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          title="Subaccount Claimed Successfully!"
          subTitle={
            <div>
              <p>{subaccountName}</p>
              <p>You now have access to your allocated Granular Certificates.</p>
              <p>Please log in to view your virtual account and certificate allocations.</p>
            </div>
          }
          extra={[
            <Button key="login" type="primary" onClick={() => navigate('/login')}>
              Log In
            </Button>,
            <Button key="home" onClick={() => navigate('/home')}>
              Go to Home
            </Button>
          ]}
        />
      </div>
    );
  }

  const tokenFromUrl = searchParams.get('token');

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 24, background: '#f0f2f5' }}>
        <Card 
          title="Authentication Required" 
          style={{ maxWidth: 500, width: '100%' }}
        >
          <Alert
            message="Please Log In"
            description="You must be logged in to claim a subaccount. If you don't have an account yet, please create one first."
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
            icon={<LoginOutlined />}
          />

          <p style={{ marginBottom: 24 }}>
            After logging in, you'll be redirected back to this page to complete the claiming process.
          </p>

          <div style={{ display: 'flex', gap: 16 }}>
            <Button 
              type="primary" 
              icon={<LoginOutlined />}
              onClick={handleLoginRedirect}
              size="large"
              block
            >
              Log In
            </Button>
            <Button 
              onClick={() => {
                const currentUrl = window.location.pathname + window.location.search;
                localStorage.setItem('redirect_after_login', currentUrl);
                navigate('/register');
              }}
              size="large"
              block
            >
              Create Account
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 24, background: '#f0f2f5' }}>
      <Card 
        title="Claim Your Subaccount" 
        style={{ maxWidth: 500, width: '100%' }}
        extra={
          <Button type="link" onClick={() => navigate('/certificates')}>
            Go to Dashboard
          </Button>
        }
      >
        {tokenFromUrl && (
          <Alert
            message="Invitation Token Detected"
            description="Your invitation token has been automatically filled. Click 'Claim Subaccount' to proceed."
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <p style={{ marginBottom: 24 }}>
          Enter the invitation token you received from your utility company to claim your subaccount 
          and access your allocated Granular Certificates.
        </p>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleClaim}
        >
          <Form.Item
            name="invitationToken"
            label="Invitation Token"
            rules={[
              { required: true, message: 'Please enter your invitation token' },
              { min: 36, message: 'Token must be at least 36 characters' }
            ]}
          >
            <Input.TextArea 
              placeholder="Enter invitation token..." 
              rows={3}
              disabled={claiming}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={claiming}
              block
              size="large"
            >
              {claiming ? 'Claiming...' : 'Claim Subaccount'}
            </Button>
          </Form.Item>
        </Form>

        <Alert
          message="What happens next?"
          description="After claiming, you'll need to log in with your utility account credentials to view your virtual GC allocations."
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Card>
    </div>
  );
};

export default SubaccountClaimPage;

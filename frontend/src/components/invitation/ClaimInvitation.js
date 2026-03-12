import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Steps, 
  Form, 
  Input, 
  Button, 
  Alert, 
  Spin, 
  Result, 
  Row, 
  Col, 
  Typography, 
  Divider, 
  Space,
  message,
  Checkbox
} from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  LockOutlined,
  SafetyOutlined,
  CreditCardOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  validateInvitationTokenAPI,
  getOrganisationDraftDetailsAPI,
  claimInvitationAPI,
  initiatePaymentAPI,
  getPaymentStatusAPI,
  verify2FAAPI
} from '../../api/invitationAPI';
import { logger } from '../../utils';

const { Step } = Steps;
const { Title, Text, Paragraph } = Typography;
const { Password } = Input;

const ClaimInvitation = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [invitationData, setInvitationData] = useState(null);
  const [organisationData, setOrganisationData] = useState(null);
  const [error, setError] = useState(null);
  const [claimResult, setClaimResult] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  
  const [validationForm] = Form.useForm();
  const [claimForm] = Form.useForm();
  const [verificationForm] = Form.useForm();

  useEffect(() => {
    if (token) {
      validateInvitation();
    }
  }, [token]);

  const validateInvitation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const validation = await validateInvitationTokenAPI(token);
      
      if (!validation.is_valid) {
        setError({
          type: 'error',
          message: 'Invalid Invitation',
          description: validation.reason === 'expired' 
            ? 'This invitation has expired. Please contact the administrator for a new invitation.'
            : validation.reason === 'already_claimed'
            ? 'This invitation has already been claimed.'
            : 'Invalid invitation token. Please check the link and try again.'
        });
        return;
      }
      
      setInvitationData(validation);
      
      // Fetch organisation details
      const orgDetails = await getOrganisationDraftDetailsAPI(token);
      setOrganisationData(orgDetails);
      
      setCurrentStep(1);
    } catch (error) {
      setError({
        type: 'error',
        message: 'Validation Failed',
        description: 'Unable to validate invitation. Please check the link and try again.'
      });
      logger.error('Error validating invitation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (values) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await claimInvitationAPI(token, values);
      setClaimResult(result);
      
      if (result.requires_2fa) {
        setCurrentStep(2);
        message.success('Account created! Please verify your phone number.');
      } else {
        setCurrentStep(3);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to claim invitation';
      setError({
        type: 'error',
        message: 'Claim Failed',
        description: errorMessage
      });
      logger.error('Error claiming invitation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (values) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await verify2FAAPI(token, values);
      
      if (result.success) {
        setCurrentStep(3);
        message.success('Verification successful! Please proceed with payment.');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Verification failed';
      setError({
        type: 'error',
        message: 'Verification Failed',
        description: errorMessage
      });
      logger.error('Error verifying 2FA:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const paymentData = {
        payment_method: 'stripe',
        currency: 'USD'
      };
      
      const result = await initiatePaymentAPI(token, paymentData);
      setPaymentResult(result);
      
      // In a real implementation, you would redirect to Stripe
      // For now, we'll simulate the payment completion
      setCurrentStep(4);
      message.success('Payment initiated! Redirecting to payment processor...');
      
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Payment initiation failed';
      setError({
        type: 'error',
        message: 'Payment Failed',
        description: errorMessage
      });
      logger.error('Error initiating payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'Validate',
      icon: <SafetyOutlined />,
      description: 'Validating invitation'
    },
    {
      title: 'Claim',
      icon: <UserOutlined />,
      description: 'Create your account'
    },
    {
      title: 'Verify',
      icon: <PhoneOutlined />,
      description: 'Verify your identity'
    },
    {
      title: 'Payment',
      icon: <CreditCardOutlined />,
      description: 'Complete payment'
    },
    {
      title: 'Complete',
      icon: <CheckCircleOutlined />,
      description: 'Setup complete'
    }
  ];

  const renderValidationStep = () => (
    <Card>
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>Validating your invitation...</Text>
        </div>
      </div>
    </Card>
  );

  const renderClaimStep = () => (
    <Card title="Create Your Account">
      {organisationData && (
        <div style={{ marginBottom: 24 }}>
          <Alert
            message={`You're being invited to join ${organisationData.organisation_name}`}
            description={
              <div>
                <p><strong>Project ID:</strong> {organisationData.project_id}</p>
                <p><strong>Contact:</strong> {organisationData.contact_email}</p>
                <p><strong>Estimated Fees:</strong> ${parseFloat(organisationData.estimated_fees || 0).toLocaleString()}</p>
              </div>
            }
            type="info"
            showIcon
          />
        </div>
      )}
      
      <Form
        form={claimForm}
        layout="vertical"
        onFinish={handleClaim}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="first_name"
              label="First Name"
              rules={[{ required: true, message: 'Please enter your first name' }]}
            >
              <Input prefix={<UserOutlined />} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="last_name"
              label="Last Name"
              rules={[{ required: true, message: 'Please enter your last name' }]}
            >
              <Input prefix={<UserOutlined />} />
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Please enter a valid email' }
          ]}
          initialValue={invitationData?.organisation_draft?.primary_contact_email}
        >
          <Input prefix={<MailOutlined />} />
        </Form.Item>
        
        <Form.Item
          name="phone"
          label="Phone Number"
          rules={[{ required: true, message: 'Please enter your phone number' }]}
        >
          <Input prefix={<PhoneOutlined />} placeholder="+1234567890" />
        </Form.Item>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: 'Please enter your password' },
                { min: 8, message: 'Password must be at least 8 characters' },
                {
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                  message: 'Password must contain uppercase, lowercase, number and special character'
                }
              ]}
            >
              <Password prefix={<LockOutlined />} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="confirm_password"
              label="Confirm Password"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Password prefix={<LockOutlined />} />
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item
          name="agree_to_terms"
          valuePropName="checked"
          rules={[
            { required: true, message: 'You must agree to the terms and conditions' }
          ]}
        >
          <Checkbox>
            I agree to the <a href="/terms" target="_blank">Terms and Conditions</a> and <a href="/privacy" target="_blank">Privacy Policy</a>
          </Checkbox>
        </Form.Item>
        
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} size="large" block>
            Create Account
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );

  const renderVerificationStep = () => (
    <Card title="Verify Your Identity">
      <Alert
        message="SMS Verification Required"
        description={`We've sent a verification code to your phone. Please enter the code below to continue.`}
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />
      
      <Form
        form={verificationForm}
        layout="vertical"
        onFinish={handleVerification}
      >
        <Form.Item
          name="otp_code"
          label="Verification Code"
          rules={[
            { required: true, message: 'Please enter the verification code' },
            { len: 6, message: 'Verification code must be 6 digits' }
          ]}
        >
          <Input 
            placeholder="123456" 
            maxLength={6}
            style={{ fontSize: '18px', textAlign: 'center' }}
          />
        </Form.Item>
        
        <Form.Item>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button type="primary" htmlType="submit" loading={loading} size="large" block>
              Verify Code
            </Button>
            <Button type="link" size="small" block>
              Resend Code
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );

  const renderPaymentStep = () => (
    <Card title="Complete Payment">
      {organisationData && (
        <div style={{ marginBottom: 24 }}>
          <Alert
            message="Payment Required"
            description="Please complete the payment to activate your organisation account."
            type="warning"
            showIcon
          />
          
          <Divider />
          
          <Row gutter={16}>
            <Col span={12}>
              <Card size="small" title="Organisation Summary">
                <p><strong>Name:</strong> {organisationData.organisation_name}</p>
                <p><strong>Project ID:</strong> {organisationData.project_id}</p>
                <p><strong>Annual MWh:</strong> {organisationData.estimated_annual_mwh?.toLocaleString() || 'N/A'}</p>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="Payment Summary">
                <p><strong>Account Fee:</strong> ${parseFloat(organisationData.account_fee || 0).toLocaleString()}</p>
                <p><strong>Onboarding Fee:</strong> ${parseFloat(organisationData.onboarding_fee || 0).toLocaleString()}</p>
                <Divider style={{ margin: '8px 0' }} />
                <p><strong>Total:</strong> ${parseFloat(organisationData.estimated_fees || 0).toLocaleString()}</p>
              </Card>
            </Col>
          </Row>
        </div>
      )}
      
      <div style={{ textAlign: 'center' }}>
        <Button 
          type="primary" 
          size="large"
          icon={<CreditCardOutlined />}
          onClick={handlePayment}
          loading={loading}
        >
          Proceed to Payment
        </Button>
      </div>
    </Card>
  );

  const renderCompleteStep = () => (
    <Result
      status="success"
      title="Setup Complete!"
      subTitle="Your organisation account has been successfully created and activated. You can now start using the Granular Certificate Registry."
      extra={[
        <Button type="primary" key="dashboard" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>,
        <Button key="logout" onClick={() => navigate('/login')}>
          Logout
        </Button>
      ]}
    />
  );

  if (error) {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
        <Result
          status={error.type}
          title={error.message}
          subTitle={error.description}
          extra={[
            <Button type="primary" key="home" onClick={() => navigate('/')}>
              Go Home
            </Button>
          ]}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <Title level={2} style={{ textAlign: 'center' }}>
          Organisation Invitation
        </Title>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
          Complete your organisation setup to join the Granular Certificate Registry
        </Text>
      </div>

      <Steps current={currentStep} style={{ marginBottom: 32 }}>
        {steps.map((step, index) => (
          <Step
            key={index}
            title={step.title}
            description={step.description}
            icon={step.icon}
          />
        ))}
      </Steps>

      {currentStep === 0 && renderValidationStep()}
      {currentStep === 1 && renderClaimStep()}
      {currentStep === 2 && renderVerificationStep()}
      {currentStep === 3 && renderPaymentStep()}
      {currentStep === 4 && renderCompleteStep()}
    </div>
  );
};

export default ClaimInvitation; 
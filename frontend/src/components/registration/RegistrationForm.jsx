/**
 * RegistrationForm Component
 * Allows new users to register their organization
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Form,
  Input,
  Button,
  Select,
  Card,
  Row,
  Col,
  Typography,
  Alert,
  Progress,
  Space,
  Divider,
  notification,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  BankOutlined,
  HomeOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

import {
  resetRegistrationState,
  updateOrganizationForm,
  updateUserForm,
  updateAccountForm,
  clearFormData,
  selectRegistration,
  selectRegistrationLoading,
  selectRegistrationSuccess,
  selectRegistrationError,
  selectRegistrationErrorMessage,
  selectRegistrationData,
  selectFormData,
  selectIsFormValid,
  selectCanSubmit,
} from '../../store/registration/registrationSlice';
import { registerOrganization } from '../../store/registration/registrationThunk';

const { Title, Text } = Typography;
const { Option } = Select;

const RegistrationForm = () => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  
  // Redux selectors
  const isLoading = useSelector(selectRegistrationLoading);
  const isSuccess = useSelector(selectRegistrationSuccess);
  const isError = useSelector(selectRegistrationError);
  const errorMessage = useSelector(selectRegistrationErrorMessage);
  const registrationData = useSelector(selectRegistrationData);
  const formData = useSelector(selectFormData);
  const isFormValid = useSelector(selectIsFormValid);
  const canSubmit = useSelector(selectCanSubmit);

  // Local state for form validation
  const [validationErrors, setValidationErrors] = useState({});

  // Organization type options
  const organizationTypes = [
    { value: 'ENERGY_PRODUCER', label: 'Energy Producer' },
    { value: 'TRADER', label: 'Trader' },
    { value: 'CONSUMER', label: 'Consumer' },
  ];

  // Password strength calculation
  const calculatePasswordStrength = (password) => {
    if (!password) return { strength: 0, text: 'No password' };
    
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    
    let text = 'Weak';
    if (strength >= 75) text = 'Strong';
    else if (strength >= 50) text = 'Medium';
    
    return { strength, text };
  };

  const passwordStrength = calculatePasswordStrength(formData.user.password);

  // Form field change handlers
  const handleOrganizationChange = (field, value) => {
    dispatch(updateOrganizationForm({ [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[`organization.${field}`]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`organization.${field}`];
        return newErrors;
      });
    }
  };

  const handleUserChange = (field, value) => {
    dispatch(updateUserForm({ [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[`user.${field}`]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`user.${field}`];
        return newErrors;
      });
    }
  };

  // Suggest organizations after user email entry (placeholder hook - API wiring can be added)
  useEffect(() => {
    // When user email changes, we could call the suggest endpoint and show a select
    // This can be implemented with a dropdown if needed
  }, [formData.user.email]);

  const handleAccountChange = (field, value) => {
    dispatch(updateAccountForm({ [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[`account.${field}`]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`account.${field}`];
        return newErrors;
      });
    }
  };

  // Form validation
  const validateForm = () => {
    const errors = {};

    // Organization validation
    if (!formData.organization.name?.trim()) {
      errors['organization.name'] = 'Organization name is required';
    }

    // User validation
    if (!formData.user.name?.trim()) {
      errors['user.name'] = 'Full name is required';
    }
    if (!formData.user.email?.trim()) {
      errors['user.email'] = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.user.email)) {
      errors['user.email'] = 'Invalid email format';
    }
    if (!formData.user.password) {
      errors['user.password'] = 'Password is required';
    } else if (formData.user.password.length < 8) {
      errors['user.password'] = 'Password must be at least 8 characters long';
    }

    // Account is optional

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      notification.error({
        message: 'Validation Error',
        description: 'Please fix the errors in the form before submitting.',
      });
      return;
    }

    try {
      await dispatch(registerOrganization(formData)).unwrap();
    } catch (error) {
      // Error handling is done in the Redux slice
    }
  };

  // Reset form
  const handleReset = () => {
    dispatch(clearFormData());
    setValidationErrors({});
    form.resetFields();
  };

  // Effect to show success notification
  useEffect(() => {
    if (isSuccess && registrationData) {
      notification.success({
        message: 'Registration Successful!',
        description: `Organization "${registrationData.organization.name}" has been successfully registered. You will receive an email confirmation shortly.`,
        duration: 6,
      });
    }
  }, [isSuccess, registrationData]);

  // Success state display
  if (isSuccess && registrationData) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <CheckCircleOutlined style={{ fontSize: '64px', color: '#52c41a', marginBottom: '16px' }} />
            <Title level={2}>Registration Successful!</Title>
            <Text>
              Organization <strong>{registrationData.organization.name}</strong> successfully registered.
            </Text>
            <div style={{ marginTop: '24px' }}>
              <Button type="primary" onClick={() => dispatch(resetRegistrationState())}>
                Register Another Organization
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }} data-testid="registration-form">
      <Title level={2} style={{ textAlign: 'center', marginBottom: '32px' }}>
        Organization Registration
      </Title>

      {/* Error Alert */}
      {isError && errorMessage && (
        <Alert
          message="Registration Failed"
          description={errorMessage}
          type="error"
          showIcon
          closable
          style={{ marginBottom: '24px' }}
          onClose={() => dispatch(resetRegistrationState())}
          role="alert"
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        role="form"
        aria-label="Organization Registration Form"
      >
        {/* Organization Information */}
        <Card 
          title={
            <Space>
              <BankOutlined />
              Organization Information
            </Space>
          }
          style={{ marginBottom: '24px' }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Organization Name"
                validateStatus={validationErrors['organization.name'] ? 'error' : ''}
                help={validationErrors['organization.name']}
                required
              >
                <Input
                  placeholder="Enter organization name"
                  value={formData.organization.name}
                  onChange={(e) => handleOrganizationChange('name', e.target.value)}
                  aria-label="Organization Name"
                  status={validationErrors['organization.name'] ? 'error' : ''}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Organization Type"
                required
              >
                <Select
                  value={formData.organization.organization_type}
                  onChange={(value) => handleOrganizationChange('organization_type', value)}
                  aria-label="Organization Type"
                >
                  {organizationTypes.map(type => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Address (Optional)"
            validateStatus={validationErrors['organization.address'] ? 'error' : ''}
            help={validationErrors['organization.address']}
          >
            <Input.TextArea
              placeholder="Enter complete organization address"
              value={formData.organization.address}
              onChange={(e) => handleOrganizationChange('address', e.target.value)}
              aria-label="Address"
              rows={3}
              status={validationErrors['organization.address'] ? 'error' : ''}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Website (Optional)">
                <Input
                  prefix={<GlobalOutlined />}
                  placeholder="https://organization.com"
                  value={formData.organization.website}
                  onChange={(e) => handleOrganizationChange('website', e.target.value)}
                  aria-label="Website"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Business Registration Number (Optional)">
            <Input
              placeholder="Enter business registration number"
              value={formData.organization.business_registration_number}
              onChange={(e) => handleOrganizationChange('business_registration_number', e.target.value)}
              aria-label="Business Registration Number"
            />
          </Form.Item>
        </Card>

        {/* User Information */}
        <Card 
          title={
            <Space>
              <UserOutlined />
              User Information
            </Space>
          }
          style={{ marginBottom: '24px' }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Full Name"
                validateStatus={validationErrors['user.name'] ? 'error' : ''}
                help={validationErrors['user.name']}
                required
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Enter your full name"
                  value={formData.user.name}
                  onChange={(e) => handleUserChange('name', e.target.value)}
                  aria-label="Full Name"
                  status={validationErrors['user.name'] ? 'error' : ''}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Email Address"
                validateStatus={validationErrors['user.email'] ? 'error' : ''}
                help={validationErrors['user.email']}
                required
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="your@email.com"
                  value={formData.user.email}
                  onChange={(e) => handleUserChange('email', e.target.value)}
                  aria-label="Email Address"
                  status={validationErrors['user.email'] ? 'error' : ''}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Password"
            validateStatus={validationErrors['user.password'] ? 'error' : ''}
            help={validationErrors['user.password']}
            required
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter a secure password"
              value={formData.user.password}
              onChange={(e) => handleUserChange('password', e.target.value)}
              aria-label="Password"
              status={validationErrors['user.password'] ? 'error' : ''}
            />
            {formData.user.password && (
              <div style={{ marginTop: '8px' }}>
                <Progress
                  percent={passwordStrength.strength}
                  size="small"
                  strokeColor={
                    passwordStrength.strength >= 75 ? '#52c41a' :
                    passwordStrength.strength >= 50 ? '#faad14' : '#ff4d4f'
                  }
                  showInfo={false}
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {formData.user.password.length} characters - {passwordStrength.text}
                </Text>
              </div>
            )}
          </Form.Item>
        </Card>

        {/* Account Information */}
        <Card 
          title={
            <Space>
              <HomeOutlined />
              Account Information
            </Space>
          }
          style={{ marginBottom: '24px' }}
        >
          <Form.Item 
            label="Account Name (Optional)"
            validateStatus={validationErrors['account.name'] ? 'error' : ''}
            help={validationErrors['account.name']}
          >
            <Input
              placeholder="Enter account name (e.g., Primary Production Account)"
              value={formData.account.name}
              onChange={(e) => handleAccountChange('name', e.target.value)}
              aria-label="Account Name"
              status={validationErrors['account.name'] ? 'error' : ''}
            />
          </Form.Item>
        </Card>

        {/* Action Buttons */}
        <Card>
          <Row justify="space-between" align="middle">
            <Col>
              <Button onClick={handleReset} disabled={isLoading}>
                Clear Form
              </Button>
            </Col>
            <Col>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isLoading}
                  disabled={!canSubmit}
                  size="large"
                  icon={isLoading ? <LoadingOutlined /> : undefined}
                >
                  {isLoading ? 'Registering...' : 'Register Organization'}
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </Form>
    </div>
  );
};

export default RegistrationForm; 
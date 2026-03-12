import React, { useState } from 'react';
import { Card, Form, Input, Button, Avatar, Typography, message } from 'antd';
import { UserOutlined, MailOutlined, BankOutlined } from '@ant-design/icons';
import { useUser } from '../../context/UserContext';
import { logger } from '../../utils';
import sampleAvatar from '../../assets/images/sample-avatar.jpeg';

const { Title, Text } = Typography;

const Settings = () => {
  const { userData } = useUser();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Initialize form with current user data
  React.useEffect(() => {
    if (userData?.userInfo) {
      form.setFieldsValue({
        username: userData.userInfo.username,
        email: userData.userInfo.email,
        organisation: userData.userInfo.organisation,
      });
    }
  }, [userData, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('Profile updated successfully!');
      logger.debug('Updated profile:', values);
    } catch (error) {
      message.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!userData?.userInfo) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: '32px' }}>
        User Settings
      </Title>

      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          <Avatar 
            size={80} 
            src={sampleAvatar}
            style={{ marginRight: '16px' }}
          />
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {userData.userInfo.username}
            </Title>
            <Text type="secondary">
              {userData.userInfo.role} • {userData.userInfo.organisation}
            </Text>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: 'Please enter your username' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="Enter username"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input 
              prefix={<MailOutlined />} 
              placeholder="Enter email"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Organization"
            name="organisation"
            rules={[{ required: true, message: 'Please enter your organization' }]}
          >
            <Input 
              prefix={<BankOutlined />} 
              placeholder="Enter organization"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              size="large"
              style={{ marginRight: '12px' }}
            >
              Save Changes
            </Button>
            <Button 
              onClick={() => form.resetFields()}
              size="large"
            >
              Reset
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Account Information">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <Text strong>User ID:</Text>
            <div>{userData.userInfo.userID}</div>
          </div>
          <div>
            <Text strong>Role:</Text>
            <div>{userData.userInfo.role}</div>
          </div>
          <div>
            <Text strong>Accounts:</Text>
            <div>{userData.accounts?.length || 0} account(s)</div>
          </div>
          <div>
            <Text strong>Current Account:</Text>
            <div>{userData.accounts?.[0]?.account_name || 'N/A'}</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings; 
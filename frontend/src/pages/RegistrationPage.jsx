/**
 * RegistrationPage Component
 * Main page for organization registration
 */

import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Layout, Typography, Space, Button } from 'antd';
import { ArrowLeftOutlined, LoginOutlined } from '@ant-design/icons';

import RegistrationForm from '../components/registration/RegistrationForm';

const { Content } = Layout;
const { Title, Text } = Typography;

const RegistrationPage = () => {
  // Get authentication state
  const isAuthenticated = useSelector(state => state.auth?.user);

  // Set page title
  useEffect(() => {
    document.title = 'Register Organization - Granular Certificate Registry';
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Content style={{ padding: '24px' }} data-testid="registration-page">
        {/* Header Section */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '32px',
          paddingTop: '24px'
        }}>
          <Title level={1} style={{ color: '#1890ff', marginBottom: '8px' }}>
            Organization Registration
          </Title>
          <Text type="secondary" style={{ fontSize: '16px' }}>
            Join the Granular Certificate Registry to start tracking your energy certificates
          </Text>
        </div>

        {/* Navigation Bar */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px',
          maxWidth: '800px',
          margin: '0 auto 24px auto'
        }}>
          <Link to="/">
            <Button 
              type="link" 
              icon={<ArrowLeftOutlined />}
              style={{ paddingLeft: 0 }}
            >
              Back to Home
            </Button>
          </Link>
          
          <Space>
            <Text type="secondary">Already have an account?</Text>
            <Link to="/login">
              <Button 
                type="link" 
                icon={<LoginOutlined />}
                style={{ paddingRight: 0 }}
              >
                Sign In
              </Button>
            </Link>
          </Space>
        </div>

        {/* Authentication Message for Logged-in Users */}
        {isAuthenticated && (
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '24px',
            maxWidth: '800px',
            margin: '0 auto 24px auto'
          }}>
            <div style={{
              background: '#e6f7ff',
              border: '1px solid #91d5ff',
              borderRadius: '6px',
              padding: '16px'
            }}>
              <Text type="secondary">
                You are already logged in. You can register additional organizations if needed.
              </Text>
            </div>
          </div>
        )}

        {/* Main Registration Form */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center',
          width: '100%'
        }}>
          <RegistrationForm />
        </div>

        {/* Footer Information */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '48px',
          paddingBottom: '24px'
        }}>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            By registering, you agree to our{' '}
            <Link to="/terms" style={{ color: '#1890ff' }}>
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" style={{ color: '#1890ff' }}>
              Privacy Policy
            </Link>
          </Text>
        </div>
      </Content>
    </Layout>
  );
};

export default RegistrationPage; 
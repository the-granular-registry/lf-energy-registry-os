import React from 'react';
import { Layout, Typography, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Content } = Layout;
const { Text, Title } = Typography;

const TestComponent = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <Content
        style={{
          width: "100%",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px"
        }}
      >
        <Title level={2}>Account Management Test</Title>
        <Text style={{ marginBottom: '24px' }}>
          If you can see this, the routing is working correctly.
        </Text>
        <Button 
          type="primary" 
          onClick={() => navigate('/certificates')}
        >
          Go to Certificates
        </Button>
      </Content>
    </Layout>
  );
};

export default TestComponent; 
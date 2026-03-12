import React, { useState, useEffect } from 'react';
import { Spin, Alert } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { useUser } from '../../context/UserContext';

import SSSOverview from './components/SSSOverview';

const SSSPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  
  const { userData } = useUser();
  const { sssData } = useSelector(state => state.sss);

  console.log('SSSPage: Component rendered');
  console.log('SSSPage: User data:', userData);
  console.log('SSSPage: SSS data:', sssData);

  useEffect(() => {
    console.log('SSSPage: useEffect triggered');
    // Load initial SSS data based on user role
    if (userData) {
      console.log('SSSPage: User found, loading data');
      setLoading(true);
      try {
        // Load appropriate data based on user role
        console.log('SSSPage: Data loading completed');
      } catch (err) {
        console.error('SSSPage: Error loading data:', err);
        setError('Failed to load SSS data');
      } finally {
        setLoading(false);
      }
    } else {
      console.log('SSSPage: No user data available');
    }
  }, [userData]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>Loading SSS module...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="Error Loading SSS Module"
          description={error}
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="sss-page" style={{ padding: '20px', minHeight: '100vh' }}>
      <SSSOverview />
    </div>
  );
};

export default SSSPage;
import React from 'react';
import { Alert, Typography } from 'antd';

const { Paragraph } = Typography;

const SSSOnboardingAdminVerification = () => {
  const verificationStatus = localStorage.getItem('sss_verificationStatus') || 'pending';

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px' }}>
      <h2>Await Admin Verification (KYC)</h2>
      <Alert message={`Status: ${verificationStatus}`} type={verificationStatus === 'verified' ? 'success' : 'warning'} />
      <Paragraph>Submit required KYC documents for admin review.</Paragraph>
    </div>
  );
};

export default SSSOnboardingAdminVerification; 
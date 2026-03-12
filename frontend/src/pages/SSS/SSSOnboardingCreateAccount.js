import React, { useState } from 'react';
import { Form, Input, Button, Select, Alert, Modal, Divider } from 'antd';

const { Option } = Select;
const { Item } = Form;
const { TextArea } = Input;

const SSSOnboardingCreateAccount = () => {
  const [claimedSuppliers, setClaimedSuppliers] = useState([]);

  const handleClaim = (supplier) => {
    setClaimedSuppliers([...claimedSuppliers, supplier]);
    localStorage.setItem('sss_verificationStatus', 'in-review');
    Modal.success({ content: 'Claim submitted for verification.' });
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px' }}>
      <h2>Create Utility Account & Claim Estimates</h2>
      <Form layout="vertical">
        <Item label="Organisation Name" name="organisation_name" rules={[{ required: true }]}>
          <Input placeholder="Enter organisation name" />
        </Item>
        <Item label="Service Territories (States)" name="states" rules={[{ required: true }]}>
          <Select mode="multiple" placeholder="Select states">
            <Option value="CA">California</Option>
            <Option value="NY">New York</Option>
            {/* Add more states as needed */}
          </Select>
        </Item>
        <Item label="Balancing Authorities (BA)" name="ba_codes">
          <Select mode="multiple" placeholder="Select BA codes">
            <Option value="CAISO">CAISO</Option>
            <Option value="NYISO">NYISO</Option>
          </Select>
        </Item>
        <Item label="ISO/LDC Codes" name="iso_ldc_codes">
          <Input placeholder="Enter ISO/LDC codes, comma-separated" />
        </Item>
        <Item label="Compliance Contact" name="compliance_contact" rules={[{ required: true }]}>
          <TextArea rows={3} placeholder="Enter compliance contact details" />
        </Item>
        <Item>
          <Button type="primary">Create Account</Button>
        </Item>
        <Divider />
        <Alert message="Claim existing estimates from SSS Overview by selecting your territories." type="info" />
        <Button onClick={() => handleClaim('Constellation')}>Claim 'Constellation' (Mock)</Button>
      </Form>
    </div>
  );
};

export default SSSOnboardingCreateAccount; 
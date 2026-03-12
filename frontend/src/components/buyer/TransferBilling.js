import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, InputNumber, message, Alert, Descriptions, Tag } from 'antd';
import { CreditCardOutlined, SwapOutlined, DollarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const TransferBilling = ({ transferData, onComplete, visible, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [billingResult, setBillingResult] = useState(null);
  const [feeCalculation, setFeeCalculation] = useState(null);

  // Calculate fees when GC count changes
  useEffect(() => {
    const gcCount = form.getFieldValue('gc_count') || transferData?.gc_count || 0;
    if (gcCount > 0) {
      const transferFee = gcCount * 0.01; // $0.01 per GC
      setFeeCalculation({
        gc_count: gcCount,
        transfer_fee: transferFee,
        total_cost: transferFee
      });
    }
  }, [form, transferData]);

  const handleBilling = async (values) => {
    setLoading(true);
    
    try {
      const response = await axios.post('/api/v1/buyer/transfer/billing', {
        transfer_id: transferData?.transfer_id || `transfer_${Date.now()}`,
        gc_count: values.gc_count,
        buyer_organization_id: transferData?.buyer_organization_id || 1,
        source_account_id: transferData?.source_account_id,
        target_account_id: transferData?.target_account_id
      });
      
      setBillingResult(response.data);
      message.success('Transfer billing created successfully!');
      
    } catch (err) {
      message.error(err.response?.data?.detail || 'Failed to create transfer billing');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (billingResult?.payment_url) {
      window.open(billingResult.payment_url, '_blank');
      message.info('Payment window opened. Complete payment to finalize transfer.');
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete(billingResult);
    }
    onCancel();
  };

  return (
    <Modal
      title={
        <span>
          <SwapOutlined style={{ marginRight: 8 }} />
          GC Transfer Billing
        </span>
      }
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
    >
      {!billingResult ? (
        <>
          <Alert
            message="Transfer Fee Information"
            description="Transfer fees are charged at $0.01 per GC transferred. Payment is required before transfer completion."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
          
          {transferData && (
            <Descriptions title="Transfer Details" bordered size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Source Account" span={3}>
                Account #{transferData.source_account_id}
              </Descriptions.Item>
              <Descriptions.Item label="Target Account" span={3}>
                Account #{transferData.target_account_id}
              </Descriptions.Item>
            </Descriptions>
          )}
          
          <Form
            form={form}
            layout="vertical"
            onFinish={handleBilling}
            initialValues={{ gc_count: transferData?.gc_count }}
          >
            <Form.Item
              name="gc_count"
              label="Number of GCs to Transfer"
              rules={[
                { required: true, message: 'Please enter number of GCs' },
                { type: 'number', min: 1, message: 'Must be at least 1 GC' }
              ]}
            >
              <InputNumber
                min={1}
                max={10000}
                style={{ width: '100%' }}
                placeholder="Enter number of GCs"
                onChange={() => {
                  // Trigger fee recalculation
                  setTimeout(() => {
                    const gcCount = form.getFieldValue('gc_count') || 0;
                    if (gcCount > 0) {
                      const transferFee = gcCount * 0.01;
                      setFeeCalculation({
                        gc_count: gcCount,
                        transfer_fee: transferFee,
                        total_cost: transferFee
                      });
                    }
                  }, 100);
                }}
              />
            </Form.Item>
            
            {feeCalculation && (
              <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f9f9f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <DollarOutlined style={{ marginRight: 8 }} />
                    <strong>Fee Calculation</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div>{feeCalculation.gc_count} GCs × $0.01 = ${feeCalculation.transfer_fee.toFixed(2)}</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                      Total: ${feeCalculation.total_cost.toFixed(2)}
                    </div>
                  </div>
                </div>
              </Card>
            )}
            
            <div style={{ textAlign: 'center' }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                icon={<CreditCardOutlined />}
                disabled={!feeCalculation || feeCalculation.gc_count === 0}
              >
                Create Transfer Invoice
              </Button>
            </div>
          </Form>
        </>
      ) : (
        <>
          <Alert
            message="Transfer Invoice Created"
            description="Your transfer invoice has been created. Complete payment to finalize the transfer."
            type="success"
            showIcon
            style={{ marginBottom: 24 }}
          />
          
          <Descriptions title="Invoice Details" bordered column={1}>
            <Descriptions.Item label="Status">
              <Tag color="blue">{billingResult.status.toUpperCase()}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Invoice ID">
              {billingResult.invoice_id}
            </Descriptions.Item>
            <Descriptions.Item label="GCs to Transfer">
              {billingResult.gc_count}
            </Descriptions.Item>
            <Descriptions.Item label="Transfer Fee">
              ${(billingResult.amount / 100).toFixed(2)} USD
            </Descriptions.Item>
          </Descriptions>
          
          <div style={{ textAlign: 'center', marginTop: 24, gap: 16, display: 'flex', justifyContent: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={<CreditCardOutlined />}
              onClick={handlePayment}
            >
              Pay Invoice
            </Button>
            <Button
              size="large"
              onClick={handleComplete}
            >
              Complete Later
            </Button>
          </div>
          
          <div style={{ marginTop: 16, textAlign: 'center', color: '#666' }}>
            <small>
              Transfer will be processed automatically after payment confirmation.
            </small>
          </div>
        </>
      )}
    </Modal>
  );
};

export default TransferBilling; 
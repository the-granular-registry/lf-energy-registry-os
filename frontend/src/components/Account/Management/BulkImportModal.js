import React, { useState } from 'react';
import { Modal, Upload, Button, Alert, Typography, Space, Progress, Table, Tag, Divider } from 'antd';
import { UploadOutlined, FileTextOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { createSubAccountAPI } from '../../../api/accountAPI';
import { logger } from '../../../utils';
import Cookies from 'js-cookie';

const { Text, Paragraph, Title } = Typography;
const { Dragger } = Upload;

const BulkImportModal = ({ visible, onClose, selectedAccount, onImportComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [fileList, setFileList] = useState([]);

  const handleUpload = async () => {
    if (fileList.length === 0) {
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', fileList[0]);

    try {
      // Call bulk import API
      const response = await fetch(
        `http://localhost:8000/api/v1/accounts/${selectedAccount.id}/sub-accounts/bulk-import?auto_activate=true&generate_invitations=true&allow_under_allocation=true`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${Cookies.get('access_token')}`
          }
        }
      );

      const result = await response.json();

      if (response.status === 201 && result.success) {
        setImportResult(result);
        if (onImportComplete) {
          onImportComplete(result);
        }
      } else {
        setImportResult({
          success: false,
          error: result.detail || 'Import failed'
        });
      }
    } catch (error) {
      logger.error('Bulk import error:', error);
      setImportResult({
        success: false,
        error: error.message || 'Upload failed'
      });
    } finally {
      setUploading(false);
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    fileList,
    beforeUpload: (file) => {
      setFileList([file]);
      return false; // Prevent auto upload
    },
    onRemove: () => {
      setFileList([]);
      setImportResult(null);
    },
    accept: '.csv'
  };

  const handleClose = () => {
    setFileList([]);
    setImportResult(null);
    onClose();
  };

  const errorColumns = [
    { title: 'Row', dataIndex: 'row', key: 'row', width: 80 },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Error', dataIndex: 'error', key: 'error' }
  ];

  const successColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Share', dataIndex: 'share', key: 'share', render: (val) => `${(val * 100).toFixed(1)}%` },
    { title: 'Status', key: 'status', render: () => <Tag color="green">Created</Tag> }
  ];

  return (
    <Modal
      title={`Bulk Import Customers for ${selectedAccount?.account_name || 'Account'}`}
      open={visible}
      onCancel={handleClose}
      width={800}
      footer={[
        <Button key="close" onClick={handleClose}>
          Close
        </Button>,
        <Button
          key="upload"
          type="primary"
          loading={uploading}
          onClick={handleUpload}
          disabled={fileList.length === 0 || importResult?.success}
          icon={<UploadOutlined />}
        >
          {uploading ? 'Importing...' : 'Import Customers'}
        </Button>
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Instructions */}
        <Alert
          message="CSV Format Requirements"
          description={
            <div>
              <Paragraph style={{ marginBottom: 8 }}>
                <strong>Required columns:</strong> email, organization_name, share (0.0-1.0)
              </Paragraph>
              <Paragraph style={{ marginBottom: 8 }}>
                <strong>Optional columns:</strong> customer_id, rate_class, name, region, metadata_json
              </Paragraph>
              <Paragraph style={{ marginBottom: 0 }}>
                <strong>Example:</strong>
                <pre style={{ fontSize: '11px', marginTop: 4 }}>
{`email,organization_name,share,customer_id,rate_class,name,region
customer1@example.com,Acme Corp,0.25,CUST001,commercial,Acme,ERCOT
customer2@example.com,Smith Home,0.15,CUST002,residential,Smith,PJM`}
                </pre>
              </Paragraph>
            </div>
          }
          type="info"
          showIcon
          icon={<FileTextOutlined />}
        />

        {/* Upload Area */}
        {!importResult && (
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">Click or drag CSV file to upload</p>
            <p className="ant-upload-hint">
              Upload a CSV file with customer allocation data
            </p>
          </Dragger>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div style={{ textAlign: 'center' }}>
            <Progress percent={50} status="active" />
            <Text type="secondary">Processing customers...</Text>
          </div>
        )}

        {/* Results */}
        {importResult && (
          <div>
            {importResult.success ? (
              <>
                <Alert
                  message="Import Successful"
                  description={
                    <Space direction="vertical">
                      <Text>
                        Successfully created <strong>{importResult.created_count}</strong> customer subaccounts
                      </Text>
                      <Text>
                        Total share allocated: <strong>{(importResult.total_share_allocated * 100).toFixed(1)}%</strong>
                      </Text>
                      <Text>
                        Remaining share: <strong>{(importResult.remaining_share * 100).toFixed(1)}%</strong>
                      </Text>
                      {importResult.invitation_count > 0 && (
                        <Text type="success">
                          Generated {importResult.invitation_count} invitation tokens
                        </Text>
                      )}
                    </Space>
                  }
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                />

                {importResult.created_subaccounts && importResult.created_subaccounts.length > 0 && (
                  <>
                    <Divider />
                    <Title level={5}>Created Subaccounts</Title>
                    <Table
                      columns={successColumns}
                      dataSource={importResult.created_subaccounts}
                      rowKey="sub_account_id"
                      pagination={{ pageSize: 5 }}
                      size="small"
                    />
                  </>
                )}
              </>
            ) : (
              <Alert
                message="Import Failed"
                description={importResult.error || 'An error occurred during import'}
                type="error"
                showIcon
                icon={<ExclamationCircleOutlined />}
              />
            )}

            {importResult.errors && importResult.errors.length > 0 && (
              <>
                <Divider />
                <Alert
                  message={`${importResult.errors.length} Errors`}
                  type="warning"
                  showIcon
                />
                <Table
                  columns={errorColumns}
                  dataSource={importResult.errors}
                  rowKey={(record) => `${record.row}-${record.email}`}
                  pagination={false}
                  size="small"
                  style={{ marginTop: 12 }}
                />
              </>
            )}
          </div>
        )}
      </Space>
    </Modal>
  );
};

export default BulkImportModal;


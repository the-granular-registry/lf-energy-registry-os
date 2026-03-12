import React, { useState } from 'react';
import { Card, Upload, Button, Typography, Spin, message } from 'antd';
import { UploadOutlined, DownloadOutlined, FileSyncOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { uploadCsvForReformat } from '@store/admin/adminSlice';

const { Title, Text } = Typography;

export default function CsvReformatTool() {
  const [file, setFile] = useState(null);
  const dispatch = useDispatch();
  const { loading, results, error } = useSelector((state) => state.admin);

  const handleUpload = async () => {
    if (!file) {
      message.error('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      await dispatch(uploadCsvForReformat(formData));
      if (!error) {
        message.success('CSV reformatted successfully!');
      }
    } catch (err) {
      message.error('Failed to reformat CSV');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <FileSyncOutlined style={{ marginRight: '12px' }} />
        CSV Reformat Tool
      </Title>
      
      <Text type="secondary" style={{ fontSize: '16px', marginBottom: '24px', display: 'block' }}>
        Upload a malformed CSV or Excel file to get an AI-corrected version.
        The AI will generate custom Python code to transform your file into the required format.
      </Text>
      
      <Card style={{ marginBottom: '24px' }}>
        <Upload
          beforeUpload={() => false}
          onChange={(info) => setFile(info.file)}
          maxCount={1}
          accept=".csv,.xlsx,.xls"
        >
          <Button icon={<UploadOutlined />} size="large">
            Select CSV or Excel File
          </Button>
        </Upload>
        
        {file && (
          <div style={{ marginTop: '12px' }}>
            <Text>Selected: {file.name}</Text>
            <Button
              type="primary"
              onClick={handleUpload}
              loading={loading}
              style={{ marginLeft: '16px' }}
              size="large"
            >
              Reformat with AI
            </Button>
          </div>
        )}
      </Card>

      {loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>
              <Text strong>AI is analyzing your file and generating custom transformation code...</Text>
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary">This may take 30-60 seconds</Text>
              </div>
            </div>
          </div>
        </Card>
      )}

      {error && (
        <Card style={{ borderColor: '#ff4d4f' }}>
          <Title level={4} style={{ color: '#ff4d4f' }}>Error</Title>
          <Text>{error}</Text>
        </Card>
      )}

      {results && !loading && <ResultsDisplay results={results} />}
    </div>
  );
}

function ResultsDisplay({ results }) {
  return (
    <>
      <Card title="AI Analysis" style={{ marginBottom: '24px' }}>
        <Text>{results.ai_instructions}</Text>
      </Card>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <Card title="Original File" style={{ flex: '1 1 400px' }}>
          <StatsDisplay stats={results.original_stats} />
          <Button 
            type="primary" 
            icon={<DownloadOutlined />}
            href={results.original_file_url}
            target="_blank"
            style={{ marginTop: '16px' }}
          >
            Download Original
          </Button>
        </Card>

        <Card title="Corrected File (AI-Generated)" style={{ flex: '1 1 400px' }}>
          <StatsDisplay stats={results.corrected_stats} />
          <Button 
            type="primary" 
            icon={<DownloadOutlined />}
            href={results.corrected_file_url}
            target="_blank"
            style={{ marginTop: '16px' }}
          >
            Download Corrected
          </Button>
        </Card>
      </div>
    </>
  );
}

function StatsDisplay({ stats }) {
  return (
    <div>
      <p><strong>Total Energy:</strong> {stats.total_wh?.toLocaleString()} Wh</p>
      <p><strong>Period Start:</strong> {stats.min_date || 'N/A'}</p>
      <p><strong>Period End:</strong> {stats.max_date || 'N/A'}</p>
      <p><strong>Total Rows:</strong> {stats.row_count}</p>
      <p><strong>Missing Hours:</strong> {stats.missing_hours}</p>
      <p><strong>Duplicate Intervals:</strong> {stats.duplicate_intervals}</p>
      {stats.errors && stats.errors.length > 0 && (
        <p style={{ color: '#ff4d4f' }}>
          <strong>Errors:</strong> {stats.errors.join(', ')}
        </p>
      )}
    </div>
  );
}




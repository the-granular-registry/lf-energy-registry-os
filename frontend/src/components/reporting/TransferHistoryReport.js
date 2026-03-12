import React, { useEffect, useState } from 'react';
import { Typography, Card, Row, Col, Button, Space, Table, Tag, Empty, Spin } from 'antd';
import { ArrowLeftOutlined, FileSearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getCertificateHistoryAPI } from '../../api/reportingAPI';

const { Title, Text } = Typography;

export default function TransferHistoryReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState({ kpis: {}, events: [], issuances: [], retirements: [], transfers: [], splits: [] });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getCertificateHistoryAPI({ limit: 100, offset: 0 });
      setHistory(data || { kpis: {}, events: [], issuances: [], retirements: [], transfers: [], splits: [] });
    } catch (e) {
      // non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const summaryColumns = [
    { title: 'Metric', dataIndex: 'metric', key: 'metric' },
    { title: 'Certificates', dataIndex: 'certs', key: 'certs' },
    { title: 'Energy (MWh)', dataIndex: 'mwh', key: 'mwh' },
  ];

  const summaryData = [
    { key: 'issued', metric: 'Issued', certs: history?.kpis?.issued_certificates || 0, mwh: history?.kpis?.issued_mwh || 0 },
    { key: 'retired', metric: 'Retired', certs: history?.kpis?.retired_certificates || 0, mwh: history?.kpis?.retired_mwh || 0 },
    { key: 'transferred', metric: 'Transferred', certs: history?.kpis?.transferred_certificates || 0, mwh: history?.kpis?.transferred_mwh || 0 },
    { key: 'split', metric: 'Split', certs: history?.kpis?.split_certificates || 0, mwh: history?.kpis?.split_mwh || 0 },
    { key: 'actions_total', metric: 'Actions Total', certs: history?.kpis?.actions_total_certificates || 0, mwh: history?.kpis?.actions_total_mwh || 0 },
  ];

  const eventCols = [
    { title: 'Timestamp', dataIndex: 'timestamp', key: 'timestamp', render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-' },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    { title: 'Account', dataIndex: 'account_name', key: 'account_name', render: (v, r) => v || r.account_id || '-' },
    { title: 'Target Account', dataIndex: 'target_account_name', key: 'target_account_name', render: (v, r) => v || r.target_id || '-' },
    { title: 'Device', dataIndex: 'device_name', key: 'device_name', render: (v, r) => v || r.device_id || '-' },
    { title: 'Quantity (MWh)', dataIndex: 'quantity_mwh', key: 'quantity_mwh' },
  ];

  const issuanceCols = [
    { title: 'Account', dataIndex: 'account_name', key: 'account_name', render: (v, r) => v || r.account_id || '-' },
    { title: 'Device', dataIndex: 'device_name', key: 'device_name', render: (v, r) => v || r.device_id || '-' },
    { title: 'Issued (MWh)', dataIndex: 'issued_mwh', key: 'issued_mwh' },
  ];

  // Build aggregated transfers by minute, source, target
  const aggregatedTransfers = (history.transfers || []).filter(t => (t?.quantity_mwh ?? 0) > 0).reduce((acc, t) => {
    const tsKey = t.completed_at ? dayjs(t.completed_at).format('YYYY-MM-DD HH:mm') : '-';
    const sourceKey = t.source_account_name || t.source_id || '-';
    const targetKey = t.target_account_name || t.target_id || '-';
    const targetOrg = t.target_organization_name || '-';
    const key = `${tsKey}|${sourceKey}|${targetKey}`;
    if (!acc.map[key]) {
      const row = {
        key,
        completed_at: tsKey,
        source_account_name: t.source_account_name || t.source_id || '-',
        target_account_name: t.target_account_name || t.target_id || '-',
        target_organization_name: targetOrg,
        quantity_mwh: 0,
      };
      acc.rows.push(row);
      acc.map[key] = row;
    }
    acc.map[key].quantity_mwh += Number(t.quantity_mwh || 0);
    return acc;
  }, { rows: [], map: {} }).rows;

  const transferCols = [
    { title: 'Completed At', dataIndex: 'completed_at', key: 'completed_at' },
    { title: 'Source Account', dataIndex: 'source_account_name', key: 'source_account_name' },
    { title: 'Target Organization', dataIndex: 'target_organization_name', key: 'target_organization_name' },
    { title: 'Target Account', dataIndex: 'target_account_name', key: 'target_account_name' },
    { title: 'Total Quantity (MWh)', dataIndex: 'quantity_mwh', key: 'quantity_mwh' },
  ];

  const retirementCols = [
    { title: 'Completed At', dataIndex: 'completed_at', key: 'completed_at', render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-' },
    { title: 'Account', dataIndex: 'source_account_name', key: 'source_account_name', render: (v, r) => v || r.source_id || '-' },
    { title: 'Quantity (MWh)', dataIndex: 'quantity_mwh', key: 'quantity_mwh' },
  ];

  const splitCols = [
    { title: 'Completed At', dataIndex: 'completed_at', key: 'completed_at', render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-' },
    { title: 'Account', dataIndex: 'source_account_name', key: 'source_account_name', render: (v, r) => v || r.source_id || '-' },
    { title: 'Quantity (MWh)', dataIndex: 'quantity_mwh', key: 'quantity_mwh' },
    { title: 'Certificates', dataIndex: 'bundle_ids', key: 'bundle_ids', render: (ids) => (ids || []).slice(0,3).map(id => <Tag key={id}>{id}</Tag>) },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/reporting')}
            style={{ marginBottom: '16px' }}
          >
            Back to Reports
          </Button>
          <Title level={2}>
            <FileSearchOutlined style={{ marginRight: '8px' }} />
            Certificate History
          </Title>
          <Text type="secondary">
            History of all certificate activities: measurement submissions/approvals, transfers, retirements, and splits
          </Text>
        </div>

        <Card title="Summary" size="small">
          {loading ? <Spin /> : (
            <Table rowKey={(r) => r.key} columns={summaryColumns} dataSource={summaryData} pagination={false} size="small" />
          )}
        </Card>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="Event Log" size="small">
              {loading ? <Spin /> : (
                history.events?.length ? (
                  <Table rowKey={(r, idx) => `${r.timestamp}-${idx}`} columns={eventCols} dataSource={history.events} pagination={false} size="small" />
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No events found" />
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="Issuances" size="small">
              {loading ? <Spin /> : (
                (history.issuances || []).filter(r => Number(r.issued_mwh || 0) > 0)?.length ? (
                  <Table rowKey={(r) => `${r.account_id}-${r.device_id}`} columns={issuanceCols} dataSource={(history.issuances || []).filter(r => Number(r.issued_mwh || 0) > 0)} pagination={false} size="small" />
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No issuances found" />
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="Transfers" size="small">
              {loading ? <Spin /> : (
                aggregatedTransfers?.length ? (
                  <Table rowKey={(r) => r.key} columns={transferCols} dataSource={aggregatedTransfers} pagination={false} size="small" />
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No transfers found" />
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="Retirements" size="small">
              {loading ? <Spin /> : (
                history.retirements?.length ? (
                  <Table rowKey={(r) => r.id} columns={retirementCols} dataSource={history.retirements} pagination={false} size="small" />
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No retirements found" />
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="Splits" size="small">
              {loading ? <Spin /> : (
                history.splits?.length ? (
                  <Table rowKey={(r) => r.id} columns={splitCols} dataSource={history.splits} pagination={false} size="small" />
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No splits found" />
              )}
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
} 
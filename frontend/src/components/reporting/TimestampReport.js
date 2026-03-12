import React, { useEffect, useMemo, useState } from 'react';
import { Typography, Card, Row, Col, Space, Spin, Alert, Statistic, Divider, Table } from 'antd';
import { ArrowLeftOutlined, BarChartOutlined, HeatMapOutlined, LineChartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Plot from 'react-plotly.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import baseAPI from '../../api/baseAPI';
import ReportingFiltersBar from './common/FiltersBar';

const { Title, Text } = Typography;

dayjs.extend(utc);
dayjs.extend(timezone);

export default function TimestampReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [deviceFilterIds, setDeviceFilterIds] = useState([]);

  const normalizeReportData = (data) => {
    if (!data) return data;
    const cloned = JSON.parse(JSON.stringify(data));
    cloned.hourlyData = Array.isArray(cloned.hourlyData) ? cloned.hourlyData : [];
    cloned.kpis = cloned.kpis || {};
    // Unit normalization → ensure MWh
    const totalRaw = cloned.hourlyData.reduce((s, d) => s + (Number(d.mwh) || 0), 0);
    let scale = 1; // assume already MWh
    if (totalRaw > 1e6) scale = 1e6; // Wh → MWh
    else if (totalRaw > 1e3) scale = 1e3; // kWh → MWh
    if (scale !== 1) {
      for (const item of cloned.hourlyData) {
        if (Number.isFinite(item.mwh)) item.mwh = item.mwh / scale;
      }
      if (Array.isArray(cloned.device_breakdown)) {
        for (const row of cloned.device_breakdown) {
          if (Number.isFinite(row.total_generation_mwh)) row.total_generation_mwh = row.total_generation_mwh / scale;
        }
      }
    }

    // Derive device breakdown if not provided (account path provides it; project path may not)
    if (!Array.isArray(cloned.device_breakdown) || cloned.device_breakdown.length === 0) {
      const map = new Map();
      for (const item of cloned.hourlyData) {
        const did = item.device_id;
        if (did == null) continue;
        const prev = map.get(did) || 0;
        map.set(did, prev + (Number(item.mwh) || 0));
      }
      cloned.device_breakdown = Array.from(map.entries()).map(([device_id, total]) => ({ device_id, total_generation_mwh: total }));
    }

    // Local timezone hour-of-day bucketing baseline (may be overridden by tzMode later)
    cloned.hourlyData = cloned.hourlyData.map((d) => ({
      ...d,
      // Keep raw timestamp, but precompute local hour for fast grouping
      local_hour: dayjs(d.timestamp).hour(),
      local_day: dayjs(d.timestamp).format('YYYY-MM-DD'),
    }));
    return cloned;
  };

  // Keep device filter ids in sync with loaded breakdown
  useEffect(() => {
    if (!reportData || !Array.isArray(reportData.device_breakdown)) return;
    const ids = reportData.device_breakdown.map((d) => d.device_id).filter((v) => v != null);
    setDeviceFilterIds(ids);
  }, [reportData]);

  const hourOfDaySeries = useMemo(() => {
    if (!reportData?.hourlyData?.length) return [];
    const allowed = deviceFilterIds && deviceFilterIds.length > 0 ? new Set(deviceFilterIds) : null;
    
    // Group by technology type
    const techBuckets = {};
    for (const item of reportData.hourlyData) {
      if (allowed && item.device_id != null && !allowed.has(item.device_id)) continue;
      const tech = item.technology_type || 'Unknown';
      if (!techBuckets[tech]) {
        techBuckets[tech] = new Array(24).fill(0);
      }
      const h = Number.isFinite(item.local_hour) ? item.local_hour : dayjs(item.timestamp).hour();
      const val = Number(item.mwh) || 0;
      techBuckets[tech][h] += val;
    }
    
    // Convert to Plotly traces
    const traces = Object.keys(techBuckets).sort().map(tech => ({
      type: 'bar',
      name: tech,
      x: Array.from({ length: 24 }, (_, i) => i),
      y: techBuckets[tech],
    }));
    
    return traces;
  }, [reportData, deviceFilterIds]);

  const timeSeries = useMemo(() => {
    if (!reportData?.hourlyData?.length) return [];
    const allowed = deviceFilterIds && deviceFilterIds.length > 0 ? new Set(deviceFilterIds) : null;
    const filtered = allowed
      ? reportData.hourlyData.filter((d) => d.device_id == null || allowed.has(d.device_id))
      : reportData.hourlyData;
    
    // Group by technology type and timestamp
    const techData = {};
    for (const item of filtered) {
      const tech = item.technology_type || 'Unknown';
      if (!techData[tech]) {
        techData[tech] = { x: [], y: [] };
      }
      techData[tech].x.push(item.timestamp);
      techData[tech].y.push(Number(item.mwh) || 0);
    }
    
    // Convert to Plotly traces
    const traces = Object.keys(techData).sort().map(tech => ({
      type: 'bar',
      name: tech,
      x: techData[tech].x,
      y: techData[tech].y,
    }));
    
    return traces;
  }, [reportData, deviceFilterIds]);

  const heatmapData = useMemo(() => {
    if (!reportData?.hourlyData?.length) return { x: [], y: [], z: [] };
    const dayToRow = new Map();
    const allowed = deviceFilterIds && deviceFilterIds.length > 0 ? new Set(deviceFilterIds) : null;
    for (const item of reportData.hourlyData) {
      if (allowed && item.device_id != null && !allowed.has(item.device_id)) continue;
      const day = item.local_day || dayjs(item.timestamp).format('YYYY-MM-DD');
      const hour = Number.isFinite(item.local_hour) ? item.local_hour : dayjs(item.timestamp).hour();
      if (!dayToRow.has(day)) dayToRow.set(day, new Array(24).fill(0));
      dayToRow.get(day)[hour] += Number(item.mwh) || 0;
    }
    const days = Array.from(dayToRow.keys()).sort();
    // Transpose the matrix: create a 24x(num_days) matrix where each row is an hour
    const transposed = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourRow = [];
      for (const day of days) {
        hourRow.push(dayToRow.get(day)[hour]);
      }
      transposed.push(hourRow);
    }
    return { x: days, y: [...Array(24).keys()], z: transposed };
  }, [reportData, deviceFilterIds]);

  const deviceTableColumns = [
    {
      title: 'Device Name',
      dataIndex: 'device_name',
      key: 'device_name',
      sorter: (a, b) => (a.device_name || '').localeCompare(b.device_name || ''),
    },
    {
      title: 'Technology Type',
      dataIndex: 'technology_type',
      key: 'technology_type',
      filters: reportData?.device_breakdown
        ? [...new Set(reportData.device_breakdown.map(d => d.technology_type))].map(tech => ({
            text: tech,
            value: tech,
          }))
        : [],
      onFilter: (value, record) => record.technology_type === value,
    },
    {
      title: 'Total Energy (MWh)',
      dataIndex: 'total_generation_mwh',
      key: 'total_generation_mwh',
      render: (value) => Number(value || 0).toFixed(1),
      sorter: (a, b) => (a.total_generation_mwh || 0) - (b.total_generation_mwh || 0),
      sortDirections: ['descend', 'ascend'],
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <button className="ant-btn" onClick={() => navigate('/reporting')} style={{ marginBottom: '16px' }}>
            <ArrowLeftOutlined /> Back to Reports
          </button>
          <Title level={2}>
            <BarChartOutlined style={{ marginRight: '8px' }} />
            Timestamp Report
          </Title>
          <Text type="secondary">Generation analysis by local hour and time, using certificate timestamps</Text>
        </div>

        <ReportingFiltersBar
          baseKey="timestamp"
          exportEnabled={false}
          defaultSelectAll={false}
          legacyProjectsEnabled={false}
          onLoad={async ({ mode, params, meta }) => {
            try {
              setLoading(true);
              setError(null);
              if (mode === 'accounts') {
                const { data } = await baseAPI.get('/reporting/timestamp/account-data', { params });
                const transformed = {
                  kpis: {
                    total_generation_mwh: data.account_summary?.total_generation_mwh || 0,
                    avg_generation_mwh_per_hour: data.account_summary?.avg_generation_mwh_per_hour || 0,
                    peak_hour_of_day: data.account_summary?.peak_hour_of_day ?? 0,
                    zero_generation_hours: data.account_summary?.zero_generation_hours || 0,
                    data_quality: data.account_summary?.data_quality || {},
                  },
                  hourlyData: Array.isArray(data.hourlyData) ? data.hourlyData : [],
                  device_breakdown: Array.isArray(data.device_breakdown) ? data.device_breakdown : [],
                  period: data.period,
                };
                const normalized = normalizeReportData(transformed);
                // If tzMode === 'utc', override local buckets with UTC hours
                if (meta?.tzMode === 'utc') {
                  normalized.hourlyData = normalized.hourlyData.map((d) => ({
                    ...d,
                    local_hour: dayjs(d.timestamp).utc().hour(),
                    local_day: dayjs(d.timestamp).utc().format('YYYY-MM-DD'),
                  }));
                } else if (meta?.tzMode === 'device' && Array.isArray(meta?.devices) && meta.devices.length > 0) {
                  // Map device_id -> tz
                  const tzMap = new Map(meta.devices.map((dv) => [dv.id, dv.project_timezone || null]));
                  normalized.hourlyData = normalized.hourlyData.map((d) => {
                    const tz = tzMap.get(d.device_id);
                    const m = tz ? dayjs(d.timestamp).tz(tz) : dayjs(d.timestamp);
                    return { ...d, local_hour: m.hour(), local_day: m.format('YYYY-MM-DD') };
                  });
                }
                setReportData(normalizeReportData(normalized));
              } else {
                const { data } = await baseAPI.get('/reporting/timestamp/data', { params });
                const normalized = normalizeReportData(data);
                if (meta?.tzMode === 'utc') {
                  normalized.hourlyData = normalized.hourlyData.map((d) => ({
                    ...d,
                    local_hour: dayjs(d.timestamp).utc().hour(),
                    local_day: dayjs(d.timestamp).utc().format('YYYY-MM-DD'),
                  }));
                } else if (meta?.tzMode === 'device') {
                  // For project-mode, we don't have devices; keep local system time (can be adapted if device tz is known)
                }
                setReportData(normalizeReportData(normalized));
              }
            } catch (e) {
              setError('Failed to load timestamp report data');
            } finally {
              setLoading(false);
            }
          }}
        />

        {error && <Alert type="error" message={error} />}

        {loading ? (
          <Spin />
        ) : reportData ? (
          <>
            {/* Device Breakdown Table */}
            {Array.isArray(reportData.device_breakdown) && reportData.device_breakdown.length > 0 && (
              <Card size="small" title="Devices">
                <Table
                  dataSource={reportData.device_breakdown}
                  columns={deviceTableColumns}
                  rowKey="device_id"
                  size="small"
                  pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} devices` }}
                  rowSelection={{
                    type: 'checkbox',
                    selectedRowKeys: deviceFilterIds,
                    onChange: (selectedKeys) => {
                      setDeviceFilterIds(selectedKeys);
                    },
                  }}
                />
              </Card>
            )}

            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Card size="small"><Statistic title="Total Generation" value={reportData.kpis?.total_generation_mwh || 0} precision={1} suffix="MWh" /></Card>
              </Col>
              <Col span={6}>
                <Card size="small"><Statistic title="Avg per Hour" value={reportData.kpis?.avg_generation_mwh_per_hour || 0} precision={3} suffix="MWh" /></Card>
              </Col>
              <Col span={6}>
                <Card size="small"><Statistic title="Peak Local Hour" value={reportData.kpis?.peak_hour_of_day ?? 0} /></Card>
              </Col>
              <Col span={6}>
                <Card size="small"><Statistic title="Zero-Gen Hours" value={reportData.kpis?.zero_generation_hours || 0} /></Card>
              </Col>
            </Row>

            <Divider />

            <Card size="small" title={<span><BarChartOutlined /> Hour of Day Aggregation (Local)</span>}>
              <Plot
                data={hourOfDaySeries}
                layout={{
                  xaxis: { 
                    title: { text: 'Hour of Day (0–23)' }, 
                    zeroline: false, 
                    automargin: true,
                    tickmode: 'linear',
                    tick0: 0,
                    dtick: 1
                  },
                  yaxis: { title: { text: 'Energy (MWh)' }, zeroline: false, automargin: true },
                  barmode: 'stack',
                  height: 420,
                  autosize: true,
                  margin: { t: 24, r: 16, b: 64, l: 88 }
                }}
                useResizeHandler
                style={{ width: '100%' }}
                config={{ displaylogo: false, responsive: true }}
              />
            </Card>

            <Card size="small" title={<span><LineChartOutlined /> Generation Over Time</span>}>
              <Plot
                data={timeSeries}
                layout={{
                  xaxis: { title: { text: 'Time' }, type: 'date', zeroline: false, automargin: true },
                  yaxis: { title: { text: 'Energy (MWh)' }, zeroline: false, automargin: true },
                  barmode: 'stack',
                  height: 420,
                  autosize: true,
                  margin: { t: 24, r: 16, b: 64, l: 88 }
                }}
                useResizeHandler
                style={{ width: '100%' }}
                config={{ displaylogo: false, responsive: true }}
              />
            </Card>

            <Card size="small" title={<span><HeatMapOutlined /> Generation Heatmap (Date × Hour, Local)</span>}>
              <Plot
                data={[{ type: 'heatmap', x: heatmapData.x, y: heatmapData.y, z: heatmapData.z, colorscale: 'YlGnBu', hoverongaps: false, colorbar: { title: { text: 'Energy (MWh)' } } }]}
                layout={{
                  xaxis: { title: { text: 'Date' }, zeroline: false, automargin: true },
                  yaxis: { title: { text: 'Hour of Day (0–23)' }, zeroline: false, automargin: true },
                  height: 520,
                  autosize: true,
                  margin: { t: 24, r: 24, b: 64, l: 96 }
                }}
                useResizeHandler
                style={{ width: '100%' }}
                config={{ displaylogo: false, responsive: true }}
              />
            </Card>
          </>
        ) : (
          <Card size="small"><Text type="secondary">Use the filters above and click Load Report.</Text></Card>
        )}
      </Space>
    </div>
  );
}



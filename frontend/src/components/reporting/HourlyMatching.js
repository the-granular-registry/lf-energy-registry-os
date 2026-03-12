import React, { useEffect, useMemo, useState } from 'react';
import { Typography, Card, Row, Col, Button, Space, Spin, Alert, Select, DatePicker, Statistic, Divider, message } from 'antd';
import { ArrowLeftOutlined, BarChartOutlined, DownloadOutlined, HeatMapOutlined, LineChartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Plot from 'react-plotly.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import baseAPI from '../../api/baseAPI';
import { useUser } from '../../context/UserContext';
import ReportingFiltersBar from './common/FiltersBar';

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

export default function HourlyMatching() {
  const navigate = useNavigate();
  const { userData } = useUser();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [availableMinDate, setAvailableMinDate] = useState(null);
  const [availableMaxDate, setAvailableMaxDate] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(1, 'year').startOf('month'),
    dayjs().endOf('month')
  ]);

  useEffect(() => {
    fetchProjects();
    fetchAvailableAccounts();
  }, []);

  useEffect(() => {
    refreshAvailableRange();
  }, [selectedProject]);

  useEffect(() => {
    fetchDevicesForSelectedAccounts();
    refreshAvailableRange();
  }, [selectedAccounts]);

  useEffect(() => {
    refreshAvailableRange();
  }, [selectedDevices]);

  const fetchProjects = async () => {
    try {
      const { data } = await baseAPI.get('/reporting/hourly-matching/projects');
      let list = data || [];
      if (!Array.isArray(list) || list.length === 0) {
        // Fallback to carbon impact projects for legacy behavior
        const fallback = await baseAPI.get('/reporting/carbon-impact/projects');
        list = fallback.data || [];
      }
      setProjects(list);
      if (Array.isArray(list) && list.length > 0 && !selectedProject) {
        setSelectedProject(list[0].id);
      }
    } catch (err) {
      // Non-blocking
    }
  };

  const fetchAvailableAccounts = async () => {
    try {
      const { data } = await baseAPI.get('/reporting/hourly-matching/accounts');
      const accountData = data?.accounts || [];
      setAvailableAccounts(accountData);
    } catch (err) {
      // Non-blocking
    }
  };

  const fetchDevicesForSelectedAccounts = async () => {
    try {
      if (!selectedAccounts || selectedAccounts.length === 0) {
        setAvailableDevices([]);
        setSelectedDevices([]);
        return;
      }
      const requests = selectedAccounts.map((accId) => baseAPI.get(`/accounts/${accId}/devices`));
      const results = await Promise.allSettled(requests);
      const devices = [];
      for (const res of results) {
        if (res.status === 'fulfilled') {
          const arr = res.value.data || [];
          for (const d of arr) {
            if (!devices.find((ex) => ex.id === d.id)) devices.push(d);
          }
        }
      }
      setAvailableDevices(devices);
      const ids = new Set(devices.map((d) => d.id));
      setSelectedDevices((prev) => prev.filter((id) => ids.has(id)));
    } catch (err) {
      // Non-blocking
    }
  };

  const refreshAvailableRange = async () => {
    try {
      const params = {};
      const hasAccounts = selectedAccounts && selectedAccounts.length > 0;
      if (hasAccounts) {
        params.account_ids = selectedAccounts.join(',');
        if (selectedDevices && selectedDevices.length > 0) {
          params.device_ids = selectedDevices.join(',');
        }
      } else if (selectedProject) {
        params.project_id = selectedProject;
      }
      const { data } = await baseAPI.get('/reporting/hourly-matching/available-range', { params });
      if (data && data.min_date && data.max_date) {
        const min = dayjs(data.min_date).startOf('month');
        const max = dayjs(data.max_date).endOf('month');
        setAvailableMinDate(min);
        setAvailableMaxDate(max);
        setDateRange([min, max]);
      }
    } catch (err) {
      // ignore; keep defaults
    }
  };

  const fetchReportData = async () => {
    if (!selectedProject || !dateRange) return;
    setLoading(true);
    setError(null);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      const { data } = await baseAPI.get('/reporting/hourly-matching/data', {
        params: { project_id: selectedProject, start_date: startDate, end_date: endDate }
      });
      setReportData(normalizeReportData(data));
    } catch (err) {
      setError('Failed to load hourly matching data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountReportData = async () => {
    if (selectedAccounts.length === 0 || !dateRange) return;
    setLoading(true);
    setError(null);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      const accountIds = selectedAccounts.join(',');
      const deviceIds = selectedDevices.length > 0 ? selectedDevices.join(',') : undefined;
      const { data } = await baseAPI.get('/reporting/hourly-matching/account-data', {
        params: {
          account_ids: accountIds,
          start_date: startDate,
          end_date: endDate,
          ...(deviceIds ? { device_ids: deviceIds } : {}),
        },
      });

      // Transform into common structure used by charts/KPIs
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
      setReportData(normalizeReportData(transformed));
    } catch (err) {
      setError('Failed to load hourly matching data for selected accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedAccounts.length > 0) {
      await fetchAccountReportData();
    } else if (selectedProject) {
      await fetchReportData();
    } else {
      message.warning('Please select at least one account or a legacy project.');
    }
  };

  const normalizeReportData = (data) => {
    if (!data) return data;
    const cloned = JSON.parse(JSON.stringify(data));
    cloned.hourlyData = Array.isArray(cloned.hourlyData) ? cloned.hourlyData : [];
    cloned.kpis = cloned.kpis || {};
    return cloned;
  };

  const hourOfDaySeries = useMemo(() => {
    if (!reportData?.hourlyData?.length) return { x: [], y: [] };
    const buckets = new Array(24).fill(0);
    for (const item of reportData.hourlyData) {
      const h = Number(item.timestamp?.slice(11, 13)) || 0;
      const val = Number(item.mwh) || 0;
      buckets[h] += val;
    }
    return { x: buckets.map((_, i) => i), y: buckets };
  }, [reportData]);

  const timeSeries = useMemo(() => {
    if (!reportData?.hourlyData?.length) return { x: [], y: [] };
    const x = reportData.hourlyData.map((d) => d.timestamp);
    const y = reportData.hourlyData.map((d) => Number(d.mwh) || 0);
    return { x, y };
  }, [reportData]);

  const heatmapData = useMemo(() => {
    if (!reportData?.hourlyData?.length) return { x: [], y: [], z: [] };
    // Map day -> 24-hour array
    const dayToRow = new Map();
    for (const item of reportData.hourlyData) {
      const day = item.timestamp.slice(0, 10); // YYYY-MM-DD
      const hour = Number(item.timestamp.slice(11, 13)) || 0;
      if (!dayToRow.has(day)) dayToRow.set(day, new Array(24).fill(0));
      dayToRow.get(day)[hour] += Number(item.mwh) || 0;
    }
    const days = Array.from(dayToRow.keys());
    const matrix = days.map((d) => dayToRow.get(d));
    return { x: [...Array(24).keys()], y: days, z: matrix };
  }, [reportData]);

  const disabledDate = (current) => {
    if (!availableMinDate || !availableMaxDate) return false;
    return current < availableMinDate.startOf('day') || current > availableMaxDate.endOf('day');
  };

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
            <BarChartOutlined style={{ marginRight: '8px' }} />
            Hourly Matching Report
          </Title>
          <Text type="secondary">
            Generation-focused hourly analysis based on certificate timestamps
          </Text>
        </div>

        <ReportingFiltersBar
          baseKey="hourly-matching"
          exportEnabled={false}
          defaultSelectAll={true}
          onLoad={async ({ mode, params }) => {
            try {
              setLoading(true);
              setError(null);
              if (mode === 'accounts') {
                const { data } = await baseAPI.get('/reporting/hourly-matching/account-data', { params });
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
                setReportData(normalizeReportData(transformed));
              } else {
                const { data } = await baseAPI.get('/reporting/hourly-matching/data', { params });
                setReportData(normalizeReportData(data));
              }
            } catch (e) {
              setError('Failed to load hourly matching data');
            } finally {
              setLoading(false);
            }
          }}
        />

        {error && (
          <Alert type="error" message={error} />
        )}

        {loading ? (
          <Spin />
        ) : reportData ? (
          <>
            {/* Executive Summary */}
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Card size="small"><Statistic title="Total Generation" value={reportData.kpis?.total_generation_mwh || 0} precision={1} suffix="MWh" /></Card>
              </Col>
              <Col span={6}>
                <Card size="small"><Statistic title="Avg per Hour" value={reportData.kpis?.avg_generation_mwh_per_hour || 0} precision={3} suffix="MWh" /></Card>
              </Col>
              <Col span={6}>
                <Card size="small"><Statistic title="Peak Hour of Day" value={reportData.kpis?.peak_hour_of_day ?? 0} /></Card>
              </Col>
              <Col span={6}>
                <Card size="small"><Statistic title="Zero-Gen Hours" value={reportData.kpis?.zero_generation_hours || 0} /></Card>
              </Col>
            </Row>

            <Divider />

            {/* Hour of Day Aggregation */}
            <Card size="small" title={<span><BarChartOutlined /> Hour of Day Aggregation</span>}>
              <Plot
                data={[{ type: 'bar', x: hourOfDaySeries.x, y: hourOfDaySeries.y, marker: { color: '#1f77b4' }, name: 'kWh' }]}
                layout={{
                  barmode: 'group',
                  xaxis: { title: 'Hour of Day (0-23)' },
                  yaxis: { title: 'MWh' },
                  height: 420,
                  margin: { t: 24, r: 16, b: 48, l: 56 },
                }}
                config={{ displaylogo: false, responsive: true }}
              />
            </Card>

            {/* Time Series Bar */}
            <Card size="small" title={<span><LineChartOutlined /> Generation Over Time</span>}>
              <Plot
                data={[{ type: 'bar', x: timeSeries.x, y: timeSeries.y, marker: { color: '#4e79a7' }, name: 'MWh' }]}
                layout={{
                  xaxis: { title: 'Timestamp' },
                  yaxis: { title: 'MWh' },
                  height: 420,
                  margin: { t: 24, r: 16, b: 48, l: 56 },
                }}
                config={{ displaylogo: false, responsive: true }}
              />
            </Card>

            {/* Heatmap */}
            <Card size="small" title={<span><HeatMapOutlined /> Generation Heatmap (Day × Hour)</span>}>
              <Plot
                data={[{ type: 'heatmap', x: heatmapData.x, y: heatmapData.y, z: heatmapData.z, colorscale: 'YlGnBu', hoverongaps: false }]}
                layout={{
                  xaxis: { title: 'Hour of Day (0-23)' },
                  yaxis: { title: 'Day' },
                  height: 520,
                  margin: { t: 24, r: 16, b: 48, l: 80 },
                }}
                config={{ displaylogo: false, responsive: true }}
              />
            </Card>
          </>
        ) : (
          <Card size="small"><Text type="secondary">Select filters and click Load Report.</Text></Card>
        )}
      </Space>
    </div>
  );
}
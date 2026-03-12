import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Row, Col, Typography, Select, DatePicker, Button, Space, message, Spin, Descriptions, Table, Tag, Statistic } from 'antd';
import Plot from 'react-plotly.js';
import dayjs from 'dayjs';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getAllAccessibleDevicesAPI } from '../api/deviceAPI';
import {
  getNetStorageMeasurementReportsForUserAPI,
  getNetStorageMeasurementReportsAPI,
  getPendingNetStorageMeasurementReportsAPI,
  getNetStorageMeasurementReportAPI,
  getNetAllocationDiagnosticsAPI,
  getNetSTARsAPI,
} from '../api/storageNetAPI';
import baseAPI from '../api/baseAPI';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function NetStorageMeasurementsReportPage() {
  const { userData } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [allDevices, setAllDevices] = useState([]);
  const [storageDevices, setStorageDevices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const isSuperAdmin = userData?.userInfo?.role === 'SUPER_ADMIN' || userData?.userInfo?.role === 5;
  const [selectedAccount, setSelectedAccount] = useState(undefined);
  const [selectedDevice, setSelectedDevice] = useState(undefined);
  const [mrOptions, setMrOptions] = useState([]);
  const [selectedMR, setSelectedMR] = useState(undefined);
  const [selectedReport, setSelectedReport] = useState(null);
  const [allocationDiagnostics, setAllocationDiagnostics] = useState(null);
  const [stars, setStars] = useState([]);
  const [hasRunReport, setHasRunReport] = useState(false);
  const PAGE_LIMIT = 100;

  const extractReports = (response) => {
    const payload = response?.data;
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.reports)) return payload.reports;
    if (Array.isArray(payload.items)) return payload.items;
    return [];
  };

  const parseNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  // Load devices
  useEffect(() => {
    (async () => {
      try {
        const resp = await getAllAccessibleDevicesAPI(true);
        const all = resp?.data?.devices || [];
        const isStorage = (d) => {
          if (d?.is_storage) return true;
          const tech = String(d?.technology_type || '').toLowerCase();
          return tech === 'battery_storage' || tech === 'other_storage';
        };
        const storage = all.filter(isStorage);
        setAllDevices(all);
        setStorageDevices(storage);

        // Extract unique accounts
        const accountMap = new Map();
        all.forEach((d) => {
          if (d.account_id && d.account_name) {
            accountMap.set(d.account_id, d.account_name);
          }
        });
        const accountOpts = Array.from(accountMap.entries()).map(([id, name]) => ({
          value: id,
          label: name,
        }));
        setAccounts(accountOpts);
      } catch (err) {
        console.error('Failed to load devices:', err);
        message.error('Failed to load devices');
      }
    })();
  }, []);

  // Load net storage measurement reports
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const descriptors = [
          { key: 'user', request: getNetStorageMeasurementReportsForUserAPI({ page: 1, page_size: PAGE_LIMIT }) },
        ];
        if (isSuperAdmin) {
          descriptors.push(
            { key: 'adminAll', request: getNetStorageMeasurementReportsAPI({ page: 1, page_size: PAGE_LIMIT }) },
            { key: 'pending', request: getPendingNetStorageMeasurementReportsAPI({ page: 1, page_size: PAGE_LIMIT }) },
          );
        }

        const results = await Promise.allSettled(descriptors.map((d) => d.request));
        const resolved = new Map();
        const failures = [];
        results.forEach((result, idx) => {
          const { key } = descriptors[idx];
          if (result.status === 'fulfilled') {
            resolved.set(key, result.value);
          } else {
            failures.push({ key, error: result.reason });
          }
        });

        if (failures.length) {
          message.warning('Some net storage measurement sources failed to load; showing partial results.');
        }

        let reports = extractReports(resolved.get('user'));
        if (isSuperAdmin) {
          const adminSuperset = extractReports(resolved.get('adminAll'));
          if (adminSuperset.length) {
            reports = adminSuperset;
          }
          const pendingOnly = extractReports(resolved.get('pending'));
          if (pendingOnly.length) {
            const existingIds = new Set(reports.map((r) => r.id));
            for (const item of pendingOnly) {
              if (!existingIds.has(item.id)) {
                reports.push(item);
              }
            }
          }
        }

        if (selectedDevice) {
          reports = reports.filter((r) => r.device_id === selectedDevice);
        }
        if (selectedAccount) {
          const accountDeviceIds = new Set(
            storageDevices.filter((d) => d.account_id === selectedAccount).map((d) => d.id)
          );
          reports = reports.filter((r) => accountDeviceIds.has(r.device_id));
        }

        const options = reports.map((r) => {
          const deviceName = storageDevices.find((d) => d.id === r.device_id)?.device_name || `Device ${r.device_id}`;
          const start = r.interval_start_datetime ? dayjs(r.interval_start_datetime).format('MMM DD') : '?';
          const end = r.interval_end_datetime ? dayjs(r.interval_end_datetime).format('MMM DD') : '?';
          const statusTag = r.status === 'APPROVED' ? '✓' : r.status === 'REJECTED' ? '✗' : '⏳';
          return {
            value: r.id,
            label: `[${statusTag}] ${deviceName} | ${start} - ${end} | ${r.stars_created || 0} STARs | RTE: ${parseFloat(r.round_trip_efficiency || 0).toFixed(2)}`,
            searchText: `${deviceName} ${start} ${end} ${r.status}`.toLowerCase(),
            report: r,
          };
        });

        setMrOptions(options);
      } catch (err) {
        console.error('Failed to load net reports:', err);
        message.error('Failed to load net storage measurement reports');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDevice, selectedAccount, storageDevices, isSuperAdmin]);

  const runReport = async () => {
    if (!selectedMR) {
      message.warning('Please select a net storage measurement report');
      return;
    }

    setLoading(true);
    try {
      // Get report details
      const reportResp = await getNetStorageMeasurementReportAPI(selectedMR);
      const report = reportResp?.data;
      setSelectedReport(report);

      // Get allocation diagnostics
      const diagResp = await getNetAllocationDiagnosticsAPI(selectedMR);
      const diag = diagResp?.data?.allocation_diagnostics;
      setAllocationDiagnostics(diag);

      // Get STARs for this upload
      if (report?.upload_id) {
        const starsResp = await getNetSTARsAPI({ upload_id: report.upload_id });
        const starsList = starsResp?.data?.stars || [];
        setStars(starsList);
      }

      setHasRunReport(true);
      message.success('Report loaded successfully');
    } catch (err) {
      console.error('Failed to load report:', err);
      message.error('Failed to load report details');
      setSelectedReport(null);
      setAllocationDiagnostics(null);
      setStars([]);
      setHasRunReport(false);
    } finally {
      setLoading(false);
    }
  };

  const deviceOptions = useMemo(() => {
    const filtered = selectedAccount ? storageDevices.filter(d => d.account_id === selectedAccount) : storageDevices;
    return filtered.map(d => ({ value: d.id, label: d.device_name || `Device ${d.id}` }));
  }, [storageDevices, selectedAccount]);

  const renderTimeShiftDistribution = () => {
    if (!allocationDiagnostics?.time_shift_distribution) return null;

    const dist = allocationDiagnostics.time_shift_distribution;
    const data = [
      {
        x: Object.keys(dist),
        y: Object.values(dist),
        type: 'bar',
        marker: { color: '#1890ff' },
      },
    ];

    return (
      <Card title="Time Shift Distribution" size="small">
        <Plot
          data={data}
          layout={{
            xaxis: { title: 'Time Shift Range' },
            yaxis: { title: 'Number of STARs' },
            margin: { l: 50, r: 20, t: 20, b: 50 },
            height: 300,
          }}
          config={{ responsive: true }}
          style={{ width: '100%' }}
        />
      </Card>
    );
  };

  const renderStarSizeDistribution = () => {
    if (!stars.length) return null;

    const sizes = stars.map(s => parseFloat(s.pre_loss_mwh || 0));
    const bins = [0, 0.1, 0.2, 0.5, 0.8, 0.9, 0.95, 1.0];
    const counts = new Array(bins.length - 1).fill(0);

    sizes.forEach(size => {
      for (let i = 0; i < bins.length - 1; i++) {
        if (size >= bins[i] && size < bins[i + 1]) {
          counts[i]++;
          break;
        }
        if (i === bins.length - 2 && size >= bins[i + 1]) {
          counts[i]++;
        }
      }
    });

    const labels = bins.slice(0, -1).map((b, i) => `${b}-${bins[i + 1]} MWh`);

    const data = [
      {
        x: labels,
        y: counts,
        type: 'bar',
        marker: { color: '#52c41a' },
      },
    ];

    return (
      <Card title="STAR Size Distribution" size="small">
        <Plot
          data={data}
          layout={{
            xaxis: { title: 'STAR Size (Pre-Loss MWh)' },
            yaxis: { title: 'Count' },
            margin: { l: 50, r: 20, t: 20, b: 80 },
            height: 300,
          }}
          config={{ responsive: true }}
          style={{ width: '100%' }}
        />
      </Card>
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>Net/SOC Storage Measurement Reports</Title>
          <Text type="secondary">
            View net/SOC STAR engine reports with allocation diagnostics. This is a separate system from the legacy storage reports.
          </Text>
        </div>

        <Card>
          <Row gutter={12}>
            <Col span={6}>
              <Select
                style={{ width: '100%' }}
                allowClear
                placeholder="Account"
                value={selectedAccount}
                options={accounts}
                onChange={setSelectedAccount}
              />
            </Col>
            <Col span={8}>
              <Select
                style={{ width: '100%' }}
                allowClear
                showSearch
                placeholder="Device"
                value={selectedDevice}
                options={deviceOptions}
                onChange={setSelectedDevice}
                filterOption={(i, o) => (o?.label || '').toLowerCase().includes(i.toLowerCase())}
              />
            </Col>
            <Col span={10}>
              <Space>
                <Select
                  style={{ minWidth: 420 }}
                  allowClear
                  placeholder="Select a Net Storage Measurement Report"
                  value={selectedMR}
                  options={mrOptions}
                  onChange={setSelectedMR}
                  showSearch
                  filterOption={(input, option) => {
                    const target = option?.searchText || String(option?.label || '').toLowerCase();
                    return target.includes(input.toLowerCase());
                  }}
                />
                <Button type="primary" onClick={runReport} loading={loading}>
                  Load Report
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {hasRunReport && selectedReport ? (
          <>
            <Card title="Report Summary">
              <Descriptions bordered size="small" column={3}>
                <Descriptions.Item label="Report ID">{selectedReport.id}</Descriptions.Item>
                <Descriptions.Item label="Upload ID">{selectedReport.upload_id}</Descriptions.Item>
                <Descriptions.Item label="Device ID">{selectedReport.device_id}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={selectedReport.status === 'APPROVED' ? 'green' : selectedReport.status === 'REJECTED' ? 'red' : 'orange'}>
                    {selectedReport.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Interval Start">
                  {selectedReport.interval_start_datetime ? dayjs(selectedReport.interval_start_datetime).format('YYYY-MM-DD HH:mm') : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Interval End">
                  {selectedReport.interval_end_datetime ? dayjs(selectedReport.interval_end_datetime).format('YYYY-MM-DD HH:mm') : 'N/A'}
                </Descriptions.Item>
              </Descriptions>

              <Row gutter={16} style={{ marginTop: 20 }}>
                <Col span={6}>
                  <Statistic
                    title="Total Charge"
                    value={parseFloat(selectedReport.total_charge_mwh || 0).toFixed(2)}
                    suffix="MWh"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Total Discharge"
                    value={parseFloat(selectedReport.total_discharge_mwh || 0).toFixed(2)}
                    suffix="MWh"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Total Loss"
                    value={parseFloat(selectedReport.total_loss_mwh || 0).toFixed(2)}
                    suffix="MWh"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Round Trip Efficiency"
                    value={parseFloat(selectedReport.round_trip_efficiency || 0).toFixed(4)}
                    suffix="%"
                    valueStyle={{ color: parseFloat(selectedReport.round_trip_efficiency || 0) > 0.8 ? '#3f8600' : '#cf1322' }}
                  />
                </Col>
              </Row>

              <Row gutter={16} style={{ marginTop: 20 }}>
                <Col span={6}>
                  <Statistic title="STARs Created" value={selectedReport.stars_created || 0} />
                </Col>
                <Col span={6}>
                  <Statistic title="SLRs Created" value={selectedReport.slrs_created || 0} />
                </Col>
                <Col span={6}>
                  <Statistic title="Row Count" value={selectedReport.row_count || 0} />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Processing Completed"
                    value={selectedReport.processing_completed_at ? dayjs(selectedReport.processing_completed_at).format('MMM DD HH:mm') : 'N/A'}
                  />
                </Col>
              </Row>
            </Card>

            {allocationDiagnostics && (
              <>
                <Card title="Allocation Diagnostics">
                  <Row gutter={16}>
                    <Col span={6}>
                      <Statistic
                        title="Total STARs"
                        value={allocationDiagnostics.total_stars || 0}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="Match Rate"
                        value={parseFloat(allocationDiagnostics.match_rate_pct || 0).toFixed(2)}
                        suffix="%"
                        valueStyle={{ color: parseFloat(allocationDiagnostics.match_rate_pct || 0) > 95 ? '#3f8600' : '#cf1322' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="Avg Time Shift"
                        value={parseFloat(allocationDiagnostics.average_time_shift_hours || 0).toFixed(1)}
                        suffix="hours"
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="SOC Coverage"
                        value={parseFloat(allocationDiagnostics.soc_usage_stats?.soc_coverage_pct || 0).toFixed(1)}
                        suffix="%"
                      />
                    </Col>
                  </Row>

                  <Row gutter={16} style={{ marginTop: 20 }}>
                    <Col span={8}>
                      <Statistic
                        title="Matched Discharge"
                        value={parseFloat(allocationDiagnostics.matched_discharge_mwh || 0).toFixed(2)}
                        suffix="MWh"
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Unmatched Discharge"
                        value={parseFloat(allocationDiagnostics.unmatched_discharge_mwh || 0).toFixed(2)}
                        suffix="MWh"
                        valueStyle={{ color: parseFloat(allocationDiagnostics.unmatched_discharge_mwh || 0) > 0 ? '#faad14' : '#3f8600' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Total Discharge"
                        value={parseFloat(allocationDiagnostics.total_discharge_mwh || 0).toFixed(2)}
                        suffix="MWh"
                      />
                    </Col>
                  </Row>
                </Card>

                <Row gutter={16}>
                  <Col span={12}>
                    {renderTimeShiftDistribution()}
                  </Col>
                  <Col span={12}>
                    {renderStarSizeDistribution()}
                  </Col>
                </Row>

                <Card title="SOC Statistics" size="small">
                  {allocationDiagnostics.soc_usage_stats && (
                    <Descriptions bordered size="small" column={3}>
                      <Descriptions.Item label="Records with SOC">
                        {allocationDiagnostics.soc_usage_stats.records_with_soc || 0} / {allocationDiagnostics.soc_usage_stats.total_records || 0}
                      </Descriptions.Item>
                      <Descriptions.Item label="SOC Coverage">
                        {parseFloat(allocationDiagnostics.soc_usage_stats.soc_coverage_pct || 0).toFixed(1)}%
                      </Descriptions.Item>
                      <Descriptions.Item label="SOC Usage in STARs">
                        {parseFloat(allocationDiagnostics.soc_usage_stats.soc_usage_pct || 0).toFixed(1)}%
                      </Descriptions.Item>
                      {allocationDiagnostics.soc_usage_stats.min_soc !== undefined && (
                        <>
                          <Descriptions.Item label="Min SOC">
                            {parseFloat(allocationDiagnostics.soc_usage_stats.min_soc || 0).toFixed(2)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Max SOC">
                            {parseFloat(allocationDiagnostics.soc_usage_stats.max_soc || 0).toFixed(2)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Avg SOC">
                            {parseFloat(allocationDiagnostics.soc_usage_stats.avg_soc || 0).toFixed(2)}
                          </Descriptions.Item>
                        </>
                      )}
                    </Descriptions>
                  )}
                </Card>

                <Card title="Allocation Method Breakdown" size="small">
                  {allocationDiagnostics.allocation_method_breakdown && (
                    <Table
                      dataSource={Object.entries(allocationDiagnostics.allocation_method_breakdown).map(([method, count]) => ({
                        key: method,
                        method,
                        count,
                        percentage: ((count / (allocationDiagnostics.total_stars || 1)) * 100).toFixed(2),
                      }))}
                      columns={[
                        { title: 'Method', dataIndex: 'method', key: 'method' },
                        { title: 'Count', dataIndex: 'count', key: 'count' },
                        { title: 'Percentage', dataIndex: 'percentage', key: 'percentage', render: (val) => `${val}%` },
                      ]}
                      pagination={false}
                      size="small"
                    />
                  )}
                </Card>

                <Card title="STAR Size Statistics" size="small">
                  {allocationDiagnostics.star_size_distribution && (
                    <Descriptions bordered size="small" column={4}>
                      <Descriptions.Item label="Min Size">
                        {parseFloat(allocationDiagnostics.star_size_distribution.min || 0).toFixed(3)} MWh
                      </Descriptions.Item>
                      <Descriptions.Item label="Max Size">
                        {parseFloat(allocationDiagnostics.star_size_distribution.max || 0).toFixed(3)} MWh
                      </Descriptions.Item>
                      <Descriptions.Item label="Avg Size">
                        {parseFloat(allocationDiagnostics.star_size_distribution.avg || 0).toFixed(3)} MWh
                      </Descriptions.Item>
                      <Descriptions.Item label="At Capacity (1.0 MWh)">
                        {allocationDiagnostics.star_size_distribution.at_cap_count || 0}
                      </Descriptions.Item>
                    </Descriptions>
                  )}
                </Card>
              </>
            )}

            {stars.length > 0 && (
              <Card title={`STARs (${stars.length} total)`} size="small">
                <Table
                  dataSource={stars.slice(0, 100)}
                  columns={[
                    { title: 'STAR ID', dataIndex: 'id', key: 'id', width: 100, ellipsis: true },
                    { title: 'Charge Time', dataIndex: 'charge_timestamp', key: 'charge_timestamp', width: 180, render: (val) => dayjs(val).format('YYYY-MM-DD HH:mm') },
                    { title: 'Discharge Time', dataIndex: 'discharge_timestamp', key: 'discharge_timestamp', width: 180, render: (val) => dayjs(val).format('YYYY-MM-DD HH:mm') },
                    { title: 'Pre-Loss (MWh)', dataIndex: 'pre_loss_mwh', key: 'pre_loss_mwh', width: 120, render: (val) => parseFloat(val).toFixed(3) },
                    { title: 'Net (MWh)', dataIndex: 'net_mwh', key: 'net_mwh', width: 120, render: (val) => parseFloat(val).toFixed(3) },
                    { title: 'Loss (MWh)', dataIndex: 'loss_mwh', key: 'loss_mwh', width: 120, render: (val) => parseFloat(val).toFixed(3) },
                    {
                      title: 'Method',
                      key: 'method',
                      width: 120,
                      render: (_, record) => {
                        const method = record.allocation_json?.allocation_method || 'unknown';
                        return <Tag color={method === 'soc_guided' ? 'blue' : 'default'}>{method}</Tag>;
                      },
                    },
                  ]}
                  pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] }}
                  size="small"
                  scroll={{ x: 1000 }}
                />
                {stars.length > 100 && (
                  <Text type="secondary" style={{ marginTop: 10, display: 'block' }}>
                    Showing first 100 of {stars.length} STARs
                  </Text>
                )}
              </Card>
            )}
          </>
        ) : (
          !loading && (
            <Card>
              <Text type="secondary">Select a report and click "Load Report" to view allocation diagnostics</Text>
            </Card>
          )
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <div style={{ marginTop: 20 }}>
              <Text>Loading report data...</Text>
            </div>
          </div>
        )}
      </Space>
    </div>
  );
}

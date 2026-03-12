import React, { useState, useEffect } from "react";
import { Card, Row, Col, Statistic, Typography, Space, Select, DatePicker, Button, Spin, Alert, Table, Tag } from "antd";
import { ThunderboltFilled, ThunderboltOutlined, LineChartOutlined, ReloadOutlined } from "@ant-design/icons";
import Plot from 'react-plotly.js';
import dayjs from "dayjs";

import { getSTARReportAPI, getSOCSnapshotsAPI } from "../api/storageAPI";
import { getAllAccessibleDevicesAPI } from "../api/deviceAPI";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const STARReportPage = () => {
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [dateRange, setDateRange] = useState([dayjs().subtract(7, 'days'), dayjs()]);
  const [reportData, setReportData] = useState(null);
  const [socData, setSOCData] = useState([]);

  // Load devices on mount
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await getAllAccessibleDevicesAPI(true);
      const deviceList = response.data?.devices || [];
      const isStorage = (d) => {
        if (d?.is_storage) return true;
        const tech = String(d?.technology_type || d?.technology || "").toLowerCase();
        return tech === "battery_storage" || tech === "other_storage";
      };
      const storageDevices = deviceList.filter(isStorage);
      setDevices(storageDevices);
      
      if (storageDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(storageDevices[0].id);
      }
    } catch (error) {
      console.error("Failed to load devices:", error);
    }
  };

  const loadReport = async () => {
    if (!selectedDevice) return;

    setLoading(true);
    try {
      const params = {
        start_date: dateRange[0].toISOString(),
        end_date: dateRange[1].toISOString(),
      };

      // Fetch STAR data
      const starResponse = await getSTARReportAPI(selectedDevice, params);
      setReportData(starResponse.data);

      // Fetch SOC snapshots
      const socResponse = await getSOCSnapshotsAPI({
        asset_id: selectedDevice,
        ...params,
      });
      setSOCData(socResponse.data || []);
    } catch (error) {
      console.error("Failed to load report:", error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load when device or date range changes
  useEffect(() => {
    if (selectedDevice) {
      loadReport();
    }
  }, [selectedDevice]);

  const renderEnergyChart = () => {
    if (!reportData?.stars || !reportData.stars.length) return null;

    const stars = reportData.stars;

    // Group by hour for stacked view
    const chargeByHour = {};
    const dischargeByHour = {};
    const lossByHour = {};

    stars.forEach(star => {
      const chargeHour = dayjs(star.charge_hour).format("YYYY-MM-DD HH:00");
      const dischargeHour = dayjs(star.discharge_timestamp).format("YYYY-MM-DD HH:00");

      chargeByHour[chargeHour] = (chargeByHour[chargeHour] || 0) + parseFloat(star.pre_loss_mwh);
      dischargeByHour[dischargeHour] = (dischargeByHour[dischargeHour] || 0) + parseFloat(star.net_mwh);
      lossByHour[dischargeHour] = (lossByHour[dischargeHour] || 0) + parseFloat(star.loss_mwh);
    });

    const allHours = [...new Set([...Object.keys(chargeByHour), ...Object.keys(dischargeByHour)])].sort();

    return (
      <Plot
        data={[
          {
            x: allHours,
            y: allHours.map(h => chargeByHour[h] || 0),
            type: 'bar',
            name: 'Charge (Pre-Loss)',
            marker: { color: '#1890ff' },
          },
          {
            x: allHours,
            y: allHours.map(h => dischargeByHour[h] || 0),
            type: 'bar',
            name: 'Discharge (Net)',
            marker: { color: '#52c41a' },
          },
          {
            x: allHours,
            y: allHours.map(h => lossByHour[h] || 0),
            type: 'bar',
            name: 'Losses',
            marker: { color: '#faad14' },
          },
        ]}
        layout={{
          title: 'Energy Flow by Hour',
          barmode: 'group',
          xaxis: { title: 'Hour' },
          yaxis: { title: 'Energy (MWh)' },
          height: 400,
        }}
        config={{ responsive: true }}
        style={{ width: '100%' }}
      />
    );
  };

  const renderSOCChart = () => {
    if (!socData || !socData.length) return null;

    const hours = socData.map(s => dayjs(s.hour).format("YYYY-MM-DD HH:00"));
    const socProxy = socData.map(s => parseFloat(s.soc_proxy_mwh));
    const socEffective = socData.map(s => parseFloat(s.soc_effective_mwh));
    const socTelemetry = socData.map(s => s.soc_telemetry_pct !== null ? 
      (parseFloat(s.soc_telemetry_pct) / 100 * parseFloat(s.capacity_mwh || 0)) : null
    );

    const traces = [
      {
        x: hours,
        y: socEffective,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'SOC Effective',
        line: { color: '#1890ff', width: 3 },
      },
      {
        x: hours,
        y: socProxy,
        type: 'scatter',
        mode: 'lines',
        name: 'SOC Proxy',
        line: { color: '#52c41a', dash: 'dash' },
      },
    ];

    if (socTelemetry.some(v => v !== null)) {
      traces.push({
        x: hours,
        y: socTelemetry,
        type: 'scatter',
        mode: 'markers',
        name: 'SOC Telemetry',
        marker: { color: '#722ed1', size: 8 },
      });
    }

    return (
      <Plot
        data={traces}
        layout={{
          title: 'State of Charge (SOC) Over Time',
          xaxis: { title: 'Hour' },
          yaxis: { title: 'SOC (MWh)' },
          height: 400,
        }}
        config={{ responsive: true }}
        style={{ width: '100%' }}
      />
    );
  };

  const renderRecordCounts = () => {
    if (!reportData?.stars) return null;

    const stars = reportData.stars;
    const byHour = {};

    stars.forEach(star => {
      const hour = dayjs(star.charge_hour).format("YYYY-MM-DD HH:00");
      byHour[hour] = (byHour[hour] || 0) + 1;
    });

    const hours = Object.keys(byHour).sort();

    return (
      <Plot
        data={[
          {
            x: hours,
            y: hours.map(h => byHour[h]),
            type: 'bar',
            name: 'STAR Count',
            marker: { color: '#722ed1' },
          },
        ]}
        layout={{
          title: 'STARs Issued per Hour',
          xaxis: { title: 'Charge Hour' },
          yaxis: { title: 'Number of STARs' },
          height: 300,
        }}
        config={{ responsive: true }}
        style={{ width: '100%' }}
      />
    );
  };

  const renderSummaryStats = () => {
    if (!reportData) return null;

    const { stars = [] } = reportData;
    const totalPreLoss = stars.reduce((sum, s) => sum + parseFloat(s.pre_loss_mwh || 0), 0);
    const totalNet = stars.reduce((sum, s) => sum + parseFloat(s.net_mwh || 0), 0);
    const totalLoss = stars.reduce((sum, s) => sum + parseFloat(s.loss_mwh || 0), 0);
    const rte = totalPreLoss > 0 ? (totalNet / totalPreLoss) * 100 : 0;

    // Energy conservation check
    const conserved = Math.abs(totalPreLoss - totalNet - totalLoss) < 0.001;

    return (
      <>
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total STARs"
                value={stars.length}
                prefix={<ThunderboltFilled />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Charge Energy"
                value={totalPreLoss.toFixed(3)}
                suffix="MWh"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Discharge Energy"
                value={totalNet.toFixed(3)}
                suffix="MWh"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Losses"
                value={totalLoss.toFixed(3)}
                suffix="MWh"
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="Round-Trip Efficiency"
                value={rte.toFixed(2)}
                suffix="%"
                valueStyle={{ color: rte >= 85 ? '#52c41a' : '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={16}>
            <Card>
              <Space direction="vertical" size="small">
                <Text strong>Energy Conservation Verification:</Text>
                <div>
                  <Text>Pre-Loss Energy: {totalPreLoss.toFixed(6)} MWh</Text>
                </div>
                <div>
                  <Text>− Losses: {totalLoss.toFixed(6)} MWh</Text>
                </div>
                <div style={{ borderTop: '1px solid #d9d9d9', paddingTop: 4 }}>
                  <Text strong>= Net Energy: {totalNet.toFixed(6)} MWh</Text>
                </div>
                {conserved ? (
                  <Tag color="success">✓ Energy Conserved (within 0.001 MWh)</Tag>
                ) : (
                  <Tag color="error">⚠ Energy Balance Mismatch</Tag>
                )}
              </Space>
            </Card>
          </Col>
        </Row>
      </>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={2}>
            <LineChartOutlined /> STAR Report
          </Title>
          <Text type="secondary">
            Timeseries analysis of Storage Time Allocation Records with energy conservation verification
          </Text>
        </div>

        {/* Filters */}
        <Card>
          <Space size="large">
            <Space direction="vertical" size="small">
              <Text strong>Storage Asset:</Text>
              <Select
                style={{ width: 300 }}
                placeholder="Select storage device"
                value={selectedDevice}
                onChange={setSelectedDevice}
                options={devices.map(d => ({
                  value: d.id,
                  label: `${d.device_name || d.name} (${d.nameplate_capacity_mw || 0} MW)`,
                }))}
              />
            </Space>

            <Space direction="vertical" size="small">
              <Text strong>Date Range:</Text>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="YYYY-MM-DD"
              />
            </Space>

            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={loadReport}
              loading={loading}
              style={{ marginTop: 24 }}
            >
              Load Report
            </Button>
          </Space>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card>
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text>Loading STAR report data...</Text>
              </div>
            </div>
          </Card>
        )}

        {/* Report Content */}
        {!loading && reportData && (
          <>
            {/* Summary Statistics */}
            {renderSummaryStats()}

            {/* Energy Flow Chart */}
            <Card title="Energy Flow Timeseries">
              {renderEnergyChart()}
            </Card>

            {/* SOC Chart */}
            <Card title="State of Charge (SOC) Tracking">
              {renderSOCChart()}
              {socData.length > 0 && (
                <Alert
                  message="SOC Data Available"
                  description={`${socData.length} hourly SOC snapshots. Blue line shows effective SOC used for allocation. Dashed green shows computed proxy from net flows. Purple dots show telemetry (if available).`}
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
            </Card>

            {/* Record Counts */}
            <Card title="STAR Issuance Distribution">
              {renderRecordCounts()}
            </Card>

            {/* Detailed Table */}
            <Card title="STAR Details">
              <Table
                dataSource={reportData.stars}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10 }}
                columns={[
                  {
                    title: "Charge Hour",
                    dataIndex: "charge_hour",
                    render: (h) => dayjs(h).format("YYYY-MM-DD HH:mm"),
                    sorter: (a, b) => new Date(a.charge_hour) - new Date(b.charge_hour),
                  },
                  {
                    title: "Discharge Hour",
                    dataIndex: "discharge_timestamp",
                    render: (h) => dayjs(h).format("YYYY-MM-DD HH:mm"),
                  },
                  {
                    title: "Pre-Loss (MWh)",
                    dataIndex: "pre_loss_mwh",
                    render: (v) => parseFloat(v).toFixed(3),
                    align: 'right',
                  },
                  {
                    title: "Loss (MWh)",
                    dataIndex: "loss_mwh",
                    render: (v) => parseFloat(v).toFixed(3),
                    align: 'right',
                  },
                  {
                    title: "Net (MWh)",
                    dataIndex: "net_mwh",
                    render: (v) => parseFloat(v).toFixed(3),
                    align: 'right',
                  },
                  {
                    title: "Time Shift",
                    render: (_, record) => {
                      const hours = dayjs(record.discharge_timestamp).diff(dayjs(record.charge_hour), 'hours');
                      return <Tag color="blue">{hours}h</Tag>;
                    },
                  },
                ]}
              />
            </Card>
          </>
        )}

        {/* Empty State */}
        {!loading && !reportData && (
          <Card>
            <div style={{ textAlign: 'center', padding: 40 }}>
              <ThunderboltFilled style={{ fontSize: 48, color: '#d9d9d9' }} />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Select a storage device and date range, then click "Load Report"</Text>
              </div>
            </div>
          </Card>
        )}
      </Space>
    </div>
  );
};

export default STARReportPage;



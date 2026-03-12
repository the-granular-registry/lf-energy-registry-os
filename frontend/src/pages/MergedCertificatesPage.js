import React, { useMemo, useState, useEffect } from "react";
import {
  Table,
  Typography,
  Card,
  message,
  Space,
  Button,
  Row,
  Col,
  Statistic,
  Input,
  DatePicker,
} from "antd";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { getMergedCertificatesAPI } from "../api/storageAPI";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

dayjs.extend(utc);

const fmt = (n) => Number(n || 0).toFixed(3);

const SHIFT_BUCKETS = [
  { label: "0–4h", min: 0, max: 4 },
  { label: "4–8h", min: 4, max: 8 },
  { label: "8–12h", min: 8, max: 12 },
  { label: "12h+", min: 12, max: Number.POSITIVE_INFINITY },
];

const bucketShiftHours = (hours) => {
  const h = Number(hours);
  if (!Number.isFinite(h)) return null;
  for (const b of SHIFT_BUCKETS) {
    if (h >= b.min && h < b.max) return b.label;
  }
  return null;
};

const MergedCertificatesPage = () => {
  const [mergedCerts, setMergedCerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 100,
    total: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState(null);

  const fetchMergedCertificates = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: pagination.pageSize,
      };

      if (dateRange?.[0] && dateRange?.[1]) {
        params.start_date = dateRange[0].toISOString();
        params.end_date = dateRange[1].toISOString();
      }

      const response = await getMergedCertificatesAPI(params);
      const data = response.data || {};
      setMergedCerts(data.merged_certificates || []);
      setPagination((prev) => ({
        ...prev,
        current: page,
        total: data.total || 0,
      }));
    } catch (error) {
      message.error(`Error loading merged certificates: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMergedCertificates(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return mergedCerts;

    return mergedCerts.filter((r) => {
      const star = String(r.star_id || "").toLowerCase();
      const gc = String(r.gc_bundle_id || "").toLowerCase();
      const dev = String(r.gc_device_name || "").toLowerCase();
      return star.includes(q) || gc.includes(q) || dev.includes(q);
    });
  }, [mergedCerts, searchText]);

  const summary = useMemo(() => {
    let charge = 0;
    let loss = 0;
    let discharge = 0;
    let shift = 0;

    filteredRows.forEach((r) => {
      charge += Number(r.star_net_mwh || 0);
      loss += Number(r.star_loss_mwh || 0);
      discharge += Number(r.star_net_mwh || 0) - Number(r.star_loss_mwh || 0);
      shift += Number(r.time_shift_hours || 0);
    });

    const count = filteredRows.length;
    const efficiency = charge > 0 ? (discharge / charge) * 100 : 0;

    return {
      count,
      charge,
      loss,
      discharge,
      efficiency,
      avgShift: count > 0 ? shift / count : 0,
    };
  }, [filteredRows]);

  const shiftHistogram = useMemo(() => {
    const counts = Object.fromEntries(SHIFT_BUCKETS.map((b) => [b.label, 0]));
    filteredRows.forEach((r) => {
      const bucket = bucketShiftHours(r.time_shift_hours);
      if (!bucket) return;
      counts[bucket] += 1;
    });

    const labels = SHIFT_BUCKETS.map((b) => b.label);
    const data = labels.map((l) => counts[l] || 0);
    return { labels, data };
  }, [filteredRows]);

  const handleTableChange = (newPagination) => {
    fetchMergedCertificates(newPagination.current);
  };

  const exportToCSV = () => {
    const csvRows = [];
    csvRows.push(
      [
        "STAR ID",
        "Charge Time",
        "Discharge Time",
        "Time Shift (hours)",
        "Charge Energy (MWh)",
        "Loss (MWh)",
        "Discharge Energy (MWh)",
        "GC Bundle ID",
        "Device Name",
        "Production Start",
        "Production End",
      ].join(",")
    );

    filteredRows.forEach((cert) => {
      const charge = Number(cert.star_net_mwh || 0);
      const loss = Number(cert.star_loss_mwh || 0);
      const discharge = charge - loss;

      csvRows.push(
        [
          cert.star_id,
          cert.star_charge_time,
          cert.star_discharge_time,
          cert.time_shift_hours,
          charge.toFixed(6),
          loss.toFixed(6),
          discharge.toFixed(6),
          cert.gc_bundle_id,
          `"${cert.gc_device_name || ""}"`,
          cert.gc_production_start,
          cert.gc_production_end,
        ].join(",")
      );
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `merged_star_report_${dayjs().format("YYYY-MM-DD_HHmm")}.csv`;
    link.click();
  };

  const columns = [
    {
      title: "STAR ID",
      dataIndex: "star_id",
      key: "star_id",
      width: 230,
      render: (text) => <Text code>{String(text || "").slice(0, 12)}...</Text>,
    },
    {
      title: "GC Bundle",
      dataIndex: "gc_bundle_id",
      key: "gc_bundle_id",
      width: 230,
      render: (text) => <Text code>{String(text || "").slice(0, 14)}...</Text>,
    },
    {
      title: "Charge",
      dataIndex: "star_charge_time",
      key: "charge_time",
      width: 150,
      render: (text) => dayjs(text).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "Discharge",
      dataIndex: "star_discharge_time",
      key: "discharge_time",
      width: 150,
      render: (text) => dayjs(text).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "Shift (h)",
      dataIndex: "time_shift_hours",
      key: "time_shift",
      width: 90,
      align: "right",
      sorter: (a, b) => Number(a.time_shift_hours || 0) - Number(b.time_shift_hours || 0),
    },
    {
      title: "Charge MWh",
      dataIndex: "star_net_mwh",
      key: "charge_mwh",
      width: 110,
      align: "right",
      render: (val) => fmt(val),
      sorter: (a, b) => Number(a.star_net_mwh || 0) - Number(b.star_net_mwh || 0),
    },
    {
      title: "Loss MWh",
      dataIndex: "star_loss_mwh",
      key: "loss_mwh",
      width: 100,
      align: "right",
      render: (val) => fmt(val),
    },
    {
      title: "Discharge MWh",
      key: "discharge_mwh",
      width: 120,
      align: "right",
      render: (_, row) => fmt(Number(row.star_net_mwh || 0) - Number(row.star_loss_mwh || 0)),
    },
    {
      title: "Device",
      dataIndex: "gc_device_name",
      key: "gc_device_name",
      width: 220,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Title level={3} style={{ margin: 0 }}>Merged STAR Report</Title>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => fetchMergedCertificates(1)}>
                Refresh
              </Button>
              <Button type="primary" icon={<DownloadOutlined />} onClick={exportToCSV} disabled={!filteredRows.length}>
                Export CSV
              </Button>
            </Space>
          </div>

          <Row gutter={12}>
            <Col span={5}><Statistic title="Merged Count" value={summary.count} /></Col>
            <Col span={5}><Statistic title="Charge Energy (MWh)" value={summary.charge} precision={3} /></Col>
            <Col span={5}><Statistic title="Storage Loss (MWh)" value={summary.loss} precision={3} /></Col>
            <Col span={5}><Statistic title="Avg Efficiency (%)" value={summary.efficiency} precision={2} /></Col>
            <Col span={4}><Statistic title="Avg Time Shift (h)" value={summary.avgShift} precision={2} /></Col>
          </Row>

          <Space wrap>
            <Input.Search
              allowClear
              placeholder="Search STAR ID / GC bundle / device"
              style={{ width: 360 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <RangePicker
              showTime
              value={dateRange}
              onChange={(val) => setDateRange(val)}
            />
          </Space>

          <Card size="small" title="Time-Shift Histogram" style={{ marginTop: 8 }}>
            <Bar
              data={{
                labels: shiftHistogram.labels,
                datasets: [
                  {
                    label: "Merged records",
                    data: shiftHistogram.data,
                    backgroundColor: "rgba(24, 144, 255, 0.55)",
                    borderColor: "rgba(24, 144, 255, 1)",
                    borderWidth: 1,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  title: { display: false },
                },
                scales: {
                  x: { grid: { display: false } },
                  y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                  },
                },
              }}
              height={180}
            />
          </Card>

          <Table
            columns={columns}
            dataSource={filteredRows}
            loading={loading}
            rowKey={(r) => `${r.star_id}-${r.gc_bundle_id}`}
            pagination={{
              ...pagination,
              showSizeChanger: false,
              showTotal: (total) => `Total ${total} merged records`,
            }}
            onChange={handleTableChange}
            scroll={{ x: 1500 }}
          />
        </Space>
      </Card>
    </div>
  );
};

export default MergedCertificatesPage;

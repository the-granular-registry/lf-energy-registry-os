import React, { useEffect, useMemo, useState } from "react";
import { Table, Card, Typography, Space, Button, Form, DatePicker, Select, message } from "antd";
import dayjs from "dayjs";
import { getWattTimeStats, syncWattTime, backfillWattTime } from "@api/dataSourcesAPI";

const { Title } = Typography;

const WattTimePage = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [zones, setZones] = useState([]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const resp = await getWattTimeStats();
      const rows = resp.data || [];
      setData(rows);
      setZones(Array.from(new Set(rows.map((r) => r.region))).sort());
    } catch (e) {
      message.error("Failed to load WattTime stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const columns = useMemo(
    () => [
      { title: "Region", dataIndex: "region", key: "region" },
      { title: "Min Hour (UTC)", dataIndex: "min_hour_utc", key: "min_hour_utc", render: (v) => (v ? new Date(v).toISOString() : "-") },
      { title: "Max Hour (UTC)", dataIndex: "max_hour_utc", key: "max_hour_utc", render: (v) => (v ? new Date(v).toISOString() : "-") },
      { title: "Row Count", dataIndex: "hours_count", key: "hours_count" },
      { title: "Missing Hours", dataIndex: "missing_hours", key: "missing_hours" },
      { title: "Latest Sync", dataIndex: "latest_sync_at", key: "latest_sync_at", render: (v) => (v ? new Date(v).toISOString() : "-") },
    ],
    []
  );

  const [form] = Form.useForm();

  const handleSync = async () => {
    const zone = form.getFieldValue("zone");
    if (!zone) {
      message.warning("Select a zone to sync");
      return;
    }
    setLoading(true);
    try {
      await syncWattTime(zone, true);
      message.success("Sync triggered");
      await fetchStats();
    } catch (e) {
      message.error("Failed to sync");
    } finally {
      setLoading(false);
    }
  };

  const handleBackfill = async () => {
    const values = form.getFieldsValue();
    const selectedZones = values.zones || [];
    const range = values.range || [];
    if (!selectedZones.length || range.length !== 2) {
      message.warning("Select zones and a date range");
      return;
    }
    const start_iso = dayjs(range[0]).startOf("hour").toISOString();
    const end_iso = dayjs(range[1]).startOf("hour").toISOString();
    setLoading(true);
    try {
      await backfillWattTime(selectedZones, start_iso, end_iso);
      message.success("Backfill triggered");
      await fetchStats();
    } catch (e) {
      message.error("Failed to backfill");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Title level={3}>WattTime</Title>

        <Card title="Actions">
          <Form form={form} layout="inline">
            <Form.Item name="zone" label="Zone">
              <Select style={{ minWidth: 220 }} placeholder="Select zone">
                {zones.map((z) => (
                  <Select.Option value={z} key={z}>{z}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item>
              <Button type="primary" onClick={handleSync} loading={loading}>Sync to Now</Button>
            </Form.Item>
            <Form.Item name="zones" label="Backfill Zones">
              <Select mode="multiple" style={{ minWidth: 360 }} placeholder="Select zones">
                {zones.map((z) => (
                  <Select.Option value={z} key={z}>{z}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="range" label="Date Range">
              <DatePicker.RangePicker showTime={{ format: "HH:00" }} />
            </Form.Item>
            <Form.Item>
              <Button onClick={handleBackfill} loading={loading}>Backfill</Button>
            </Form.Item>
          </Form>
        </Card>

        <Card title="Zone Summary">
          <Table rowKey={(r) => r.region} loading={loading} dataSource={data} columns={columns} pagination={{ pageSize: 20 }} />
        </Card>
      </Space>
    </div>
  );
};

export default WattTimePage;


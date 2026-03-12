import React, { useEffect, useMemo, useState } from "react";
import { Table, Card, Typography, Space, message } from "antd";
import { getMBERStats } from "@api/dataSourcesAPI";

const { Title } = Typography;

const MBERPage = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const resp = await getMBERStats();
      setData(resp.data || []);
    } catch (e) {
      message.error("Failed to load MBER stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const columns = useMemo(
    () => [
      { title: "Balancing Authority", dataIndex: "balancing_authority", key: "balancing_authority" },
      { title: "Min Hour (UTC)", dataIndex: "min_hour_utc", key: "min_hour_utc", render: (v) => (v ? new Date(v).toISOString() : "-") },
      { title: "Max Hour (UTC)", dataIndex: "max_hour_utc", key: "max_hour_utc", render: (v) => (v ? new Date(v).toISOString() : "-") },
      { title: "Row Count", dataIndex: "row_count", key: "row_count" },
      { title: "Missing Hours", dataIndex: "missing_hours", key: "missing_hours" },
    ],
    []
  );

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Title level={3}>MBER</Title>
        <Card title="Summary">
          <Table rowKey={(r) => r.balancing_authority + (r.min_hour_utc || "")} loading={loading} dataSource={data} columns={columns} pagination={{ pageSize: 20 }} />
        </Card>
      </Space>
    </div>
  );
};

export default MBERPage;


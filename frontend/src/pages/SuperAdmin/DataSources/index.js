import React, { useMemo } from "react";
import { Card, List, Typography } from "antd";
import { Link } from "react-router-dom";

const { Title, Paragraph } = Typography;

const DataSourcesIndex = () => {
  const sources = useMemo(
    () => [
      { key: "watttime", name: "WattTime", path: "/super-admin/data-sources/watttime" },
      { key: "mber", name: "MBER", path: "/super-admin/data-sources/mber" },
      { key: "eia", name: "EIA", path: "/super-admin/data-sources/eia" },
    ],
    []
  );

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 8 }}>Data Sources</Title>
      <Paragraph style={{ marginBottom: 24 }}>
        View status summaries for external data sources and trigger updates where supported.
      </Paragraph>
      <Card>
        <List
          dataSource={sources}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={<Link to={item.path}>{item.name}</Link>}
                description={`Open ${item.name} data source summary`}
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default DataSourcesIndex;


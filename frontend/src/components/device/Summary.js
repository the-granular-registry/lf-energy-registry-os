import React, { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Card, Row, Col, Typography, Spin } from "antd";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
} from "chart.js";

import { getAccessibleDevicesSummaryAPI } from "../../api/deviceAPI";
import { logger } from "../../utils";

import styles from "./Device.module.css";

import { DEVICE_TECHNOLOGY_TYPE } from "../../enum";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale
);

// Update color mapping to use DEVICE_TECHNOLOGY_TYPE keys
const deviceTypeColors = {
  WIND_TURBINE: "#9CB4FC",
  SOLAR_PV: "#FDB022",
  BATTERY_STORAGE: "#F04438",
  HYDRO: "#1D53F7",
  OTHER_STORAGE: "#34C759",
  CHP: "#BDC1C6",
  OTHER: "#BDC1C6",
};

const Summary = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getAccessibleDevicesSummaryAPI();
        setSummaryData(response.data);
      } catch (err) {
        logger.error("Failed to fetch devices summary:", err);
        setError("Failed to load device summary data");
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryData();
  }, []);

  if (loading) {
    return (
      <Row gutter={16} style={{ width: "100%" }}>
        <Col span={24}>
          <Card bordered={false}>
            <div style={{ textAlign: "center", padding: "20px" }}>
              <Spin size="large" />
              <div style={{ marginTop: "10px" }}>Loading device summary...</div>
            </div>
          </Card>
        </Col>
      </Row>
    );
  }

  if (error) {
    return (
      <Row gutter={16} style={{ width: "100%" }}>
        <Col span={24}>
          <Card bordered={false}>
            <div style={{ textAlign: "center", padding: "20px", color: "#ff4d4f" }}>
              {error}
            </div>
          </Card>
        </Col>
      </Row>
    );
  }

  // Number of Devices chart data
  const numDevicesLabels = Object.keys(
    summaryData?.num_devices_by_type || {}
  ).map((key) => DEVICE_TECHNOLOGY_TYPE[key.toUpperCase()] || key);
  const numDevicesData = Object.values(
    summaryData?.num_devices_by_type || {}
  );
  const totalNumDevices = summaryData?.total_devices || 0;

  // Total capacity of Devices chart data
  const deviceCapacityLabels = Object.keys(
    summaryData?.device_capacity_by_type || {}
  ).map((key) => DEVICE_TECHNOLOGY_TYPE[key.toUpperCase()] || key);
  const deviceCapacityData = Object.values(
    summaryData?.device_capacity_by_type || {}
  ).map((value) => (value / 1000).toFixed(2)); // Convert kW to MW
  const totalCapacityDevices = ((summaryData?.total_capacity || 0) / 1000).toFixed(2); // Convert kW to MW

  // Update the totalDevicesData to use mapped colors
  const totalDevicesData = {
    labels: numDevicesLabels,
    datasets: [
      {
        data: numDevicesData,
        backgroundColor: numDevicesLabels.map(label => 
          deviceTypeColors[Object.keys(DEVICE_TECHNOLOGY_TYPE)
            .find(key => DEVICE_TECHNOLOGY_TYPE[key] === label)] || deviceTypeColors.OTHER
        ),
      },
    ],
  };

  // Data for Total Capacity Pie chart
  const totalCapacityData = {
    labels: deviceCapacityLabels,
    datasets: [
      {
        data: deviceCapacityData,
        backgroundColor: deviceCapacityLabels.map(label => 
          deviceTypeColors[Object.keys(DEVICE_TECHNOLOGY_TYPE)
            .find(key => DEVICE_TECHNOLOGY_TYPE[key] === label)] || deviceTypeColors.OTHER
        ),
      },
    ],
  };

  // Options for the Pie chart (to make it circular)
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem) {
            return `${tooltipItem.label}: ${Number(tooltipItem.raw).toFixed(2)} MW`; // Adds MW to the tooltip
          },
        },
      },
    },
    cutout: "70%",
  };

  const chartStyle = {
    maxHeight: "120px",
    maxWidth: "120px",
    flex: "1",
  };

  // Custom Legend Component for the image style
  const CustomLegend = ({ labels, colors, data, title, isCapacity }) => {
    return (
      <>
        <Typography.Title style={{ margin: "0" }} level={5}>
          {title}
        </Typography.Title>
        <div
          style={{
            // padding: "10px",
            marginTop: "8px",
            fontSize: "14px",
            display: "flex",
            justifyContent: "flex-start",
            flexFlow: "row wrap",
          }}
        >
          {labels.map((label, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "8px",
                width: "50%",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: colors[index],
                  marginRight: "10px",
                }}
              ></div>
              <span style={{ fontWeight: "bold" }}>{data[index]}</span>
              {isCapacity && (
                <span style={{ marginLeft: "8px", fontWeight: "bold" }}>
                  {" MW"}
                </span>
              )}
              <span style={{ marginLeft: "8px" }}>{` ${label}`}</span>
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <Row gutter={16} style={{ width: "100%" }}>
      {/* Total Devices Pie Chart */}
      <Col span={12}>
        <Card bordered={false}>
          <div className={styles["card-body"]}>
            <div
              style={{
                maxWidth: "50%",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Pie
                data={totalDevicesData}
                options={chartOptions}
                style={chartStyle}
              />
            </div>

            <div style={{ width: "90%" }}>
              <CustomLegend
                labels={numDevicesLabels}
                colors={numDevicesLabels.map(label => 
                  deviceTypeColors[Object.keys(DEVICE_TECHNOLOGY_TYPE)
                    .find(key => DEVICE_TECHNOLOGY_TYPE[key] === label)] || deviceTypeColors.OTHER
                )}
                data={numDevicesData}
                title={`${totalNumDevices} Total Devices`}
              />
            </div>
          </div>
        </Card>
      </Col>

      {/* Total Capacity Pie Chart */}
      <Col span={12}>
        <Card bordered={false}>
          <div className={styles["card-body"]}>
            <Pie
              data={totalCapacityData}
              options={chartOptions}
              style={chartStyle}
            />
            <div style={{ width: "90%" }}>
              <CustomLegend
                labels={deviceCapacityLabels}
                colors={deviceCapacityLabels.map(label => 
                  deviceTypeColors[Object.keys(DEVICE_TECHNOLOGY_TYPE)
                    .find(key => DEVICE_TECHNOLOGY_TYPE[key] === label)] || deviceTypeColors.OTHER
                )}
                data={deviceCapacityData}
                title={`${totalCapacityDevices} MW Total Capacity`}
                isCapacity={true}
              />
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default Summary;

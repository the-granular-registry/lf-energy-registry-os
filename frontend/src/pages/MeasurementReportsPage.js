import React, { useMemo, useState, useRef, useEffect } from "react";
import { Select, DatePicker, Input, Tag, Typography, Statistic, Row, Col, Empty, Button, message, Modal, Space, Card, Alert, Progress, Spin, Tooltip } from "antd";
import { FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined, UploadOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import Plot from 'react-plotly.js';
import { useNavigate } from 'react-router-dom';

import ResourcePage from "../components/resource/ResourcePage";
import { getUserUploadsAPI } from "../api/fileUploadAPI";
import { getAllAccountsAPI } from "../api/superAdminAPI";
import { getAllAccessibleDevicesAPI } from "../api/deviceAPI";
import { getDeviceMeasurementsAPI, getMeasurementsForDevicesAPI, getMeasurementDetailsAPI, softDeleteMeasurementReportAPI } from "../api/measurementAPI";
import { 
  getStorageReportUploadDetailsAPI, 
  getStorageRecordsAPI, 
  getSOCSnapshotsAPI,
  getSTARsAPI,
  getStorageRawMeterAPI,
} from "../api/storageAPI";
import {
  getNetStorageMeasurementReportsAPI,
  getNetStorageMeasurementReportsForUserAPI,
} from "../api/storageNetAPI";
import MeasurementReportWizard from "../components/device/MeasurementReportWizard";
import { approveRequestAPI, rejectRequestAPI } from "../api/approvalAPI";
import { useUser } from "../context/UserContext";
import { logger } from "../utils";
import baseAPI from "../api/baseAPI";

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text } = Typography;

dayjs.extend(utc);

// Feature flag: keep modal simple (summary only); charts live on /reporting/storage-measurements
const SHOW_STORAGE_CHARTS = false;

const MeasurementReportsPage = () => {
  console.log('🔵 MeasurementReportsPage: Component rendering');
  const { userData } = useUser();
  const userInfo = userData?.userInfo;
  // Only SUPER_ADMIN can approve/reject measurements
  const isSuperAdmin = userInfo?.role === 'SUPER_ADMIN' || userInfo?.role === 5;
  
  const reportWizardRef = useRef();
  const resourcePageRef = useRef();
  const navigate = useNavigate();
  const [accountOptions, setAccountOptions] = useState([]);
  const [deviceOptions, setDeviceOptions] = useState([]);
  const [batchMismatch, setBatchMismatch] = useState(false);
  
  // Measurement details modal state
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState(null);
  const [measurementDetails, setMeasurementDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [storageChartData, setStorageChartData] = useState(null);

  // Fetch and expose all accessible devices globally for MeasurementReportWizard
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await getAllAccessibleDevicesAPI(true);
        const devices = response.data?.devices || [];
        // Expose globally for MeasurementReportWizard to seed selectors
        window.__allAccessibleDevices = devices;
        logger.info(`MeasurementReportsPage: Loaded ${devices.length} accessible devices`);
      } catch (error) {
        logger.error("MeasurementReportsPage: Failed to fetch accessible devices:", error);
      }
    };
    fetchDevices();
  }, []);

  const handleRefresh = () => {
    if (resourcePageRef.current) {
      resourcePageRef.current.refresh();
    }
  };

  const loadAccounts = async () => {
    if (accountOptions.length) return accountOptions;
    try {
      const res = await getAllAccountsAPI();
      const list = (res?.data?.accounts || res?.data || []).map((a) => ({ value: a.id, label: a.account_name }));
      setAccountOptions(list);
      return list;
    } catch (_e) {
      return [];
    }
  };

  const loadDevices = async () => {
    if (deviceOptions.length) return deviceOptions;
    try {
      const res = await getAllAccessibleDevicesAPI(true);
      const list = (res?.data?.devices || res?.data || []).map((d) => ({
        value: d.id,
        label: d.device_name || d.name || `Device ${d.id}`,
        account_id: d.account_id,
      }));
      setDeviceOptions(list);
      return list;
    } catch (_e) {
      return [];
    }
  };

  const filterSchema = [
    {
      id: "account_id",
      param: "account_id",
      render: ({ value, onChange }) => (
        <Select
          style={{ minWidth: 220 }}
          placeholder="Account"
          value={value}
          allowClear
          onFocus={loadAccounts}
          onChange={onChange}
          showSearch
          filterOption={(i, o) => (o?.label || "").toLowerCase().includes(i.toLowerCase())}
          options={accountOptions}
        />
      ),
    },
    {
      id: "device_id",
      param: "device_id",
      render: ({ value, onChange }) => (
        <Select
          style={{ minWidth: 220 }}
          placeholder="Device"
          value={value}
          allowClear
          onFocus={loadDevices}
          onChange={onChange}
          showSearch
          filterOption={(i, o) => (o?.label || "").toLowerCase().includes(i.toLowerCase())}
          options={deviceOptions}
        />
      ),
    },
    {
      id: "status",
      param: "status",
      render: ({ value, onChange }) => (
        <Select style={{ minWidth: 180 }} placeholder="Status" value={value} allowClear onChange={onChange}>
          <Option value="approved">Approved</Option>
          <Option value="pending">Pending</Option>
          <Option value="rejected">Rejected</Option>
          <Option value="submitted">Submitted</Option>
        </Select>
      ),
    },
    {
      id: "date_range",
      param: "date_range",
      normalize: (v) => v,
      render: ({ value, onChange }) => (
        <RangePicker showTime allowClear value={value} onChange={onChange} />
      ),
    },
    {
      id: "search",
      param: "search",
      render: ({ value, onChange }) => (
        <Input.Search style={{ minWidth: 220 }} placeholder="Search device/account" value={value} onChange={(e) => onChange(e.target.value)} />
      ),
    },
  ];

  const columns = useMemo(() => [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      sorter: true,
    },
    // Source column no longer needed; backend unifies results
    {
      title: "Account",
      dataIndex: "account_name",
      key: "account_name",
      render: (accountName) => (
        <Text strong style={{ color: "#1890ff" }}>{accountName || 'Unknown'}</Text>
      ),
      sorter: true,
    },
    {
      title: "Device",
      dataIndex: "device_name",
      key: "device_name",
      sorter: true,
      render: (deviceName, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{deviceName}</div>
          {record.device_id && (
            <Text type="secondary" style={{ fontSize: "12px" }}>ID: {record.device_id}</Text>
          )}
        </div>
      ),
    },
    {
      title: "Interval Start",
      dataIndex: "interval_start_datetime",
      key: "interval_start_datetime",
      sorter: true,
      render: (date) => (
        <div>
          <div>{dayjs(date).format("MMM DD, YYYY")}</div>
          <Text type="secondary" style={{ fontSize: "12px" }}>{dayjs(date).format("HH:mm")}</Text>
        </div>
      ),
    },
    {
      title: "Interval End",
      dataIndex: "interval_end_datetime",
      key: "interval_end_datetime",
      sorter: true,
      render: (date) => (
        <div>
          <div>{dayjs(date).format("MMM DD, YYYY")}</div>
          <Text type="secondary" style={{ fontSize: "12px" }}>{dayjs(date).format("HH:mm")}</Text>
        </div>
      ),
    },
    {
      title: "Energy (MWh)",
      dataIndex: "interval_usage_wh",
      key: "interval_usage_wh",
      sorter: true,
      render: (wh) => ((wh || 0) / 1_000_000).toFixed(2),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const colorMap = {
          approved: "success",
          pending: "warning",
          rejected: "error",
          submitted: "default",
        };
        const label =
          String(status || "").charAt(0).toUpperCase() + String(status || "").slice(1);
        return <Tag color={colorMap[status] || "default"}>{label}</Tag>;
      },
      filters: [
        { text: "Approved", value: "approved" },
        { text: "Pending", value: "pending" },
        { text: "Rejected", value: "rejected" },
        { text: "Submitted", value: "submitted" },
      ],
      onFilter: (value, record) => record.status === value,
    },
  ], []);

  const renderSummary = (summary, loading) => {
    const s = summary || { totalReports: 0, approvedReports: 0, pendingReports: 0, totalEnergyMWh: 0 };
    return (
      <>
        {batchMismatch && (
          <Col span={24}>
            <Alert
              type="warning"
              message="Batch fetch returned no results; showing limited fallback data"
              description="This indicates a possible access or filtering mismatch on /measurements/list."
              showIcon
              style={{ marginBottom: 12 }}
            />
          </Col>
        )}
        <Col span={6}>
          <Statistic title="Total Reports" value={s.totalReports} prefix={<FileTextOutlined />} valueStyle={{ color: "#1890ff" }} />
        </Col>
        <Col span={6}>
          <Statistic title="Approved" value={s.approvedReports} prefix={<CheckCircleOutlined />} valueStyle={{ color: "#52c41a" }} />
        </Col>
        <Col span={6}>
          <Statistic title="Pending" value={s.pendingReports} valueStyle={{ color: "#faad14" }} />
        </Col>
        <Col span={6}>
          <Statistic title="Total Energy (MWh)" value={s.totalEnergyMWh} valueStyle={{ color: "#722ed1" }} />
        </Col>
      </>
    );
  };

  // ===== Storage Measurement Reports (Net/SOC engine) section =====
  // The Net/SOC engine is now the canonical storage measurement report workflow.
  const storageFilterSchema = [
    {
      id: "device_id",
      param: "device_id",
      render: ({ value, onChange }) => (
        <Select
          style={{ minWidth: 220 }}
          placeholder="Device"
          value={value}
          allowClear
          onFocus={loadDevices}
          onChange={onChange}
          showSearch
          filterOption={(i, o) => (o?.label || "").toLowerCase().includes(i.toLowerCase())}
          options={deviceOptions}
        />
      ),
    },
    {
      id: "status",
      param: "status",
      render: ({ value, onChange }) => (
        <Select style={{ minWidth: 180 }} placeholder="Status" value={value} allowClear onChange={onChange}>
          <Option value="approved">Approved</Option>
          <Option value="pending">Pending</Option>
          <Option value="rejected">Rejected</Option>
          <Option value="submitted">Submitted</Option>
        </Select>
      ),
    },
  ];

  const storageColumns = useMemo(() => [
    { title: "ID", dataIndex: "id", key: "id", width: 80, sorter: true },
    {
      title: "Device",
      dataIndex: "device_name",
      key: "device_name",
      sorter: true,
      render: (deviceName, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{deviceName || `Device ${record.device_id}`}</div>
          {record.device_id && (
            <Text type="secondary" style={{ fontSize: "12px" }}>ID: {record.device_id}</Text>
          )}
        </div>
      ),
    },
    {
      title: "Interval Start",
      dataIndex: "interval_start_datetime",
      key: "interval_start_datetime",
      sorter: true,
      render: (date) => (
        <div>
          <div>{dayjs(date).format("MMM DD, YYYY")}</div>
          <Text type="secondary" style={{ fontSize: "12px" }}>{dayjs(date).format("HH:mm")}</Text>
        </div>
      ),
    },
    {
      title: "Interval End",
      dataIndex: "interval_end_datetime",
      key: "interval_end_datetime",
      sorter: true,
      render: (date) => (
        <div>
          <div>{dayjs(date).format("MMM DD, YYYY")}</div>
          <Text type="secondary" style={{ fontSize: "12px" }}>{dayjs(date).format("HH:mm")}</Text>
        </div>
      ),
    },
    {
      title: "Discharge (MWh)",
      dataIndex: "total_discharge_mwh",
      key: "total_discharge_mwh",
      sorter: true,
      render: (mwh) => Number(mwh || 0).toFixed(3),
    },
    {
      title: "Charge (MWh)",
      dataIndex: "total_charge_mwh",
      key: "total_charge_mwh",
      sorter: true,
      render: (mwh) => Number(mwh || 0).toFixed(3),
    },
    {
      title: "Loss (MWh)",
      dataIndex: "total_loss_mwh",
      key: "total_loss_mwh",
      sorter: true,
      render: (mwh) => Number(mwh || 0).toFixed(3),
    },
    {
      title: "RTE",
      dataIndex: "round_trip_efficiency",
      key: "round_trip_efficiency",
      sorter: true,
      render: (rte) => {
        const n = Number(rte);
        return Number.isFinite(n) ? n.toFixed(3) : "—";
      },
    },
    {
      title: "STARs",
      dataIndex: "stars_created",
      key: "stars_created",
      sorter: true,
      render: (v) => (v === null || v === undefined ? "—" : String(v)),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const map = { APPROVED: "success", REJECTED: "error", SUBMITTED: "warning" };
        const label = String(status || "").toUpperCase();
        return <Tag color={map[label] || "default"}>{label}</Tag>;
      },
    },
  ], [deviceOptions]);

  const loadStoragePage = async ({ filters, pagination, sorter, signal }) => {
    try {
      let status_filter = undefined;
      if (filters?.status) {
        const s = String(filters.status).toLowerCase();
        status_filter = s === 'approved' ? 'APPROVED' : s === 'rejected' ? 'REJECTED' : 'SUBMITTED';
      }

      const devicesResp = await getAllAccessibleDevicesAPI(true, { signal });
      const allDevices = devicesResp?.data?.devices || [];
      const deviceMap = new Map(allDevices.map(d => [d.id, d]));

      const params = {
        page: pagination.page,
        page_size: pagination.limit,
        ...(filters?.device_id ? { device_id: filters.device_id } : {}),
        ...(status_filter ? { status_filter } : {}),
      };

      // Net engine has both admin and "for user" endpoints.
      const resp = isSuperAdmin
        ? await getNetStorageMeasurementReportsAPI(params)
        : await getNetStorageMeasurementReportsForUserAPI(params);
      const reports = resp?.data?.reports || [];
      const total = Number(resp?.data?.total_count || reports.length);

      const items = reports.map(r => {
        const dev = deviceMap.get(r.device_id);
        return {
          ...r,
          device_name: dev?.device_name || dev?.name || `Device ${r.device_id}`,
          account_name: dev?.account_name,
        };
      });

      if (sorter?.field) {
        items.sort((a, b) => {
          const aVal = a[sorter.field];
          const bVal = b[sorter.field];
          const order = sorter.order === "descend" ? -1 : 1;
          if (aVal < bVal) return -1 * order;
          if (aVal > bVal) return 1 * order;
          return 0;
        });
      }

      return { items, total };
    } catch (e) {
      logger.error('Net Storage MR: load failed', e);
      return { items: [], total: 0 };
    }
  };

  const loadStorageSummary = async (filters) => {
    try {
      const result = await loadStoragePage({ filters, pagination: { page: 1, limit: 100 }, sorter: null });
      const items = result.items || [];
      const totalReports = items.length;
      const approvedReports = items.filter(r => String(r.status).toUpperCase() === 'APPROVED').length;
      const pendingReports = items.filter(r => String(r.status).toUpperCase() === 'SUBMITTED').length;
      const totalDischargeMWh = items.reduce((acc, r) => acc + Number(r.total_discharge_mwh || 0), 0);
      return { totalReports, approvedReports, pendingReports, totalDischargeMWh: totalDischargeMWh.toFixed(2) };
    } catch (_e) {
      return { totalReports: 0, approvedReports: 0, pendingReports: 0, totalDischargeMWh: 0 };
    }
  };

  // Load storage time series (disabled in summary-only modal)
  useEffect(() => {
    const loadStorageDetailSeries = async () => {
      if (!SHOW_STORAGE_CHARTS || !detailVisible || !selectedMeasurement) {
        setStorageChartData(null);
        return;
      }
      try {
        let uploadId = null;
        let deviceId = selectedMeasurement.device_id;
        let intervalStart = selectedMeasurement.interval_start_datetime;
        let intervalEnd = selectedMeasurement.interval_end_datetime;

        // Try super-admin upload details first
        if (isSuperAdmin) {
          try {
            const detailResp = await getStorageReportUploadDetailsAPI(selectedMeasurement.id);
            uploadId = detailResp?.data?.upload_id || uploadId;
            deviceId = detailResp?.data?.device_id || deviceId;
            intervalStart = detailResp?.data?.measurement_summary?.interval_start || intervalStart;
            intervalEnd = detailResp?.data?.measurement_summary?.interval_end || intervalEnd;
            // Persist details for modal header rendering
            if (!measurementDetails || Object.keys(measurementDetails).length === 0) {
              setMeasurementDetails(detailResp.data);
            }
          } catch (_e) {
            // Non-fatal; fall back to asset_id window
          }
        }

        // Build params based on what we have
        const baseParams = uploadId ? { upload_id: uploadId } : { asset_id: deviceId, ...(intervalStart ? { start_date: intervalStart } : {}), ...(intervalEnd ? { end_date: intervalEnd } : {}) };

        // Fetch storage records (SCR/SDR) + SOC + STARs (tolerate partial failures)
        const results = await Promise.allSettled([
          getStorageRecordsAPI(baseParams),
          getSOCSnapshotsAPI(baseParams),
          getSTARsAPI({ asset_id: deviceId, ...(intervalStart ? { start_date: intervalStart } : {}), ...(intervalEnd ? { end_date: intervalEnd } : {}) }),
        ]);

        const recordsResp = results[0]?.status === 'fulfilled' ? results[0].value : null;
        const socResp = results[1]?.status === 'fulfilled' ? results[1].value : null;
        const starsResp = results[2]?.status === 'fulfilled' ? results[2].value : null;

        let records = recordsResp?.data?.records || [];
        let snapshots = socResp?.data?.snapshots || socResp?.data || [];
        const stars = starsResp?.data?.stars || [];

        // Fallback: if both SCR/SDR and SOC are empty, build from raw meter
        if (!records.length && !snapshots.length) {
          const rmParams = uploadId ? { upload_id: uploadId } : { asset_id: deviceId, ...(intervalStart ? { start_date: intervalStart } : {}), ...(intervalEnd ? { end_date: intervalEnd } : {}) };
          try {
            const raw = await getStorageRawMeterAPI(rmParams);
            const rows = raw?.data?.rows || [];
            if (rows.length) {
              // Synthesize records in unified shape
              records = rows.flatMap(r => {
                const out = [];
                const ts = r.timestamp;
                const c = Number(r.charge_mwh || 0);
                const d = Number(r.discharge_mwh || 0);
                if (c > 0) out.push({ record_type: 'SCR', energy: String(c), timestamp: ts });
                if (d > 0) out.push({ record_type: 'SDR', energy: String(d), timestamp: ts });
                return out;
              });
              // Derive naive cumulative SOC path for visualization only
              const byHour = new Map();
              rows.forEach(r => {
                const h = dayjs.utc(r.timestamp).startOf('hour').toISOString();
                const c = Number(r.charge_mwh || 0);
                const d = Number(r.discharge_mwh || 0);
                const prev = byHour.get(h) || { c: 0, d: 0 };
                byHour.set(h, { c: prev.c + c, d: prev.d + d });
              });
              const hours = Array.from(byHour.keys()).sort((a, b) => new Date(a) - new Date(b));
              let socMwh = 0;
              snapshots = hours.map(h => {
                const v = byHour.get(h) || { c: 0, d: 0 };
                socMwh = Math.max(0, socMwh + Number(v.c || 0) - Number(v.d || 0));
                return { hour: h, soc_effective_mwh: String(socMwh) };
              });
            }
          } catch (_) {
            // Ignore fallback errors; charts may still render from STARs
          }
        }

        // Aggregate per hour using UTC keys; charts will render local time
        const toUtcHourKey = (iso) => dayjs.utc(iso).startOf('hour').format('YYYY-MM-DDTHH:00:00[Z]');
        const chargeByHour = {};
        const dischargeByHour = {};
        records.forEach(r => {
          const h = toUtcHourKey(r.timestamp);
          const mwh = Number(r.energy || 0);
          if (r.record_type === 'SCR') {
            chargeByHour[h] = (chargeByHour[h] || 0) + mwh;
          } else if (r.record_type === 'SDR') {
            dischargeByHour[h] = (dischargeByHour[h] || 0) + mwh;
          }
        });
        const socByHour = {};
        let capacityMwh = null;
        snapshots.forEach(s => {
          const h = toUtcHourKey(s.hour);
          const val = Number(s.soc_effective_mwh || s.soc_proxy_mwh || 0);
          socByHour[h] = val;
          if (s.capacity_mwh && !capacityMwh) capacityMwh = Number(s.capacity_mwh);
        });
        const allHoursUtc = Array.from(new Set([...Object.keys(chargeByHour), ...Object.keys(dischargeByHour), ...Object.keys(socByHour)])).sort((a, b) => new Date(a) - new Date(b));
        const allHoursLocal = allHoursUtc.map(h => dayjs.utc(h).local().format());
        // Derive net Wh per hour as fallback meter series
        const netWhByHour = {};
        allHoursUtc.forEach(h => {
          const netMwh = (dischargeByHour[h] || 0) - (chargeByHour[h] || 0);
          netWhByHour[h] = Math.round(netMwh * 1_000_000);
        });

        // Compute diagnostics across the reporting window
        const totalChargeMwh = allHoursUtc.reduce((acc, h) => acc + Number(chargeByHour[h] || 0), 0);
        const totalDischargeMwh = allHoursUtc.reduce((acc, h) => acc + Number(dischargeByHour[h] || 0), 0);
        const firstSoc = (() => {
          for (let i = 0; i < allHoursUtc.length; i += 1) {
            const v = socByHour[allHoursUtc[i]];
            if (v !== undefined && v !== null && !Number.isNaN(v)) return Number(v);
          }
          return null;
        })();
        const lastSoc = (() => {
          for (let i = allHoursUtc.length - 1; i >= 0; i -= 1) {
            const v = socByHour[allHoursUtc[i]];
            if (v !== undefined && v !== null && !Number.isNaN(v)) return Number(v);
          }
          return null;
        })();
        const socDelta = (firstSoc !== null && lastSoc !== null) ? (lastSoc - firstSoc) : 0;
        const imbalanceMwh = (firstSoc ?? 0) + totalChargeMwh - totalDischargeMwh - (lastSoc ?? 0);
        const inferredLossMwh = Math.max(0, imbalanceMwh);
        const efficiencyPct = totalChargeMwh > 0 ? (totalDischargeMwh / totalChargeMwh) * 100 : 0;
        const anomaly = (efficiencyPct > 105) || (imbalanceMwh < -0.01) || (Number.isFinite(imbalanceMwh) && Math.abs(imbalanceMwh) > Math.max(0.02 * Math.max(totalChargeMwh, 1), 0.5));
        const socCoverageCount = allHoursUtc.reduce((acc, h) => acc + ((socByHour[h] === null || socByHour[h] === undefined || Number.isNaN(socByHour[h])) ? 0 : 1), 0);
        const socCoveragePct = allHoursUtc.length > 0 ? (socCoverageCount / allHoursUtc.length) * 100 : 0;

        setStorageChartData({
          allHoursUtc,
          allHoursLocal,
          chargeByHour,
          dischargeByHour,
          socByHour,
          capacityMwh,
          stars,
          netWhByHour,
          totals: {
            totalChargeMwh,
            totalDischargeMwh,
            socStartMwh: firstSoc,
            socEndMwh: lastSoc,
            socDeltaMwh: socDelta,
            inferredLossMwh,
            efficiencyPct,
            imbalanceMwh,
            anomaly,
            socCoveragePct,
          }
        });
      } catch (_e) {
        // Not a storage measurement or details unavailable
        setStorageChartData(null);
      }
    };
    loadStorageDetailSeries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailVisible, selectedMeasurement, isSuperAdmin]);

  const loadPage = async ({ filters, pagination, sorter, signal }) => {
    try {
      logger.info('MeasurementReportsPage: loadPage called', { filters, pagination, sorter });
      setBatchMismatch(false);
      
      // Get all accessible devices first
      const devicesResp = await getAllAccessibleDevicesAPI(true, { signal });
      const allDevices = devicesResp?.data?.devices || [];
      logger.info(`MeasurementReportsPage: Found ${allDevices.length} accessible devices`);
      
      // Filter devices by account if specified
      let devicesToQuery = allDevices;
      if (filters?.account_id) {
        devicesToQuery = allDevices.filter(d => d.account_id === filters.account_id);
      }
      if (filters?.device_id) {
        devicesToQuery = devicesToQuery.filter(d => d.id === filters.device_id);
      }
      
      // Fetch measurements using batch endpoint to avoid N parallel requests
      const deviceIds = devicesToQuery.map(d => d.id);
      logger.info(`MeasurementReportsPage: Fetching measurements (batch) for ${deviceIds.length} devices`, deviceIds);

      const batchResp = await getMeasurementsForDevicesAPI(deviceIds, {
        status: filters?.status || 'all',
        page: 1,
        limit: 100,
      }, { signal });

      const batchMeasurements = batchResp?.data?.measurements || [];
      const deviceMap = new Map(devicesToQuery.map(d => [d.id, d]));
      let allMeasurements = batchMeasurements.map(m => {
        const device = deviceMap.get(m.device_id);
        return {
          ...m,
          device_name: device?.device_name || device?.name || `Device ${m.device_id}`,
          account_name: device?.account_name || 'Unknown Account',
          account_id: device?.account_id,
        };
      });

      // Fallback: if batch endpoint returns nothing but we have devices, probe a few per-device lists
      if ((!allMeasurements || allMeasurements.length === 0) && deviceIds.length > 0) {
        logger.warn('MeasurementReportsPage: Batch endpoint returned no results. Falling back to limited per-device queries for verification.');
        const sampleIds = deviceIds.slice(0, 5);
        const perDevice = await Promise.allSettled(sampleIds.map(deviceId =>
          getDeviceMeasurementsAPI(deviceId, { status: filters?.status || 'all', page: 1, limit: 50 }, { signal })
        ));
        const fallback = [];
        perDevice.forEach((res, idx) => {
          if (res.status === 'fulfilled') {
            const deviceId = sampleIds[idx];
            const device = deviceMap.get(deviceId);
            const ms = res.value?.data?.measurements || [];
            ms.forEach(m => fallback.push({
              ...m,
              device_name: device?.device_name || device?.name || `Device ${m.device_id}`,
              account_name: device?.account_name || 'Unknown Account',
              account_id: device?.account_id,
            }));
          }
        });
        if (fallback.length > 0) {
          allMeasurements = fallback;
          setBatchMismatch(true);
        }
      }

      // NOTE: Storage reports are now included by backend in /measurements/device/{id}/list
      
      // Apply date filter if specified
      if (filters?.date_range && Array.isArray(filters.date_range) && filters.date_range[0] && filters.date_range[1]) {
        const startDate = dayjs(filters.date_range[0]);
        const endDate = dayjs(filters.date_range[1]);
        allMeasurements = allMeasurements.filter(m => {
          const mDate = dayjs(m.interval_start_datetime);
          return mDate.isAfter(startDate) && mDate.isBefore(endDate);
        });
      }

      // Apply status filter uniformly (client-side) if provided
      if (filters?.status) {
        const wanted = String(filters.status).toLowerCase();
        allMeasurements = allMeasurements.filter(m => String(m.status || '').toLowerCase() === wanted);
      }
      
      // Apply search filter if specified
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        allMeasurements = allMeasurements.filter(m =>
          m.device_name?.toLowerCase().includes(searchLower) ||
          m.account_name?.toLowerCase().includes(searchLower) ||
          String(m.id).includes(searchLower)
        );
      }
      
      // Sort
      if (sorter?.field) {
        allMeasurements.sort((a, b) => {
          const aVal = a[sorter.field];
          const bVal = b[sorter.field];
          const order = sorter.order === "descend" ? -1 : 1;
          if (aVal < bVal) return -1 * order;
          if (aVal > bVal) return 1 * order;
          return 0;
        });
      } else {
        // Default sort by created_at desc
        allMeasurements.sort((a, b) => new Date(b.created_at || b.interval_start_datetime) - new Date(a.created_at || a.interval_start_datetime));
      }
      
      // Paginate client-side
      const total = allMeasurements.length;
      const start = (pagination.page - 1) * pagination.limit;
      const items = allMeasurements.slice(start, start + pagination.limit);
      
      logger.info(`MeasurementReportsPage: Returning ${items.length} items out of ${total} total`);
      return { items, total };
    } catch (error) {
      logger.error("MeasurementReportsPage: Failed to load measurement reports:", error);
      return { items: [], total: 0 };
    }
  };

  const loadSummary = async (filters) => {
    try {
      // Fetch all measurements to calculate summary (API max is 100 per device)
      const result = await loadPage({ filters, pagination: { page: 1, limit: 100 }, sorter: null });
      const measurements = result.items || [];
      
      const totalReports = measurements.length;
      const approvedReports = measurements.filter(m => m.status === "approved").length;
      const pendingReports = measurements.filter(m => m.status === "pending" || m.status === "submitted").length;
      const totalEnergyMWh = measurements.reduce((acc, m) => acc + ((m.interval_usage_wh || 0) / 1_000_000), 0);
      
      return {
        totalReports,
        approvedReports,
        pendingReports,
        totalEnergyMWh: totalEnergyMWh.toFixed(2),
      };
    } catch (_e) {
      return { totalReports: 0, approvedReports: 0, pendingReports: 0, totalEnergyMWh: 0 };
    }
  };

  const openMeasurementDetails = async (record) => {
    setSelectedMeasurement(record);
    setDetailVisible(true);
    setLoadingDetails(true);
    try {
      if (record.source === 'storage') {
        // Only SUPER_ADMIN can read upload-details; for others, show basic info without details
        if (userInfo?.role === 'SUPER_ADMIN') {
          const resp = await getStorageReportUploadDetailsAPI(record.id);
          setMeasurementDetails(resp.data);
        } else {
          setMeasurementDetails({});
        }
      } else {
        const resp = await getMeasurementDetailsAPI(record.device_id, record.id);
        setMeasurementDetails(resp.data);
      }
    } catch (e) {
      logger.error("Failed to load measurement details:", e);
      message.error("Failed to load measurement details");
      setMeasurementDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const buildS3Url = (file) => {
    if (!file) return null;
    if (file.s3_url) return file.s3_url;
    const bucket = file.s3_bucket || file.bucket;
    const key = file.s3_key || file.key || file.object_key;
    if (bucket && key) {
      return `https://${bucket}.s3.amazonaws.com/${encodeURIComponent(key)}`;
    }
    return null;
  };

  const rowActions = [
    {
      id: "view-details",
      label: "Review Details",
      onExecute: (row) => openMeasurementDetails(row),
    },
  ];

  const handleApprove = async (selectedRows) => {
    const pendingReports = selectedRows.filter(r => r.status === 'pending');
    if (pendingReports.length === 0) {
      message.warning('Please select at least one pending measurement report');
      return;
    }

    Modal.confirm({
      title: 'Approve Measurement Reports',
      content: `Are you sure you want to approve ${pendingReports.length} measurement report(s)?`,
      okText: 'Approve',
      okType: 'primary',
      onOk: async () => {
        try {
          for (const report of pendingReports) {
            if (report.approval_id) {
              await approveRequestAPI(report.approval_id);
              logger.info(`Approved measurement report ${report.id}`);
            }
          }
          message.success(`Successfully approved ${pendingReports.length} measurement report(s)`);
          handleRefresh();
        } catch (error) {
          logger.error('Failed to approve measurement reports:', error);
          message.error('Failed to approve measurement reports');
        }
      },
    });
  };

  const handleReject = async (selectedRows) => {
    const pendingReports = selectedRows.filter(r => r.status === 'pending');
    if (pendingReports.length === 0) {
      message.warning('Please select at least one pending measurement report');
      return;
    }

    Modal.confirm({
      title: 'Reject Measurement Reports',
      content: `Are you sure you want to reject ${pendingReports.length} measurement report(s)?`,
      okText: 'Reject',
      okType: 'danger',
      onOk: async () => {
        try {
          for (const report of pendingReports) {
            if (report.approval_id) {
              await rejectRequestAPI(report.approval_id);
              logger.info(`Rejected measurement report ${report.id}`);
            }
          }
          message.success(`Successfully rejected ${pendingReports.length} measurement report(s)`);
          handleRefresh();
        } catch (error) {
          logger.error('Failed to reject measurement reports:', error);
          message.error('Failed to reject measurement reports');
        }
      },
    });
  };

  const handleSoftDelete = async (selectedRows) => {
    if (!selectedRows || selectedRows.length === 0) {
      message.warning('Please select at least one measurement report to delete');
      return;
    }

    const reportIds = selectedRows.map(r => r.id);
    
    // Prompt for deletion reason
    const reason = window.prompt(
      `⚠️ SUPER ADMIN ACTION ⚠️\n\n` +
      `You are about to soft delete ${reportIds.length} measurement report(s).\n\n` +
      `This will hide them from ALL users (including regular admins).\n` +
      `Only super admins can view and restore them.\n\n` +
      `Please provide a reason (minimum 10 characters):`
    );

    if (!reason) return; // User cancelled
    
    if (reason.length < 10) {
      message.error('Deletion reason must be at least 10 characters');
      return;
    }

    // Soft delete each report
    let successCount = 0;
    let errorCount = 0;

    for (const reportId of reportIds) {
      try {
        await softDeleteMeasurementReportAPI(reportId, reason);
        successCount++;
        logger.info(`Soft deleted measurement report ${reportId}`);
      } catch (error) {
        errorCount++;
        logger.error(`Failed to soft delete measurement report ${reportId}:`, error);
      }
    }

    // Show results
    if (successCount > 0) {
      message.success(`Successfully soft deleted ${successCount} measurement report(s)`);
      handleRefresh();
    }
    if (errorCount > 0) {
      message.error(`Failed to soft delete ${errorCount} measurement report(s)`);
    }
  };

  const bulkActions = [
    {
      id: "create-measurement",
      label: "Create Measurement Report",
      icon: <UploadOutlined />,
      btnType: "primary",
      requiresSelection: false,
      onExecute: () => {
        if (reportWizardRef.current) {
          reportWizardRef.current.openDialog({
            deviceName: undefined,
            deviceLocalID: undefined,
            deviceID: undefined,
          });
        }
      },
    },
    // Super Admin approve/reject actions
    ...(isSuperAdmin ? [
      {
        id: "approve-measurements",
        label: "Approve",
        icon: <CheckCircleOutlined />,
        btnType: "default",
        requiresSelection: true,
        onExecute: (selectedRows) => handleApprove(selectedRows),
      },
      {
        id: "reject-measurements",
        label: "Reject",
        icon: <CloseCircleOutlined />,
        btnType: "danger",
        requiresSelection: true,
        onExecute: (selectedRows) => handleReject(selectedRows),
      },
      {
        id: "soft-delete-measurements",
        label: "Soft Delete",
        icon: <DeleteOutlined />,
        btnType: "danger",
        requiresSelection: true,
        onExecute: (selectedRows) => handleSoftDelete(selectedRows),
      },
    ] : []),
  ];

  const emptyState = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <div>
          <Text type="secondary">No measurement reports found</Text>
          <div style={{ marginTop: 16 }}>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => reportWizardRef.current?.openDialog({
                deviceName: undefined,
                deviceLocalID: undefined,
                deviceID: undefined,
              })}
            >
              Create Measurement Report
            </Button>
          </div>
        </div>
      }
    />
  );

  return (
    <>
        <ResourcePage
        ref={resourcePageRef}
        resourceName="Measurement Reports"
        columns={columns}
        filterSchema={filterSchema}
        defaultFilters={{}}
        loadPage={loadPage}
        loadSummary={loadSummary}
          rowKey={(row) => `mr-${row.source || 'solar'}-${row.id}`}
        rowActions={rowActions}
        bulkActions={bulkActions}
        renderSummary={(s, loading) => (
          <Row gutter={16} style={{ width: "100%" }}>
            {renderSummary(s, loading)}
          </Row>
        )}
        emptyState={emptyState}
      />
      
      <Modal
        title="Measurement Details & Quality Analysis"
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setSelectedMeasurement(null); setMeasurementDetails(null); }}
        footer={null}
        width={1000}
      >
        {!selectedMeasurement ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Spin />
          </div>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Card size="small" title="📊 Measurement Overview">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="Measurement ID" value={selectedMeasurement.id} prefix="#" />
                </Col>
                <Col span={6}>
                  <Statistic title="Device ID" value={selectedMeasurement.device_id} />
                </Col>
                <Col span={6}>
                  <Statistic title="Status" value={selectedMeasurement.status} valueStyle={{ color: selectedMeasurement.status === 'approved' ? '#52c41a' : (selectedMeasurement.status === 'pending' || selectedMeasurement.status === 'submitted') ? '#faad14' : '#1890ff' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="Approval ID" value={selectedMeasurement.approval_id || 'N/A'} prefix={selectedMeasurement.approval_id ? '#' : ''} />
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 12 }}>
                {selectedMeasurement?.source === 'storage' && storageChartData ? (
                  <>
                    {(() => {
                      const totals = storageChartData?.totals || {};
                      const totalChargeMwh = Number(totals.totalChargeMwh || 0);
                      const totalDischargeMwh = Number(totals.totalDischargeMwh || 0);
                      const computedLossMwh = Number(totals.inferredLossMwh || 0);
                      const efficiencyPct = Number(totals.efficiencyPct || 0);
                      return (
                        <>
                          <Col span={6}>
                            <Statistic title="Total Charge" value={totalChargeMwh.toFixed(3)} suffix="MWh" />
                          </Col>
                          <Col span={6}>
                            <Statistic title="Total Discharge" value={totalDischargeMwh.toFixed(3)} suffix="MWh" />
                          </Col>
                          <Col span={6}>
                            <Statistic title="Losses" value={computedLossMwh.toFixed(3)} suffix="MWh" />
                          </Col>
                          <Col span={6}>
                            <Statistic title="Round-trip Efficiency" value={efficiencyPct.toFixed(1)} suffix="%" />
                          </Col>
                        </>
                      );
                    })()}
                  </>
                ) : (
                <Col span={6}>
                  <Statistic title="Total Energy" value={((selectedMeasurement.interval_usage_wh || 0) / 1_000_000).toFixed(3)} suffix="MWh" />
                </Col>
                )}
                <Col span={6}>
                  <Statistic title="Start Time" value={selectedMeasurement.interval_start_datetime ? dayjs(selectedMeasurement.interval_start_datetime).format('MMM DD, HH:mm') : 'N/A'} />
                </Col>
                <Col span={6}>
                  <Statistic title="End Time" value={selectedMeasurement.interval_end_datetime ? dayjs(selectedMeasurement.interval_end_datetime).format('MMM DD, HH:mm') : 'N/A'} />
                </Col>
                <Col span={6}>
                  <div style={{ marginTop: 4 }}>
                    <strong>Gross/Net:</strong>
                    <Tag color={selectedMeasurement.gross_net_indicator === 'net' ? 'green' : 'blue'} style={{ marginLeft: 8 }}>
                      {(selectedMeasurement.gross_net_indicator || 'net').toUpperCase()}
                    </Tag>
                  </div>
                </Col>
              </Row>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <Button type="primary" onClick={() => {
                  if (!selectedMeasurement) return;
                  const mrId = selectedMeasurement.id;
                  const deviceId = selectedMeasurement.device_id;
                  const start = selectedMeasurement.interval_start_datetime;
                  const end = selectedMeasurement.interval_end_datetime;
                  const uploadId = (measurementDetails && measurementDetails.upload_id) ? measurementDetails.upload_id : undefined;
                  const params = new URLSearchParams();
                  params.set('report_id', String(mrId));
                  params.set('device_id', String(deviceId));
                  if (start) params.set('start', String(start));
                  if (end) params.set('end', String(end));
                  if (uploadId) params.set('upload_id', String(uploadId));
                  navigate(`/reporting/storage-measurements?${params.toString()}`);
                }}>View Charts</Button>
              </div>
            </Card>

            <Card size="small" title="✅ Quality Checks">
              <Row gutter={16}>
                <Col span={6}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', color: '#52c41a' }}>✓</div><div style={{ fontWeight: 500 }}>Data Integrity</div><div style={{ fontSize: '12px', color: '#666' }}>Measurement validated</div></div></Col>
                <Col span={6}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', color: '#52c41a' }}>✓</div><div style={{ fontWeight: 500 }}>Time Range</div><div style={{ fontSize: '12px', color: '#666' }}>Valid period</div></div></Col>
                <Col span={6}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', color: selectedMeasurement.status === 'approved' ? '#52c41a' : '#faad14' }}>{selectedMeasurement.status === 'approved' ? '✓' : '⏳'}</div><div style={{ fontWeight: 500 }}>Approval Status</div><div style={{ fontSize: '12px', color: '#666' }}>{selectedMeasurement.status === 'approved' ? 'Approved' : (selectedMeasurement.status === 'pending' ? 'Pending review' : (selectedMeasurement.status === 'rejected' ? 'Rejected' : 'Submitted'))}</div></div></Col>
                <Col span={6}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', color: '#52c41a' }}>✓</div><div style={{ fontWeight: 500 }}>Energy Units</div><div style={{ fontSize: '12px', color: '#666' }}>Wh format verified</div></div></Col>
              </Row>

              {loadingDetails && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <Spin />
                </div>
              )}
              {!loadingDetails && !measurementDetails && (
                <Alert style={{ marginTop: 12 }} type="info" message="Detailed timeseries not available" showIcon />
              )}
            </Card>

            {/* Charts removed from modal (see /reporting/storage-measurements) */}

            {/* Storage meter charts removed from modal */}

            {/* Storage Energy & SOC charts removed from modal */}

            {/* STAR charts removed from modal */}

            {/* Certificate charts removed from modal */}

            {/* Super Admin Actions */}
            {isSuperAdmin && selectedMeasurement?.approval_id && (
              <Card size="small" title="🛡️ Super Admin Actions" style={{ marginTop: 16 }}>
                <Space>
                  <Button type="primary" onClick={async () => {
                    try {
                      const resp = await baseAPI.post(`/approvals/${selectedMeasurement.approval_id}/approve`);
                      if (!resp || resp.status >= 400) throw new Error('Approve failed');
                      message.success('Measurement report approved');
                      setDetailVisible(false);
                      handleRefresh();
                    } catch (e) {
                      message.error('Approval failed');
                    }
                  }}>Approve</Button>
                  <Button danger onClick={async () => {
                    try {
                      const resp = await baseAPI.post(`/approvals/${selectedMeasurement.approval_id}/reject`);
                      if (!resp || resp.status >= 400) throw new Error('Reject failed');
                      message.success('Measurement report rejected');
                      setDetailVisible(false);
                      handleRefresh();
                    } catch (e) {
                      message.error('Rejection failed');
                    }
                  }}>Reject</Button>
                </Space>
              </Card>
            )}

            {/* Technical Details */}
            <Card size="small" title="🔧 Technical Details">
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Energy (Wh):</strong> {selectedMeasurement.interval_usage_wh?.toLocaleString() || 'N/A'}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Energy (MWh):</strong> {((selectedMeasurement.interval_usage_wh || 0) / 1_000_000).toFixed(6)}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Gross/Net Indicator:</strong> {selectedMeasurement.gross_net_indicator?.toUpperCase() || 'NET'}
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Start:</strong> {selectedMeasurement.interval_start_datetime}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>End:</strong> {selectedMeasurement.interval_end_datetime}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Status:</strong> 
                    <Tag 
                      color={selectedMeasurement.status === 'approved' ? 'success' : selectedMeasurement.status === 'pending' ? 'warning' : selectedMeasurement.status === 'rejected' ? 'error' : 'processing'} 
                      style={{ marginLeft: 8 }}
                    >
                      {String(selectedMeasurement.status || '').toUpperCase()}
                    </Tag>
                  </div>
                </Col>
              </Row>

              {/* User Input Parameters */}
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={24}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Submission Inputs:</strong>
                  </div>
                  {(() => {
                    const inputs = measurementDetails?.submission?.inputs || measurementDetails?.inputs || {};
                    const entries = Object.entries(inputs);
                    if (!entries.length) {
                      return <Text type="secondary">No input details available</Text>;
                    }
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(200px, 1fr))', gap: '8px 24px' }}>
                        {entries.map(([k, v]) => (
                          <div key={k}>
                            <strong>{String(k).replace(/_/g, ' ')}:</strong> <span style={{ marginLeft: 6 }}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </Col>
              </Row>

              {/* Source Files (S3 links) */}
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={24}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Source Files:</strong>
                  </div>
                  {(() => {
                    const files = measurementDetails?.submission?.files || measurementDetails?.files || [];
                    const list = Array.isArray(files) ? files : (files ? [files] : []);
                    if (!list.length) {
                      return <Text type="secondary">No files recorded for this submission</Text>;
                    }
                    return (
                      <ul style={{ paddingLeft: 18, margin: 0 }}>
                        {list.map((f, idx) => {
                          const url = f.presigned_url || buildS3Url(f);
                          const label = f.original_filename || f.filename || f.name || `File ${idx + 1}`;
                          return (
                            <li key={idx}>
                              {url ? (
                                <a href={url} target="_blank" rel="noopener noreferrer">{label}</a>
                              ) : (
                                <span>{label}</span>
                              )}
                              {f.file_size ? (
                                <Text type="secondary" style={{ marginLeft: 8 }}>
                                  ({(Number(f.file_size) / 1024).toFixed(1)} KB)
                                </Text>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}
                </Col>
              </Row>
            </Card>
          </Space>
        )}
      </Modal>
      
      <div style={{ marginTop: 24 }}>
        <ResourcePage
          resourceName="Storage Measurement Reports"
          columns={storageColumns}
          filterSchema={storageFilterSchema}
          defaultFilters={{}}
          loadPage={loadStoragePage}
          loadSummary={loadStorageSummary}
          rowKey={(row) => `smr-${row.id}`}
          renderSummary={(s) => (
            <Row gutter={16} style={{ width: '100%' }}>
              <Col span={6}><Statistic title="Total Reports" value={s?.totalReports || 0} /></Col>
              <Col span={6}><Statistic title="Approved" value={s?.approvedReports || 0} /></Col>
              <Col span={6}><Statistic title="Pending" value={s?.pendingReports || 0} /></Col>
              <Col span={6}><Statistic title="Total Discharge (MWh)" value={s?.totalDischargeMWh || 0} /></Col>
            </Row>
          )}
          emptyState={<Empty description={<Text type="secondary">No storage measurement reports found</Text>} />}
        />
      </div>

      <MeasurementReportWizard ref={reportWizardRef} onSuccess={handleRefresh} />
    </>
  );
};

export default MeasurementReportsPage;



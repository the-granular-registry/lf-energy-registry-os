import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Select, DatePicker, Button, Typography } from 'antd';
import dayjs from 'dayjs';
import baseAPI from '../../../api/baseAPI';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

export default function ReportingFiltersBar({
  baseKey = 'hourly-matching',
  onLoad,
  onExport,
  exportEnabled = false,
  defaultSelectAll = true,
  legacyProjectsEnabled = true,
}) {
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [availableMinDate, setAvailableMinDate] = useState(null);
  const [availableMaxDate, setAvailableMaxDate] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(1, 'year').startOf('month'),
    dayjs().endOf('month')
  ]);
  const [exporting, setExporting] = useState(false);
  const [tzMode, setTzMode] = useState('device'); // 'device' | 'utc'

  useEffect(() => {
    fetchAccountsAndProjects();
  }, [baseKey, legacyProjectsEnabled]);

  useEffect(() => {
    fetchDevicesForAccounts();
    refreshAvailableRange();
  }, [selectedAccounts]);

  useEffect(() => {
    refreshAvailableRange();
  }, [selectedDevices, selectedProject]);

  const fetchAccountsAndProjects = async () => {
    try {
      const accRes = await baseAPI.get(`/reporting/${baseKey}/accounts`);
      // Some endpoints return { accounts: [...] }, others return the list directly.
      const raw = accRes.data;
      const accounts = Array.isArray(raw) ? raw : (raw?.accounts || []);
      setAvailableAccounts(accounts);
      if (accounts.length > 0) {
        if (defaultSelectAll) {
          const ids = accounts.map((a) => a.id);
          setSelectedAccounts(ids);
        } else {
          // If nothing selected yet, choose a single default account
          setSelectedAccounts((prev) => {
            if (Array.isArray(prev) && prev.length > 0) {
              const valid = new Set(accounts.map((a) => a.id));
              return prev.filter((id) => valid.has(id));
            }
            return [accounts[0].id];
          });
        }
      } else {
        setSelectedAccounts([]);
      }
    } catch (e) {
      // ignore
    }

    if (!legacyProjectsEnabled) return;

    try {
      let list = [];
      const projRes = await baseAPI.get(`/reporting/${baseKey}/projects`);
      list = projRes.data || [];
      if (!Array.isArray(list) || list.length === 0) {
        const fallback = await baseAPI.get('/reporting/carbon-impact/projects');
        list = fallback.data || [];
      }
      setProjects(list);
      if (list.length > 0) setSelectedProject(list[0].id);
    } catch (e) {
      // ignore
    }
  };

  const fetchDevicesForAccounts = async () => {
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
      if (devices.length > 0) {
        if (defaultSelectAll) {
          setSelectedDevices(devices.map((d) => d.id));
        } else {
          const valid = new Set(devices.map((d) => d.id));
          const pickMostRecent = () => {
            const toMillis = (v) => {
              if (!v) return null;
              const ms = Date.parse(v);
              return Number.isFinite(ms) ? ms : null;
            };
            let best = null;
            for (const d of devices) {
              const ms = toMillis(d.created_at) ?? toMillis(d.createdAt) ?? toMillis(d.created) ?? null;
              const score = ms ?? (typeof d.id === 'number' ? d.id : 0);
              if (!best || score > best.score) best = { id: d.id, score };
            }
            return best?.id ?? devices[0].id;
          };

          setSelectedDevices((prev) => {
            const cleaned = Array.isArray(prev) ? prev.filter((id) => valid.has(id)) : [];
            if (cleaned.length > 0) return cleaned;
            return [pickMostRecent()];
          });
        }
      } else {
        setSelectedDevices([]);
      }
    } catch (e) {
      // ignore
    }
  };

  const refreshAvailableRange = async () => {
    try {
      const params = {};
      if (selectedAccounts && selectedAccounts.length > 0) {
        params.account_ids = selectedAccounts.join(',');
        if (selectedDevices && selectedDevices.length > 0) {
          params.device_ids = selectedDevices.join(',');
        }
      } else if (selectedProject) {
        params.project_id = selectedProject;
      }
      const { data } = await baseAPI.get(`/reporting/${baseKey}/available-range`, { params });
      if (data?.min_date && data?.max_date) {
        const min = dayjs(data.min_date).startOf('month');
        const max = dayjs(data.max_date).endOf('month');
        setAvailableMinDate(min);
        setAvailableMaxDate(max);
        setDateRange([min, max]);
      }
    } catch (e) {
      // ignore
    }
  };

  const disabledDate = (current) => {
    if (!availableMinDate || !availableMaxDate) return false;
    return current < availableMinDate.startOf('month') || current > availableMaxDate.endOf('month');
  };

  const handleLoad = async () => {
    if (typeof onLoad !== 'function') return;
    if (selectedAccounts.length > 0) {
      onLoad({
        mode: 'accounts',
        params: {
          account_ids: selectedAccounts.join(','),
          device_ids: selectedDevices.length > 0 ? selectedDevices.join(',') : undefined,
          start_date: dateRange[0].format('YYYY-MM-DD'),
          end_date: dateRange[1].format('YYYY-MM-DD'),
        },
        meta: {
          tzMode,
          devices: availableDevices,
        }
      });
    } else if (legacyProjectsEnabled && selectedProject) {
      onLoad({
        mode: 'project',
        params: {
          project_id: selectedProject,
          start_date: dateRange[0].format('YYYY-MM-DD'),
          end_date: dateRange[1].format('YYYY-MM-DD'),
        },
        meta: {
          tzMode,
          devices: availableDevices,
        }
      });
    }
  };

  const handleExport = async () => {
    if (!exportEnabled || typeof onExport !== 'function') return;
    setExporting(true);
    try {
      await onExport({ selectedAccounts, selectedDevices, selectedProject, dateRange });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card size="small">
      <Row gutter={16} align="middle">
        <Col xs={24} md={8}>
          <Text strong>Accounts:</Text>
          <Select
            mode="multiple"
            style={{ width: '100%', marginTop: 6 }}
            value={selectedAccounts}
            onChange={setSelectedAccounts}
            placeholder="Select account(s)"
            size="large"
            showSearch
            filterOption={(input, option) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
          >
            {availableAccounts.map((account) => (
              <Option key={account.id} value={account.id}>
                {account.name || account.account_name || `Account ${account.id}`}
              </Option>
            ))}
          </Select>

          {legacyProjectsEnabled && availableAccounts.length === 0 && (
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={selectedProject}
              onChange={setSelectedProject}
              placeholder="Select a project (legacy)"
              size="large"
            >
              {projects.map((project) => (
                <Option key={project.id} value={project.id}>
                  {project.name || project.id}
                </Option>
              ))}
            </Select>
          )}
        </Col>
        <Col xs={24} md={8}>
          <Text strong>Devices:</Text>
          <Select
            mode="multiple"
            style={{ width: '100%', marginTop: 6 }}
            value={selectedDevices}
            onChange={setSelectedDevices}
            placeholder={selectedAccounts.length ? 'Filter by device(s) (optional)' : 'Select accounts first'}
            disabled={selectedAccounts.length === 0}
            size="large"
            showSearch
            filterOption={(input, option) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
          >
            {availableDevices.map((device) => (
              <Option key={device.id} value={device.id}>
                {device.device_name || `Device ${device.id}`}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} md={6}>
          <Text strong>Date Range:</Text>
          <RangePicker
            style={{ width: '100%', marginTop: 6 }}
            value={dateRange}
            onChange={setDateRange}
            picker="month"
            disabledDate={disabledDate}
            size="large"
          />
        </Col>
        <Col xs={24} md={2}>
          <Text strong>TZ:</Text>
          <Select
            style={{ width: '100%', marginTop: 6 }}
            size="large"
            value={tzMode}
            onChange={setTzMode}
          >
            <Option value="device">Device</Option>
            <Option value="utc">UTC</Option>
          </Select>
        </Col>
      </Row>

      <Row style={{ marginTop: 16 }}>
        <Col span={24}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button type="primary" size="large" onClick={handleLoad}>
              Load Report
            </Button>
            {exportEnabled && (
              <Button size="large" loading={exporting} onClick={handleExport}>
                Export PDF
              </Button>
            )}
          </div>
        </Col>
      </Row>
    </Card>
  );
}



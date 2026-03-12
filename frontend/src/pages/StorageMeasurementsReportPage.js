import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Row, Col, Typography, Select, DatePicker, Button, Space, message, Spin, Descriptions, Table } from 'antd';
import Plot from 'react-plotly.js';
import dayjs from 'dayjs';
import { useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getAllAccessibleDevicesAPI } from '../api/deviceAPI';
import { getStorageMeasurementReportsForUserAPI, getStorageMeasurementReportsAPI } from '../api/storageAPI';
import { getStorageRawMeterAPI, getStorageReportUploadDetailsAPI, getSOCSnapshotsAPI, getSTARsAPI, getSLRsAPI } from '../api/storageAPI';
import { getNetStorageMeasurementReportsForUserAPI, getNetStorageMeasurementReportsAPI } from '../api/storageNetAPI';
import baseAPI from '../api/baseAPI';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function StorageMeasurementsReportPage() {
  const { userData } = useUser();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [allDevices, setAllDevices] = useState([]);
  const [storageDevices, setStorageDevices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const isSuperAdmin = userData?.userInfo?.role === 'SUPER_ADMIN' || userData?.userInfo?.role === 5;
  const [selectedAccount, setSelectedAccount] = useState(undefined);
  const [selectedDevice, setSelectedDevice] = useState(undefined);
  const [mrOptions, setMrOptions] = useState([]);
  const [selectedMR, setSelectedMR] = useState(undefined);
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'day'), dayjs()]);
  const [timeseriesX, setTimeseriesX] = useState([]);
  const [timeseriesY, setTimeseriesY] = useState([]);
  const [chargeSeriesY, setChargeSeriesY] = useState([]);
  const [dischargeSeriesY, setDischargeSeriesY] = useState([]);
  const [socX, setSocX] = useState([]);
  const [socY, setSocY] = useState([]);
  const [hasRunReport, setHasRunReport] = useState(false);
  const [starCombinedX, setStarCombinedX] = useState([]);
  const [starCombinedTraces, setStarCombinedTraces] = useState([]);
  const [starTraceCompressionNote, setStarTraceCompressionNote] = useState('');
  const [starBarbellTraces, setStarBarbellTraces] = useState([]);
  const [starDurationValues, setStarDurationValues] = useState([]);
  const [starChargeEnergyValues, setStarChargeEnergyValues] = useState([]);
  const [starTableRows, setStarTableRows] = useState([]);
  const [starSplitRows, setStarSplitRows] = useState([]);
  const [rawMeterRows, setRawMeterRows] = useState([]);
  const [starDailyDayOptions, setStarDailyDayOptions] = useState([]);
  const [starDailySelectedDay, setStarDailySelectedDay] = useState(null);
  const [starDailyTraces, setStarDailyTraces] = useState([]);
  const [highlightedStarLabel, setHighlightedStarLabel] = useState(null);
  const starDailyDataRef = useRef(null);
  const allStarTimesRef = useRef(new Map()); // sid -> { chargeISO, dischargeISO }

  // Compute y2 range so that zero aligns between primary (Energy) and secondary (SOC) axes
  const alignedY2Range = useMemo(() => {
    try {
      const energyVals = [];
      for (let i = 0; i < chargeSeriesY.length; i += 1) {
        const v = chargeSeriesY[i];
        if (Number.isFinite(v)) energyVals.push(-v);
      }
      for (let i = 0; i < dischargeSeriesY.length; i += 1) {
        const v = dischargeSeriesY[i];
        if (Number.isFinite(v)) energyVals.push(v);
      }
      if (!energyVals.length) return undefined;
      const min1 = Math.min(...energyVals);
      const max1 = Math.max(...energyVals);
      if (!(min1 < 0 && max1 > 0)) return undefined; // need zero inside range

      const socVals = socY.filter((v) => v !== null && Number.isFinite(v));
      if (!socVals.length) return undefined;
      const min2Data = Math.min(...socVals);
      const max2Data = Math.max(...socVals);
      if (!Number.isFinite(min2Data) || !Number.isFinite(max2Data)) return undefined;

      const f = -min1 / (max1 - min1); // fraction of axis height at zero for y1
      if (!(f > 0 && f < 1)) return undefined;

      const cand1 = (1 - f) > 0 ? (max2Data / (1 - f)) : undefined;
      const cand2 = f > 0 ? (-min2Data / f) : undefined;
      const candidates = [cand1, cand2].filter((c) => Number.isFinite(c) && c > 0);
      if (!candidates.length) return undefined;
      const R2 = Math.max(...candidates);
      const min2 = -f * R2;
      const max2 = (1 - f) * R2;
      if (!Number.isFinite(min2) || !Number.isFinite(max2) || min2 >= max2) return undefined;
      return [min2, max2];
    } catch (_) {
      return undefined;
    }
  }, [chargeSeriesY, dischargeSeriesY, socY]);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [summaryStats, setSummaryStats] = useState(null);
  const [deepLinkParams, setDeepLinkParams] = useState(null);
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

  const formatMWh = (value) => (Number.isFinite(value) ? value.toFixed(3) : '—');
  const formatPercent = (value) => (Number.isFinite(value) ? `${value.toFixed(2)}%` : '—');
  const formatDateTime = (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—');

  const colorForStar = useCallback((sid) => {
    let hash = 0;
    const str = String(sid);
    for (let i = 0; i < str.length; i += 1) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 50%)`;
  }, []);

  const labelForStar = useCallback((sid) => {
    const s = String(sid);
    return s.length > 12 ? `${s.slice(0, 8)}…` : s;
  }, []);

  const buildDailyStarTraces = useCallback((targetDay) => {
    if (!targetDay || !starDailyDataRef.current) return [];
    const {
      combinedX,
      chargeByStar,
      dischargeByStar,
      othersColor,
    } = starDailyDataRef.current;
    if (!combinedX || !chargeByStar || !dischargeByStar) return [];
    const dayHours = combinedX.filter((h) => dayjs(h).format('YYYY-MM-DD') === targetDay);
    if (!dayHours.length) return [];

    // Recompute top stars for this specific day
    const dayEnergyByStar = new Map();
    for (const [sid, cmap] of chargeByStar.entries()) {
      dayHours.forEach((h) => {
        const v = cmap.get(h) || 0;
        if (v) dayEnergyByStar.set(sid, (dayEnergyByStar.get(sid) || 0) + v);
      });
    }
    for (const [sid, dmap] of dischargeByStar.entries()) {
      dayHours.forEach((h) => {
        const v = dmap.get(h) || 0;
        if (v) dayEnergyByStar.set(sid, (dayEnergyByStar.get(sid) || 0) + v);
      });
    }
    const MAX_STAR_TRACES = 20;
    const sortedDayStars = Array.from(dayEnergyByStar.entries()).sort((a, b) => b[1] - a[1]).map(([sid]) => sid);
    const dayTopStarIds = new Set(sortedDayStars.slice(0, MAX_STAR_TRACES));

    const topTraces = Array.from(dayTopStarIds).map((sid) => {
      const cmap = chargeByStar.get(sid) || new Map();
      const dmap = dischargeByStar.get(sid) || new Map();
      return {
        type: 'bar',
        name: labelForStar(sid),
        x: dayHours,
        y: dayHours.map((h) => (dmap.get(h) || 0) - (cmap.get(h) || 0)),
        marker: { color: colorForStar(sid) },
        hovertemplate: 'STAR: %{fullData.name}<br>Time: %{x|%b %d, %Y %H:%M}<br>Energy: %{y:.3f} MWh<extra></extra>',
      };
    });
    const othersMap = new Map();
    for (const [sid, cmap] of chargeByStar.entries()) {
      if (dayTopStarIds.has(sid)) continue;
      dayHours.forEach((h) => {
        const val = cmap.get(h) || 0;
        if (val) othersMap.set(h, (othersMap.get(h) || 0) - val);
      });
    }
    for (const [sid, dmap] of dischargeByStar.entries()) {
      if (dayTopStarIds.has(sid)) continue;
      dayHours.forEach((h) => {
        const val = dmap.get(h) || 0;
        if (val) othersMap.set(h, (othersMap.get(h) || 0) + val);
      });
    }
    const traces = othersMap.size
      ? [
        ...topTraces,
        {
          type: 'bar',
          name: 'Other STARs',
          x: dayHours,
          y: dayHours.map((h) => othersMap.get(h) || 0),
          marker: { color: othersColor || '#d9d9d9' },
          hovertemplate: 'STAR: Other<br>Time: %{x|%b %d, %Y %H:%M}<br>Energy: %{y:.3f} MWh<extra></extra>',
        },
      ]
      : topTraces;
    return traces;
  }, [colorForStar, labelForStar]);

  // Day-filtered stacked chart: recompute top STARs for the selected day so bars are colored correctly
  const filteredCombinedTraces = useMemo(() => {
    if (!starDailySelectedDay || starDailySelectedDay === '__all__') return starCombinedTraces;
    if (!starDailyDataRef.current) return [];
    const { combinedX, chargeByStar, dischargeByStar, othersColor } = starDailyDataRef.current;
    if (!combinedX) return [];
    const dayHours = combinedX.filter((h) => dayjs(h).format('YYYY-MM-DD') === starDailySelectedDay);
    if (!dayHours.length) return [];

    // Recompute top stars based on energy within this day only
    const dayEnergyByStar = new Map();
    for (const [sid, cmap] of chargeByStar.entries()) {
      dayHours.forEach((h) => {
        const v = cmap.get(h) || 0;
        if (v) dayEnergyByStar.set(sid, (dayEnergyByStar.get(sid) || 0) + v);
      });
    }
    for (const [sid, dmap] of dischargeByStar.entries()) {
      dayHours.forEach((h) => {
        const v = dmap.get(h) || 0;
        if (v) dayEnergyByStar.set(sid, (dayEnergyByStar.get(sid) || 0) + v);
      });
    }
    const MAX_STAR_TRACES = 20;
    const sortedDayStars = Array.from(dayEnergyByStar.entries()).sort((a, b) => b[1] - a[1]).map(([sid]) => sid);
    const dayTopStarIds = new Set(sortedDayStars.slice(0, MAX_STAR_TRACES));

    const topTraces = Array.from(dayTopStarIds).map((sid) => {
      const cmap = chargeByStar.get(sid) || new Map();
      const dmap = dischargeByStar.get(sid) || new Map();
      return {
        type: 'bar',
        name: labelForStar(sid),
        x: dayHours,
        y: dayHours.map((h) => (dmap.get(h) || 0) - (cmap.get(h) || 0)),
        marker: { color: colorForStar(sid) },
        hovertemplate: 'STAR: %{fullData.name}<br>Time: %{x|%b %d, %Y %H:%M}<br>Energy: %{y:.3f} MWh<extra></extra>',
      };
    });
    const othersMap = new Map();
    for (const [sid, cmap] of chargeByStar.entries()) {
      if (dayTopStarIds.has(sid)) continue;
      dayHours.forEach((h) => { const v = cmap.get(h) || 0; if (v) othersMap.set(h, (othersMap.get(h) || 0) - v); });
    }
    for (const [sid, dmap] of dischargeByStar.entries()) {
      if (dayTopStarIds.has(sid)) continue;
      dayHours.forEach((h) => { const v = dmap.get(h) || 0; if (v) othersMap.set(h, (othersMap.get(h) || 0) + v); });
    }
    return othersMap.size
      ? [...topTraces, { type: 'bar', name: 'Other STARs', x: dayHours, y: dayHours.map((h) => othersMap.get(h) || 0), marker: { color: othersColor || '#d9d9d9' }, hovertemplate: 'STAR: Other<br>Time: %{x|%b %d, %Y %H:%M}<br>Energy: %{y:.3f} MWh<extra></extra>' }]
      : topTraces;
  }, [starDailySelectedDay, starCombinedTraces, labelForStar, colorForStar]);

  // Day-filtered barbell chart: structured as colored bars + charge/discharge endpoint markers
  const filteredBarbellData = useMemo(() => {
    const starTimes = allStarTimesRef.current;
    if (!starTimes || !starTimes.size) return { traces: [], count: 0 };
    const MAX_BARBELLS = 40;

    // Collect relevant stars
    const relevant = [];
    for (const [sid, times] of starTimes.entries()) {
      if (!times || !times.chargeISO || !times.dischargeISO) continue;
      if (starDailySelectedDay && starDailySelectedDay !== '__all__') {
        const cDay = dayjs(times.chargeISO).format('YYYY-MM-DD');
        const dDay = dayjs(times.dischargeISO).format('YYYY-MM-DD');
        if (cDay !== starDailySelectedDay && dDay !== starDailySelectedDay) continue;
      }
      relevant.push({ sid, times });
    }
    if (!relevant.length) return { traces: [], count: 0 };

    // Sort chronologically by charge time
    relevant.sort((a, b) => dayjs(a.times.chargeISO).valueOf() - dayjs(b.times.chargeISO).valueOf());
    const capped = relevant.slice(0, MAX_BARBELLS);

    // Per-STAR colored connecting bars (thick lines, no legend)
    const barTraces = capped.map(({ sid, times }) => {
      const durationH = dayjs(times.dischargeISO).diff(dayjs(times.chargeISO), 'hour', true);
      const label = labelForStar(sid);
      return {
        type: 'scatter',
        mode: 'lines',
        name: label,
        x: [times.chargeISO, times.dischargeISO],
        y: [label, label],
        line: { color: colorForStar(sid), width: 8 },
        showlegend: false,
        hoverinfo: 'text',
        hovertext: `STAR: ${label}\nDuration: ${durationH.toFixed(1)}h`,
        _isBar: true,
      };
    });

    // Consolidated charge markers
    const chargeTrace = {
      type: 'scatter',
      mode: 'markers',
      name: 'Charge',
      x: capped.map(({ times }) => times.chargeISO),
      y: capped.map(({ sid }) => labelForStar(sid)),
      marker: { color: '#ff4d4f', size: 11, symbol: 'circle', line: { width: 1.5, color: '#fff' } },
      customdata: capped.map(({ sid, times }) => {
        const durationH = dayjs(times.dischargeISO).diff(dayjs(times.chargeISO), 'hour', true);
        return { sid: labelForStar(sid), dur: durationH.toFixed(1) };
      }),
      hovertemplate: capped.map(({ sid, times }) => {
        const durationH = dayjs(times.dischargeISO).diff(dayjs(times.chargeISO), 'hour', true);
        return `<b>${labelForStar(sid)}</b><br>Charge: ${dayjs(times.chargeISO).format('MMM DD HH:mm')}<br>Duration: ${durationH.toFixed(1)}h<extra></extra>`;
      }),
      showlegend: true,
    };

    // Consolidated discharge markers
    const dischargeTrace = {
      type: 'scatter',
      mode: 'markers',
      name: 'Discharge',
      x: capped.map(({ times }) => times.dischargeISO),
      y: capped.map(({ sid }) => labelForStar(sid)),
      marker: { color: '#52c41a', size: 11, symbol: 'diamond', line: { width: 1.5, color: '#fff' } },
      hovertemplate: capped.map(({ sid, times }) => {
        const durationH = dayjs(times.dischargeISO).diff(dayjs(times.chargeISO), 'hour', true);
        return `<b>${labelForStar(sid)}</b><br>Discharge: ${dayjs(times.dischargeISO).format('MMM DD HH:mm')}<br>Duration: ${durationH.toFixed(1)}h<extra></extra>`;
      }),
      showlegend: true,
    };

    return { traces: [...barTraces, chargeTrace, dischargeTrace], count: capped.length };
  }, [starDailySelectedDay, starBarbellTraces, labelForStar, colorForStar]);

  // Day-filtered table rows
  const filteredTableRows = useMemo(() => {
    if (!starDailySelectedDay || starDailySelectedDay === '__all__') return starTableRows;
    return starTableRows.filter((row) => {
      const cDay = row.charge_time ? dayjs(row.charge_time).format('YYYY-MM-DD') : null;
      const dDay = row.discharge_time ? dayjs(row.discharge_time).format('YYYY-MM-DD') : null;
      return cDay === starDailySelectedDay || dDay === starDailySelectedDay;
    });
  }, [starDailySelectedDay, starTableRows]);

  // Day-filtered split rows
  const filteredSplitRows = useMemo(() => {
    if (!starDailySelectedDay || starDailySelectedDay === '__all__') return starSplitRows;
    return starSplitRows.filter((row) => {
      const ts = row.timestamp ? dayjs(row.timestamp).format('YYYY-MM-DD') : null;
      return ts === starDailySelectedDay;
    });
  }, [starDailySelectedDay, starSplitRows]);

  // Day-filtered raw meter rows
  const filteredRawMeterRows = useMemo(() => {
    if (!starDailySelectedDay || starDailySelectedDay === '__all__') return rawMeterRows;
    return rawMeterRows.filter((row) => {
      const ts = row.timestamp ? dayjs(row.timestamp).format('YYYY-MM-DD') : null;
      return ts === starDailySelectedDay;
    });
  }, [starDailySelectedDay, rawMeterRows]);

  useEffect(() => {
    // Parse deep link query params once
    const params = new URLSearchParams(location.search || '');
    const reportId = params.get('report_id');
    const uploadId = params.get('upload_id');
    const deviceId = params.get('device_id');
    const start = params.get('start');
    const end = params.get('end');
    const parsed = {
      reportId: reportId ? Number(reportId) : undefined,
      uploadId: uploadId || undefined,
      deviceId: deviceId ? Number(deviceId) : undefined,
      start: start || undefined,
      end: end || undefined,
    };
    setDeepLinkParams(parsed);
    if (parsed.deviceId) setSelectedDevice(parsed.deviceId);
    if (parsed.start && parsed.end) setDateRange([dayjs(parsed.start), dayjs(parsed.end)]);
  }, [location.search]);

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
        const storageOnly = all.filter(isStorage);
        setAllDevices(all);
        setStorageDevices(storageOnly);
        // Build account list: only accounts with storage devices
        const byStorageAccount = new Map();
        storageOnly.forEach(d => {
          if (!byStorageAccount.has(d.account_id)) {
            byStorageAccount.set(d.account_id, d.account_name || `Account ${d.account_id}`);
          }
        });
        let storageAccountOpts = Array.from(byStorageAccount.entries()).map(([id, name]) => ({ value: id, label: name }));
        // If user has explicit account access list, intersect with it
        const userAccounts = Array.isArray(userData?.accounts) ? userData.accounts : [];
        if (userAccounts.length > 0) {
          const allowedIds = new Set(userAccounts.map(a => a.id));
          storageAccountOpts = storageAccountOpts.filter(opt => allowedIds.has(opt.value));
        }
        setAccounts(storageAccountOpts);
      } catch (e) {
        message.error('Failed to load devices');
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Fetch legacy reports
        const descriptors = [
          { key: 'user', request: getStorageMeasurementReportsForUserAPI({ page: 1, page_size: PAGE_LIMIT }) },
        ];
        if (isSuperAdmin) {
          descriptors.push(
            { key: 'adminAll', request: getStorageMeasurementReportsAPI({ page: 1, page_size: PAGE_LIMIT }) },
            { key: 'pending', request: baseAPI.get('/storage-measurements/pending', { params: { page: 1, page_size: PAGE_LIMIT } }) },
          );
        }

        // Also fetch net engine reports
        descriptors.push(
          { key: 'netUser', request: getNetStorageMeasurementReportsForUserAPI({ page: 1, page_size: PAGE_LIMIT }) },
        );
        if (isSuperAdmin) {
          descriptors.push(
            { key: 'netAdminAll', request: getNetStorageMeasurementReportsAPI({ page: 1, page_size: PAGE_LIMIT }) },
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
          message.warning('Some storage measurement sources failed to load; showing partial results.');
        }

        // Legacy reports
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
        // Tag legacy reports
        reports = reports.map(r => ({ ...r, _engine: 'legacy' }));

        // Net engine reports
        let netReports = extractReports(resolved.get('netUser'));
        if (isSuperAdmin) {
          const netAdminSuperset = extractReports(resolved.get('netAdminAll'));
          if (netAdminSuperset.length) {
            netReports = netAdminSuperset;
          }
        }
        // Tag net reports with a synthetic ID prefix to avoid collisions with legacy IDs
        netReports = netReports.map(r => ({ ...r, _engine: 'net', id: `net-${r.id}`, _originalId: r.id }));

        // Merge legacy + net reports
        let allReports = [...reports, ...netReports];

        if (selectedDevice) {
          allReports = allReports.filter(r => r.device_id === selectedDevice);
        } else if (selectedAccount) {
          const deviceIdsForAccount = new Set(allDevices.filter(d => d.account_id === selectedAccount).map(d => d.id));
          if (deviceIdsForAccount.size) {
            allReports = allReports.filter(r => deviceIdsForAccount.has(r.device_id));
          }
        }
        const deviceMap = new Map(allDevices.map(d => [d.id, d]));
        const options =
          allReports.map(r => {
            const dev = deviceMap.get(r.device_id);
            const accName = dev?.account_name || `Account ${dev?.account_id || ''}`;
            const devName = dev?.device_name || `Device ${r.device_id}`;
            const intervalLabel = `${dayjs(r.interval_start_datetime).format('YYYY-MM-DD')} → ${dayjs(r.interval_end_datetime).format('YYYY-MM-DD')}`;
            const engineTag = r._engine === 'net' ? ' [Net]' : '';
            return {
              value: r.id,
              label: String(r.id),
              title: `${accName} • ${devName} • ${intervalLabel}${engineTag}`,
              searchText: `${r.id} ${accName} ${devName} ${intervalLabel} ${r._engine || ''}`.toLowerCase(),
              upload_id: r.upload_id,
              device_id: r.device_id,
              start: r.interval_start_datetime,
              end: r.interval_end_datetime,
              account_name: accName,
              device_name: devName,
              engine: r._engine || 'legacy',
            };
          });
        setMrOptions(options);
      } catch (e) {
        // non-fatal
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDevice, selectedAccount, allDevices, isSuperAdmin]);

  // After MR options load, honor deep link selection and auto-run
  useEffect(() => {
    if (!deepLinkParams || mrOptions.length === 0) return;
    const { reportId, uploadId, deviceId } = deepLinkParams;
    let target = undefined;
    if (reportId) {
      target = mrOptions.find(o => o.value === reportId)?.value;
    }
    if (!target && uploadId) {
      target = mrOptions.find(o => o.upload_id === uploadId)?.value;
    }
    if (!target && deviceId) {
      // pick the most recent MR for device
      const deviceMROpts = mrOptions.filter(o => o.device_id === deviceId);
      if (deviceMROpts.length) target = deviceMROpts[0].value;
    }
    if (target) {
      setSelectedMR(target);
    }
  }, [deepLinkParams, mrOptions]);

  useEffect(() => {
    if (!starDailySelectedDay || starDailySelectedDay === '__all__') {
      setStarDailyTraces([]);
      return;
    }
    const traces = buildDailyStarTraces(starDailySelectedDay);
    setStarDailyTraces(traces);
  }, [starDailySelectedDay, buildDailyStarTraces]);

  const runReport = async () => {
    if (!selectedMR) {
      message.warning('Select a measurement report');
      return;
    }
    try {
      setLoading(true);
      setHasRunReport(true);
      setSummaryStats(null);
      setDownloadUrl(null);
      setStarDailyDayOptions([]);
      setStarDailySelectedDay(null);
      setStarDailyTraces([]);
      const sel = mrOptions.find(o => o.value === selectedMR);
      if (!sel) {
        message.error('Selected measurement report is not available. Please refresh.');
        return;
      }
      const isNetEngine = sel?.engine === 'net';
      let uploadId = sel?.upload_id;
      let deviceId = sel?.device_id;
      let measurementSummary = null;
      // Try to get a presigned CSV URL from MR details for download
      try {
        if (isNetEngine) {
          // Net reports don't have the legacy upload-details endpoint;
          // fetch the net report directly to get measurement summary
          const netReportId = sel?.value?.toString().replace('net-', '');
          const detail = await baseAPI.get(`/storage-measurements/net/reports/${netReportId}`);
          const reportData = detail?.data;
          setDownloadUrl(null); // net reports don't have CSV download yet
          uploadId = reportData?.upload_id || uploadId;
          if (reportData) {
            measurementSummary = {
              interval_start: reportData.interval_start_datetime,
              interval_end: reportData.interval_end_datetime,
              total_charge_mwh: reportData.total_charge_mwh,
              total_discharge_mwh: reportData.total_discharge_mwh,
              total_loss_mwh: reportData.total_loss_mwh,
            };
          }
        } else {
          const detail = await getStorageReportUploadDetailsAPI(selectedMR);
          const files = detail?.data?.files || [];
          const url = Array.isArray(files) && files.length ? files[0]?.presigned_url : null;
          setDownloadUrl(url || null);
          uploadId = detail?.data?.upload_id || uploadId;
          measurementSummary = detail?.data?.measurement_summary || null;
        }
      } catch (_) {
        setDownloadUrl(null);
      }
      // try to fetch upload details to get upload_id if missing
      // (already attempted above)
      const params = uploadId ? { upload_id: uploadId } : { asset_id: deviceId, start_date: sel?.start, end_date: sel?.end };
      const raw = await getStorageRawMeterAPI(params);
      const rawRows = Array.isArray(raw?.data?.rows) ? raw.data.rows : [];
      const normalizedRows = rawRows
        .map(r => ({
          timestamp: r.timestamp,
          charge_mwh: parseNumber(r.charge_mwh),
          discharge_mwh: parseNumber(r.discharge_mwh),
          net_mwh: r.net_mwh != null ? parseNumber(r.net_mwh) : parseNumber(r.discharge_mwh) - parseNumber(r.charge_mwh),
          soc: r.soc != null ? parseNumber(r.soc, null) : null,
        }))
        .filter(r => !!r.timestamp);

      const dedupedMap = new Map();
      normalizedRows.forEach((row) => {
        if (!dedupedMap.has(row.timestamp)) {
          dedupedMap.set(row.timestamp, row);
        }
      });
      const orderedRows = Array.from(dedupedMap.values()).sort(
        (a, b) => dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf()
      );

      setRawMeterRows(orderedRows);
      setTimeseriesX(orderedRows.map(row => row.timestamp));
      // Derive net Wh = (discharge - charge) * 1e3 Wh
      setTimeseriesY(orderedRows.map(row => Math.round((row.discharge_mwh - row.charge_mwh) * 1_000_000)));
      setChargeSeriesY(orderedRows.map(row => row.charge_mwh));
      setDischargeSeriesY(orderedRows.map(row => row.discharge_mwh));

      // Fetch SOC snapshots to overlay state of charge line
      try {
        const socParams = uploadId ? { upload_id: uploadId } : { asset_id: deviceId, start_date: sel?.start, end_date: sel?.end };
        const socResp = await getSOCSnapshotsAPI(socParams);
        const socRows = Array.isArray(socResp?.data) ? socResp.data : [];
        const socOrdered = socRows.slice().sort((a, b) => dayjs(a.hour).valueOf() - dayjs(b.hour).valueOf());
        setSocX(socOrdered.map(s => s.hour));
        setSocY(socOrdered.map(s => {
          const eff = Number(s?.soc_effective_mwh);
          if (Number.isFinite(eff)) return eff;
          const proxy = Number(s?.soc_proxy_mwh);
          return Number.isFinite(proxy) ? proxy : null;
        }));
      } catch (_) {
        setSocX([]);
        setSocY([]);
      }

      // Fetch STAR records and build stacked traces per STAR ID for charge/discharge
      try {
        const weekEnd = sel?.start ? dayjs(sel.start).add(7, 'day') : null;
        const starParams = uploadId ? { upload_id: uploadId } : { asset_id: deviceId, start_date: sel?.start, end_date: sel?.end };
        if (!uploadId && weekEnd && sel?.end && weekEnd.isBefore(dayjs(sel.end))) {
          starParams.end_date = weekEnd.toISOString();
        }
        const starResp = await getSTARsAPI(starParams);
        const starsArr = Array.isArray(starResp?.data?.stars) ? starResp.data.stars : (Array.isArray(starResp?.data) ? starResp.data : []);
        // Fetch SLRs for mapping star_id -> slr_id
        let slrByStarId = new Map();
        try {
          const slrResp = await getSLRsAPI(uploadId ? { upload_id: uploadId } : { asset_id: deviceId });
          const slrs = Array.isArray(slrResp?.data?.slrs) ? slrResp.data.slrs : [];
          slrByStarId = new Map(slrs.map(slr => [slr.star_id, slr.id]));
        } catch (_) {
          slrByStarId = new Map();
        }

        // Build hour buckets and per-STAR energy
        const chargeHourSet = new Set();
        const dischargeHourSet = new Set();
        const chargeByStar = new Map(); // starId -> Map(hour -> mwh)
        const dischargeByStar = new Map();
        const totalEnergyByStar = new Map();

        const toHour = (v) => dayjs(v).isValid() ? dayjs(v).format('YYYY-MM-DD HH:00') : null;
        const starTimes = new Map(); // sid -> { chargeISO, dischargeISO }
        const filteredStarsForWeek = [];
        starsArr.forEach((s) => {
          const sid = s?.id || s?.star_id || s?.uuid || String(Math.random());
          let cHour = toHour(s?.charge_hour);
          let dHour = toHour(s?.discharge_timestamp);
          if (weekEnd) {
            if (cHour && dayjs(cHour).isAfter(weekEnd)) cHour = null;
            if (dHour && dayjs(dHour).isAfter(weekEnd)) dHour = null;
          }
          // keep for table/hist only if within first week window
          const includeRow = (!weekEnd) || (cHour || dHour);
          if (includeRow) filteredStarsForWeek.push(s);
          const preLoss = Number(s?.pre_loss_mwh);
          const net = Number(s?.net_mwh);
          const tot = (Number.isFinite(preLoss) ? preLoss : 0) + (Number.isFinite(net) ? net : 0);
          totalEnergyByStar.set(sid, (totalEnergyByStar.get(sid) || 0) + tot);
          if (cHour) {
            chargeHourSet.add(cHour);
            const cmap = chargeByStar.get(sid) || new Map();
            cmap.set(cHour, (cmap.get(cHour) || 0) + (Number.isFinite(preLoss) ? preLoss : 0));
            chargeByStar.set(sid, cmap);
            // preserve original ISO for barbell
            const cISO = dayjs(s?.charge_hour).toISOString();
            const prev = starTimes.get(sid) || {};
            if (!prev.chargeISO || dayjs(cISO).isBefore(prev.chargeISO)) {
              prev.chargeISO = cISO;
            }
            starTimes.set(sid, prev);
          }
          if (dHour) {
            dischargeHourSet.add(dHour);
            const dmap = dischargeByStar.get(sid) || new Map();
            dmap.set(dHour, (dmap.get(dHour) || 0) + (Number.isFinite(net) ? net : 0));
            dischargeByStar.set(sid, dmap);
            const dISO = dayjs(s?.discharge_timestamp).toISOString();
            const prev = starTimes.get(sid) || {};
            if (!prev.dischargeISO || dayjs(dISO).isAfter(prev.dischargeISO)) {
              prev.dischargeISO = dISO;
            }
            starTimes.set(sid, prev);
          }
        });

        let chargeX = Array.from(chargeHourSet.values()).sort();
        let dischargeX = Array.from(dischargeHourSet.values()).sort();
        if (weekEnd) {
          chargeX = chargeX.filter(h => !dayjs(h).isAfter(weekEnd));
          dischargeX = dischargeX.filter(h => !dayjs(h).isAfter(weekEnd));
        }
        const combinedXSet = new Set([...chargeX, ...dischargeX]);
        const combinedX = Array.from(combinedXSet.values()).sort();

        const MAX_STAR_TRACES = 20;
        const HARD_CAP_STAR_IDS = 200;
        const starIds = Array.from(new Set([
          ...Array.from(chargeByStar.keys()),
          ...Array.from(dischargeByStar.keys())
        ]));
        let topN = MAX_STAR_TRACES;
        let compressionMsg = '';
        if (starIds.length > HARD_CAP_STAR_IDS) {
          topN = Math.min(10, MAX_STAR_TRACES);
          compressionMsg = `Rendering top ${topN} STAR IDs by energy out of ${starIds.length}. Others aggregated.`;
        } else if (starIds.length > MAX_STAR_TRACES) {
          compressionMsg = `Rendering top ${MAX_STAR_TRACES} STAR IDs by energy out of ${starIds.length}. Others aggregated.`;
        }
        const sortedByEnergy = Array.from(totalEnergyByStar.entries()).sort((a, b) => b[1] - a[1]).map(([sid]) => sid);
        const topStarIds = new Set(sortedByEnergy.slice(0, topN));

        // Build combined per-STAR traces: negative for charge, positive for discharge
        const combinedTop = Array.from(topStarIds.values()).map((sid) => {
          const cmap = chargeByStar.get(sid) || new Map();
          const dmap = dischargeByStar.get(sid) || new Map();
          return {
            type: 'bar',
            name: labelForStar(sid),
            x: combinedX,
            y: combinedX.map(h => (dmap.get(h) || 0) - (cmap.get(h) || 0)),
            marker: { color: colorForStar(sid) },
            hovertemplate: 'STAR: %{fullData.name}<br>Time: %{x|%b %d, %Y %H:%M}<br>Energy: %{y:.3f} MWh<extra></extra>'
          };
        });

        // Aggregate others into a single combined trace
        const othersColor = '#d9d9d9';
        const othersMap = new Map();
        for (const [sid, cmap] of chargeByStar.entries()) {
          if (topStarIds.has(sid)) continue;
          for (const h of combinedX) {
            const val = cmap.get(h) || 0;
            if (val) othersMap.set(h, (othersMap.get(h) || 0) - val);
          }
        }
        for (const [sid, dmap] of dischargeByStar.entries()) {
          if (topStarIds.has(sid)) continue;
          for (const h of combinedX) {
            const val = dmap.get(h) || 0;
            if (val) othersMap.set(h, (othersMap.get(h) || 0) + val);
          }
        }

        const combinedTraces = othersMap.size > 0
          ? [
              ...combinedTop,
              {
                type: 'bar',
                name: 'Other STARs',
                x: combinedX,
                y: combinedX.map(h => othersMap.get(h) || 0),
                marker: { color: othersColor },
                hovertemplate: 'STAR: Other<br>Time: %{x|%b %d, %Y %H:%M}<br>Energy: %{y:.3f} MWh<extra></extra>'
              }
            ]
          : combinedTop;

        setStarCombinedX(combinedX);
        setStarCombinedTraces(combinedTraces);
        starDailyDataRef.current = {
          combinedX,
          chargeByStar,
          dischargeByStar,
          topStarIds,
          othersColor,
        };
        const dayOptions = Array.from(new Set(combinedX.map((h) => dayjs(h).format('YYYY-MM-DD'))));
        setStarDailyDayOptions(dayOptions);
        const defaultDay = dayOptions.length ? dayOptions[0] : '__all__';
        setStarDailySelectedDay(defaultDay);
        setStarDailyTraces(defaultDay && defaultDay !== '__all__' ? buildDailyStarTraces(defaultDay) : []);
        // Store star times ref for barbell day-filtering
        allStarTimesRef.current = starTimes;
        // Histogram durations, charge energies, and table rows
        try {
          const durations = [];
          const chargeEnergies = [];
          const tableRows = filteredStarsForWeek.map((s) => {
            const starId = s?.id || s?.star_id || '—';
            const allocs = Array.isArray(s?.allocation_json?.allocations) ? s.allocation_json.allocations : [];
            const scrId = allocs.length ? (allocs[0]?.scr_id || '—') : (s?.allocation_json?.scr_id || '—');
            const sdrId = allocs.length ? (allocs[0]?.sdr_id || '—') : (s?.allocation_json?.sdr_id || '—');
            const slrId = slrByStarId.get(String(starId)) || '—';
            const chargeMwh = Number(s?.pre_loss_mwh);
            const dischargeMwh = Number(s?.net_mwh);
            const cISO = s?.charge_hour ? dayjs(s.charge_hour).toISOString() : null;
            const dISO = s?.discharge_timestamp ? dayjs(s.discharge_timestamp).toISOString() : null;
            if (Number.isFinite(chargeMwh) && chargeMwh > 0) chargeEnergies.push(chargeMwh);
            if (cISO && dISO) {
              const dh = dayjs(dISO).diff(dayjs(cISO), 'hour', true);
              if (Number.isFinite(dh)) durations.push(dh);
            }
            return {
              key: String(starId),
              star_id: String(starId),
              scr_id: String(scrId),
              sdr_id: String(sdrId),
              slr_id: String(slrId),
              charge_energy_mwh: Number.isFinite(chargeMwh) ? chargeMwh : null,
              discharge_energy_mwh: Number.isFinite(dischargeMwh) ? dischargeMwh : null,
              charge_time: cISO,
              discharge_time: dISO,
            };
          });
          setStarDurationValues(durations);
          setStarChargeEnergyValues(chargeEnergies);
          setStarTableRows(tableRows);

          // Build Pass 2-style split rows: one SCR row + one SDR row per STAR
          const splitRows = [];
          filteredStarsForWeek.forEach((s) => {
            const starId = s?.id || s?.star_id || '';
            const allocs = Array.isArray(s?.allocation_json?.allocations) ? s.allocation_json.allocations : [];
            const scrId = allocs.length ? (allocs[0]?.scr_id || '') : (s?.allocation_json?.scr_id || '');
            const sdrId = allocs.length ? (allocs[0]?.sdr_id || '') : (s?.allocation_json?.sdr_id || '');
            const slrLabel = s?.allocation_json?.slr_label || slrByStarId.get(String(starId)) || '';
            const preLoss = Number(s?.pre_loss_mwh);
            const net = Number(s?.net_mwh);
            const loss = Number(s?.loss_mwh);
            const cISO = s?.charge_hour ? dayjs(s.charge_hour).toISOString() : null;
            const dISO = s?.discharge_timestamp ? dayjs(s.discharge_timestamp).toISOString() : null;

            // SCR (charge-side) row
            if (cISO) {
              splitRows.push({
                key: `scr-${starId}`,
                timestamp: cISO,
                net_energy_mwh: Number.isFinite(preLoss) ? -preLoss : null,
                scr_id: scrId,
                sdr_id: '',
                slr_id: '',
                star_id: String(starId),
                charge_energy_mwh: null,
                discharge_energy_mwh: null,
                loss_energy_mwh: null,
                _sort: 0,
              });
            }
            // SDR (discharge-side) row
            if (dISO) {
              splitRows.push({
                key: `sdr-${starId}`,
                timestamp: dISO,
                net_energy_mwh: Number.isFinite(net) ? net : null,
                scr_id: '',
                sdr_id: sdrId,
                slr_id: slrLabel,
                star_id: String(starId),
                charge_energy_mwh: Number.isFinite(preLoss) ? preLoss : null,
                discharge_energy_mwh: Number.isFinite(net) ? net : null,
                loss_energy_mwh: Number.isFinite(loss) ? loss : null,
                _sort: 1,
              });
            }
          });
          // Sort by timestamp asc, then charge rows before discharge rows at same time
          splitRows.sort((a, b) => {
            const tDiff = dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf();
            if (tDiff !== 0) return tDiff;
            return a._sort - b._sort;
          });
          setStarSplitRows(splitRows);
        } catch (_) {
          setStarDurationValues([]);
          setStarChargeEnergyValues([]);
          setStarTableRows([]);
          setStarSplitRows([]);
        }
        // Build barbell traces for top STAR IDs
        const barbells = Array.from(topStarIds.values())
          .map((sid) => ({ sid, times: starTimes.get(sid) }))
          .filter(({ times }) => times && times.chargeISO && times.dischargeISO)
          .map(({ sid, times }) => ({
            type: 'scatter',
            mode: 'lines+markers',
            name: labelForStar(sid),
            x: [times.chargeISO, times.dischargeISO],
            y: [labelForStar(sid), labelForStar(sid)],
            line: { color: colorForStar(sid), width: 3 },
            marker: { color: colorForStar(sid), size: 7 },
            hovertemplate: 'STAR: %{fullData.name}<br>%{x|%b %d, %Y %H:%M}<extra></extra>'
          }));
        setStarBarbellTraces(barbells);
        const weekNote = weekEnd ? 'Showing first 7 days of the selected interval.' : '';
        setStarTraceCompressionNote([compressionMsg, weekNote].filter(Boolean).join(' '));
      } catch (_) {
        setStarCombinedX([]);
        setStarCombinedTraces([]);
        setStarBarbellTraces([]);
        setStarDurationValues([]);
        setStarChargeEnergyValues([]);
        setStarTableRows([]);
        setStarSplitRows([]);
        setStarTraceCompressionNote('');
        setStarDailyDayOptions([]);
        setStarDailySelectedDay(null);
        setStarDailyTraces([]);
        starDailyDataRef.current = null;
        allStarTimesRef.current = new Map();
      }

      const fallbackChargeMWh = orderedRows.reduce((sum, row) => sum + row.charge_mwh, 0);
      const fallbackDischargeMWh = orderedRows.reduce((sum, row) => sum + row.discharge_mwh, 0);

      let totalChargeMWh = measurementSummary ? parseNumber(measurementSummary.total_charge_mwh, NaN) : NaN;
      if (!Number.isFinite(totalChargeMWh)) totalChargeMWh = fallbackChargeMWh;
      let totalDischargeMWh = measurementSummary ? parseNumber(measurementSummary.total_discharge_mwh, NaN) : NaN;
      if (!Number.isFinite(totalDischargeMWh)) totalDischargeMWh = fallbackDischargeMWh;
      let totalLossMWh = measurementSummary ? parseNumber(measurementSummary.total_loss_mwh, NaN) : NaN;
      if (!Number.isFinite(totalLossMWh)) totalLossMWh = totalChargeMWh - totalDischargeMWh;
      if (!Number.isFinite(totalLossMWh)) totalLossMWh = 0;

      const efficiencyPctRaw = totalChargeMWh > 0 ? (totalDischargeMWh / totalChargeMWh) * 100 : null;
      const efficiencyPercent = efficiencyPctRaw !== null && Number.isFinite(efficiencyPctRaw) ? efficiencyPctRaw : null;

      const timestampValues = orderedRows
        .map(row => dayjs(row.timestamp))
        .filter(ts => ts.isValid());

      let minTimestamp = null;
      let maxTimestamp = null;
      let missingHours = 0;
      const HOUR_MS = 60 * 60 * 1000;
      if (timestampValues.length) {
        minTimestamp = timestampValues[0];
        maxTimestamp = timestampValues[timestampValues.length - 1];
        for (let i = 1; i < timestampValues.length; i += 1) {
          const diffMs = timestampValues[i].valueOf() - timestampValues[i - 1].valueOf();
          if (Number.isFinite(diffMs) && diffMs > HOUR_MS) {
            missingHours += Math.floor(diffMs / HOUR_MS) - 1;
          }
        }
      }

      setSummaryStats({
        reportId: sel.value,
        uploadId: uploadId || null,
        accountName: sel.account_name,
        deviceName: sel.device_name,
        totalChargeMWh,
        totalDischargeMWh,
        totalLossMWh,
        efficiencyPercent,
        minTime: minTimestamp ? minTimestamp.toISOString() : null,
        maxTime: maxTimestamp ? maxTimestamp.toISOString() : null,
        missingHours,
        rowCount: orderedRows.length,
        intervalStart: measurementSummary?.interval_start || (minTimestamp ? minTimestamp.toISOString() : null),
        intervalEnd: measurementSummary?.interval_end || (maxTimestamp ? maxTimestamp.toISOString() : null),
      });
    } catch (e) {
      message.error('Failed to load raw meter data');
      setRawMeterRows([]);
      setTimeseriesX([]);
      setTimeseriesY([]);
      setChargeSeriesY([]);
      setDischargeSeriesY([]);
      setSocX([]);
      setSocY([]);
      setStarCombinedX([]);
      setStarCombinedTraces([]);
      setStarBarbellTraces([]);
      setStarDurationValues([]);
      setStarChargeEnergyValues([]);
      setStarTableRows([]);
      setStarSplitRows([]);
      setStarDailyDayOptions([]);
      setStarDailySelectedDay(null);
      setStarDailyTraces([]);
      starDailyDataRef.current = null;
      allStarTimesRef.current = new Map();
      setHasRunReport(false);
      setSummaryStats(null);
    } finally {
      setLoading(false);
    }
  };

  const deviceOptions = useMemo(() => {
    const filtered = selectedAccount ? storageDevices.filter(d => d.account_id === selectedAccount) : storageDevices;
    return filtered.map(d => ({ value: d.id, label: d.device_name || `Device ${d.id}` }));
  }, [storageDevices, selectedAccount]);

  return (
    <div style={{ padding: 20 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>Storage Measurement Reports</Title>
          <Text type="secondary">Select a device or account, choose a submitted storage MR, and plot the uploaded meter data for QA.</Text>
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
                filterOption={(i,o)=> (o?.label||'').toLowerCase().includes(i.toLowerCase())}
              />
            </Col>
            <Col span={10}>
              <Space>
                <Select
                  style={{ minWidth: 420 }}
                  allowClear
                  placeholder="Select a Storage Measurement Report"
                  value={selectedMR}
                  options={mrOptions}
                  onChange={setSelectedMR}
                  showSearch
                  filterOption={(input, option) => {
                    const target = option?.searchText || String(option?.label || '').toLowerCase();
                    return target.includes(input.toLowerCase());
                  }}
                  optionRender={(option) => (
                    <Space>
                      {option.data.engine === 'net' ? <span style={{ color: '#1890ff', fontWeight: 600, fontSize: 11 }}>[Net]</span> : null}
                      <span>{option.data.title || option.label}</span>
                    </Space>
                  )}
                />
                <Button type="primary" onClick={runReport} loading={loading}>Run Report</Button>
                <Button
                  disabled={!downloadUrl}
                  onClick={() => {
                    if (downloadUrl) {
                      window.open(downloadUrl, '_blank');
                    }
                  }}
                >
                  Download CSV
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        

        {hasRunReport ? (
          <Card title="Measurement Summary">
            {summaryStats ? (
              <Descriptions bordered size="small" column={3}>
                <Descriptions.Item label="Measurement ID">{summaryStats.reportId ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Account">{summaryStats.accountName || '—'}</Descriptions.Item>
                <Descriptions.Item label="Device">{summaryStats.deviceName || '—'}</Descriptions.Item>
                <Descriptions.Item label="Total Charge (MWh)">{formatMWh(summaryStats.totalChargeMWh)}</Descriptions.Item>
                <Descriptions.Item label="Total Discharge (MWh)">{formatMWh(summaryStats.totalDischargeMWh)}</Descriptions.Item>
                <Descriptions.Item label="Losses (MWh)">{formatMWh(summaryStats.totalLossMWh)}</Descriptions.Item>
                <Descriptions.Item label="Efficiency">{formatPercent(summaryStats.efficiencyPercent ?? null)}</Descriptions.Item>
                <Descriptions.Item label="First Timestamp">{formatDateTime(summaryStats.minTime)}</Descriptions.Item>
                <Descriptions.Item label="Last Timestamp">{formatDateTime(summaryStats.maxTime)}</Descriptions.Item>
                <Descriptions.Item label="Missing Hours">{typeof summaryStats.missingHours === 'number' ? summaryStats.missingHours : '—'}</Descriptions.Item>
                <Descriptions.Item label="Row Count">{summaryStats.rowCount ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Interval Start">{formatDateTime(summaryStats.intervalStart)}</Descriptions.Item>
                <Descriptions.Item label="Interval End">{formatDateTime(summaryStats.intervalEnd)}</Descriptions.Item>
              </Descriptions>
            ) : (
              <Text type="secondary">Run the report to view measurement summary metrics.</Text>
            )}
          </Card>
        ) : null}

        {hasRunReport ? (
        <Card title="Raw Meter Time Series (derived net Wh)">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}><Spin /></div>
          ) : (
            <Plot
              data={[{
                type: 'scatter',
                mode: 'lines',
                x: timeseriesX,
                y: timeseriesY,
                line: { color: '#722ed1', width: 2 },
                name: 'Net Wh',
                hovertemplate: '%{x|%Y-%m-%d %H:%M}<br>Wh: %{y:,}<extra></extra>'
              }]}
              layout={{
                margin: { l: 88, r: 24, t: 20, b: 64 },
                xaxis: { title: { text: 'Time' }, type: 'date', tickformat: '%H:%M\n%m/%d', automargin: true },
                yaxis: { title: { text: 'Energy (Wh)' }, rangemode: 'tozero', automargin: true },
                hovermode: 'x unified',
                showlegend: false,
                plot_bgcolor: '#fafafa',
                paper_bgcolor: 'white'
              }}
              config={{ responsive: true, displaylogo: false }}
              style={{ width: '100%', height: '360px' }}
              useResizeHandler
            />
          )}
        </Card>
        ) : null}

        {hasRunReport ? (
        <Card title="Charge/Discharge vs State of Charge">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}><Spin /></div>
          ) : (
            <div role="figure" aria-labelledby="cdsoc-title" aria-describedby="cdsoc-desc">
              <h3 id="cdsoc-title" style={{ position: 'absolute', width: 1, height: 1, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}>Charge/Discharge and State of Charge Chart</h3>
              <Plot
                data={[
                  {
                    type: 'bar',
                    x: timeseriesX,
                    y: chargeSeriesY.map(v => (Number.isFinite(v) ? -v : v)),
                    name: 'Charge (MWh)',
                    marker: { color: '#ff4d4f' },
                    hovertemplate: 'Time: %{x|%b %d, %Y %H:%M}<br>Charge: %{y:.3f} MWh<extra></extra>'
                  },
                  {
                    type: 'bar',
                    x: timeseriesX,
                    y: dischargeSeriesY,
                    name: 'Discharge (MWh)',
                    marker: { color: '#52c41a' },
                    hovertemplate: 'Time: %{x|%b %d, %Y %H:%M}<br>Discharge: %{y:.3f} MWh<extra></extra>'
                  },
                  ...(socX.length ? [{
                    type: 'scatter',
                    mode: 'lines',
                    x: socX,
                    y: socY,
                    name: 'State of Charge (MWh)',
                    line: { color: '#1890ff', width: 2 },
                    yaxis: 'y2',
                    hovertemplate: 'Time: %{x|%b %d, %Y %H:%M}<br>SOC: %{y:.3f} MWh<extra></extra>'
                  }] : [])
                ]}
                layout={{
                  margin: { l: 88, r: 88, t: 20, b: 80 },
                  barmode: 'group',
                  xaxis: { title: { text: 'Time' }, type: 'date', tickformat: '%b %d\n%H:%M', automargin: true },
                  yaxis: { title: { text: 'Energy (MWh)' }, automargin: true, zeroline: true, zerolinecolor: '#bfbfbf' },
                  yaxis2: {
                    title: { text: 'SOC (MWh)' }, overlaying: 'y', side: 'right', automargin: true, zeroline: true, zerolinecolor: '#bfbfbf',
                    ...(alignedY2Range ? { range: alignedY2Range } : {})
                  },
                  hovermode: 'x unified',
                  showlegend: true,
                  legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.2, yanchor: 'top' },
                  plot_bgcolor: '#fafafa',
                  paper_bgcolor: 'white'
                }}
                config={{ responsive: true, displaylogo: false }}
                style={{ width: '100%', height: '420px' }}
                useResizeHandler
              />
              <p id="cdsoc-desc" style={{ position: 'absolute', width: 1, height: 1, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}>
                Bar chart shows charging energy as negative red bars and discharging energy as positive green bars. Blue line indicates state of charge. X axis is time; left Y axis is Energy in MWh; right Y axis is SOC in MWh. Legends appear below the chart.
              </p>
            </div>
          )}
        </Card>
        ) : null}
        {hasRunReport && (starDurationValues.length > 0 || starChargeEnergyValues.length > 0) ? (
          <Row gutter={16}>
            {starDurationValues.length > 0 ? (
              <Col span={starChargeEnergyValues.length > 0 ? 12 : 24}>
                <Card title="STAR Duration Histogram (Charge → Discharge)">
                  <Plot
                    data={[{
                      type: 'histogram',
                      x: starDurationValues,
                      marker: { color: '#1890ff' },
                      autobinx: true,
                      hovertemplate: 'Duration: %{x:.2f} hours<br>Count: %{y}<extra></extra>'
                    }]}
                    layout={{
                      margin: { l: 64, r: 24, t: 20, b: 64 },
                      xaxis: { title: { text: 'Duration (hours)' }, automargin: true },
                      yaxis: { title: { text: 'Count of STARs' }, automargin: true },
                      showlegend: false,
                      plot_bgcolor: '#fafafa',
                      paper_bgcolor: 'white'
                    }}
                    config={{ responsive: true, displaylogo: false }}
                    style={{ width: '100%', height: '340px' }}
                    useResizeHandler
                  />
                </Card>
              </Col>
            ) : null}
            {starChargeEnergyValues.length > 0 ? (
              <Col span={starDurationValues.length > 0 ? 12 : 24}>
                <Card title="STAR Charge Energy Histogram">
                  <Plot
                    data={[{
                      type: 'histogram',
                      x: starChargeEnergyValues,
                      marker: { color: '#fa8c16' },
                      autobinx: true,
                      hovertemplate: 'Charge: %{x:.3f} MWh<br>Count: %{y}<extra></extra>'
                    }]}
                    layout={{
                      margin: { l: 64, r: 24, t: 20, b: 64 },
                      xaxis: { title: { text: 'Charge Energy (MWh)' }, automargin: true },
                      yaxis: { title: { text: 'Count of STARs' }, automargin: true },
                      showlegend: false,
                      plot_bgcolor: '#fafafa',
                      paper_bgcolor: 'white'
                    }}
                    config={{ responsive: true, displaylogo: false }}
                    style={{ width: '100%', height: '340px' }}
                    useResizeHandler
                  />
                </Card>
              </Col>
            ) : null}
          </Row>
        ) : null}
        {hasRunReport && starDailyDayOptions.length > 0 ? (
          <Card>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space wrap>
                <Text strong>Focus day</Text>
                <Select
                  style={{ minWidth: 220 }}
                  value={starDailySelectedDay}
                  options={[
                    { value: '__all__', label: 'All days' },
                    ...starDailyDayOptions.map((d) => ({ value: d, label: dayjs(d).format('MMM DD, YYYY') })),
                  ]}
                  onChange={(v) => { setStarDailySelectedDay(v); setHighlightedStarLabel(null); }}
                />
                {starTraceCompressionNote ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>{starTraceCompressionNote}</Text>
                ) : null}
              </Space>

              {filteredCombinedTraces.length > 0 ? (
                <Card
                  type="inner"
                  title="STAR Charge/Discharge Relative Stacked (Colored by STAR)"
                  size="small"
                  extra={highlightedStarLabel
                    ? <Text type="secondary" style={{ fontSize: 12 }}>Highlighting: <strong>{highlightedStarLabel}</strong> — click again to clear</Text>
                    : <Text type="secondary" style={{ fontSize: 12 }}>Click a bar to highlight a STAR</Text>}
                >
                  <Plot
                    data={filteredCombinedTraces.map((trace) => {
                      if (!highlightedStarLabel) return trace;
                      const isHighlighted = trace.name === highlightedStarLabel;
                      return {
                        ...trace,
                        marker: { ...trace.marker, opacity: isHighlighted ? 1 : 0.15 },
                        ...(isHighlighted ? {} : { showlegend: false }),
                      };
                    })}
                    layout={{
                      margin: { l: 88, r: 24, t: 20, b: 80 },
                      barmode: 'relative',
                      xaxis: { title: { text: 'Time' }, type: 'date', tickformat: starDailySelectedDay && starDailySelectedDay !== '__all__' ? '%H:%M' : '%b %d\n%H:%M', automargin: true },
                      yaxis: { title: { text: 'Energy (MWh)' }, automargin: true, zeroline: true, zerolinecolor: '#bfbfbf' },
                      showlegend: true,
                      legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.25, yanchor: 'top' },
                      plot_bgcolor: '#fafafa',
                      paper_bgcolor: 'white'
                    }}
                    config={{ responsive: true, displaylogo: false }}
                    style={{ width: '100%', height: '420px' }}
                    useResizeHandler
                    onClick={(event) => {
                      const pt = event?.points?.[0];
                      if (!pt) { setHighlightedStarLabel(null); return; }
                      const clickedName = pt.data?.name;
                      if (!clickedName || clickedName === 'Other STARs') { setHighlightedStarLabel(null); return; }
                      setHighlightedStarLabel((prev) => (prev === clickedName ? null : clickedName));
                    }}
                  />
                </Card>
              ) : null}

              {filteredBarbellData.traces.length > 0 ? (
                <Card
                  type="inner"
                  title={`STAR Charge → Discharge Times${starDailySelectedDay && starDailySelectedDay !== '__all__' ? ` — ${dayjs(starDailySelectedDay).format('MMM DD, YYYY')}` : ''}`}
                  size="small"
                  extra={<Text type="secondary" style={{ fontSize: 12 }}>Red ● = charge start &nbsp; Green ◆ = discharge</Text>}
                >
                  <Plot
                    data={filteredBarbellData.traces.map((trace) => {
                      if (!highlightedStarLabel) return trace;
                      if (trace._isBar) {
                        return { ...trace, opacity: trace.name === highlightedStarLabel ? 1 : 0.12 };
                      }
                      // Consolidated marker traces: apply per-point opacity
                      const opacities = trace.y.map((label) => (label === highlightedStarLabel ? 1 : 0.12));
                      return { ...trace, marker: { ...trace.marker, opacity: opacities } };
                    })}
                    layout={{
                      margin: { l: 120, r: 24, t: 10, b: 60 },
                      xaxis: { title: { text: 'Time' }, type: 'date', tickformat: '%b %d\n%H:%M', automargin: true },
                      yaxis: { automargin: true, autorange: 'reversed' },
                      showlegend: true,
                      legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.15, yanchor: 'top' },
                      hovermode: 'closest',
                      plot_bgcolor: '#fafafa',
                      paper_bgcolor: 'white'
                    }}
                    config={{ responsive: true, displaylogo: false }}
                    style={{ width: '100%', height: Math.max(240, Math.min(640, filteredBarbellData.count * 26 + 140)) + 'px' }}
                    useResizeHandler
                    onClick={(event) => {
                      const pt = event?.points?.[0];
                      if (!pt) { setHighlightedStarLabel(null); return; }
                      const clickedLabel = pt.data?._isBar ? pt.data?.name : (pt.y || null);
                      if (!clickedLabel) { setHighlightedStarLabel(null); return; }
                      setHighlightedStarLabel((prev) => (prev === clickedLabel ? null : clickedLabel));
                    }}
                  />
                </Card>
              ) : null}

              {filteredTableRows.length > 0 ? (
                <Card type="inner" title={`STAR Records${starDailySelectedDay && starDailySelectedDay !== '__all__' ? ` — ${dayjs(starDailySelectedDay).format('MMM DD, YYYY')}` : ''}`} size="small">
                  <Table
                    size="small"
                    dataSource={filteredTableRows}
                    rowKey="key"
                    pagination={{ pageSize: 20, showSizeChanger: true }}
                    columns={[
                      { title: 'STAR ID', dataIndex: 'star_id', key: 'star_id', ellipsis: true },
                      { title: 'SCR ID', dataIndex: 'scr_id', key: 'scr_id', ellipsis: true },
                      { title: 'SDR ID', dataIndex: 'sdr_id', key: 'sdr_id', ellipsis: true },
                      { title: 'SLR ID', dataIndex: 'slr_id', key: 'slr_id', ellipsis: true },
                      { title: 'Charge Energy (MWh)', dataIndex: 'charge_energy_mwh', key: 'charge_energy_mwh', align: 'right', render: (v) => (v == null ? '—' : Number(v).toFixed(3)) },
                      { title: 'Discharge Energy (MWh)', dataIndex: 'discharge_energy_mwh', key: 'discharge_energy_mwh', align: 'right', render: (v) => (v == null ? '—' : Number(v).toFixed(3)) },
                      { title: 'Charge Time', dataIndex: 'charge_time', key: 'charge_time', render: (v) => formatDateTime(v) },
                      { title: 'Discharge Time', dataIndex: 'discharge_time', key: 'discharge_time', render: (v) => formatDateTime(v) },
                    ]}
                  />
                </Card>
              ) : null}

              {filteredSplitRows.length > 0 ? (
                <Card
                  type="inner"
                  title={`STAR Split Records (Pass 2)${starDailySelectedDay && starDailySelectedDay !== '__all__' ? ` — ${dayjs(starDailySelectedDay).format('MMM DD, YYYY')}` : ''}`}
                  size="small"
                >
                  <Table
                    size="small"
                    dataSource={filteredSplitRows}
                    rowKey="key"
                    pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['25', '50', '100', '200'] }}
                    scroll={{ x: 1200 }}
                    rowClassName={(record) => record.scr_id ? 'split-row-charge' : 'split-row-discharge'}
                    columns={[
                      { title: 'Timestamp', dataIndex: 'timestamp', key: 'timestamp', width: 160, fixed: 'left', render: (v) => formatDateTime(v) },
                      {
                        title: 'Net Energy (MWh)', dataIndex: 'net_energy_mwh', key: 'net_energy_mwh', width: 140, align: 'right',
                        render: (v) => {
                          if (v == null) return '—';
                          const num = Number(v);
                          const color = num < 0 ? '#ff4d4f' : num > 0 ? '#52c41a' : undefined;
                          return <span style={{ color, fontWeight: 500 }}>{num.toFixed(6)}</span>;
                        },
                      },
                      { title: 'SCR ID', dataIndex: 'scr_id', key: 'scr_id', width: 100, render: (v) => v || '—' },
                      { title: 'SDR ID', dataIndex: 'sdr_id', key: 'sdr_id', width: 100, render: (v) => v || '—' },
                      { title: 'SLR ID', dataIndex: 'slr_id', key: 'slr_id', width: 100, render: (v) => v || '—' },
                      { title: 'STAR ID', dataIndex: 'star_id', key: 'star_id', width: 110, ellipsis: true },
                      {
                        title: 'Charge (MWh)', dataIndex: 'charge_energy_mwh', key: 'charge_energy_mwh', width: 130, align: 'right',
                        render: (v) => (v == null ? '' : Number(v).toFixed(6)),
                      },
                      {
                        title: 'Discharge (MWh)', dataIndex: 'discharge_energy_mwh', key: 'discharge_energy_mwh', width: 140, align: 'right',
                        render: (v) => (v == null ? '' : Number(v).toFixed(6)),
                      },
                      {
                        title: 'Loss (MWh)', dataIndex: 'loss_energy_mwh', key: 'loss_energy_mwh', width: 120, align: 'right',
                        render: (v) => (v == null ? '' : Number(v).toFixed(6)),
                      },
                    ]}
                  />
                </Card>
              ) : null}

              {filteredRawMeterRows.length > 0 ? (
                <Card
                  type="inner"
                  title={`Raw Meter Data${starDailySelectedDay && starDailySelectedDay !== '__all__' ? ` — ${dayjs(starDailySelectedDay).format('MMM DD, YYYY')}` : ''}`}
                  size="small"
                >
                  <Table
                    size="small"
                    dataSource={filteredRawMeterRows.map((r, i) => ({ ...r, key: `rm-${i}` }))}
                    rowKey="key"
                    pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['25', '50', '100', '200'] }}
                    columns={[
                      { title: 'Timestamp', dataIndex: 'timestamp', key: 'timestamp', width: 160, render: (v) => formatDateTime(v) },
                      {
                        title: 'Net Energy (MWh)', dataIndex: 'net_mwh', key: 'net_mwh', width: 150, align: 'right',
                        render: (v) => {
                          if (v == null) return '—';
                          const num = Number(v);
                          const color = num < -0.0001 ? '#ff4d4f' : num > 0.0001 ? '#52c41a' : undefined;
                          return <span style={{ color, fontWeight: 500 }}>{num.toFixed(6)}</span>;
                        },
                      },
                      {
                        title: 'State of Charge', dataIndex: 'soc', key: 'soc', width: 140, align: 'right',
                        render: (v) => (v == null ? '—' : Number(v).toFixed(3)),
                      },
                    ]}
                  />
                </Card>
              ) : null}
            </Space>
          </Card>
        ) : null}
      </Space>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Typography, 
  Card, 
  Row, 
  Col, 
  Button, 
  Space, 
  Spin, 
  Alert, 
  Statistic, 
  Table, 
  Select, 
  DatePicker, 
  Divider,
  Progress,
  Tag,
  Tooltip,
  message
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EnvironmentOutlined, 
  DownloadOutlined,
  BarChartOutlined,
  LineChartOutlined,
  HeatMapOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Plot from 'react-plotly.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
// dayjs plugin only needed if any local date math like dayOfYear is used
// import dayOfYear from 'dayjs/plugin/dayOfYear';
// dayjs.extend(dayOfYear);
dayjs.extend(utc);
dayjs.extend(timezone);
import { useUser } from '../../context/UserContext';
import ReportingFiltersBar from './common/FiltersBar';
import baseAPI from '../../api/baseAPI';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
// Removed Tabs for single-page layout

export default function CarbonImpactReport() {
  const navigate = useNavigate();
  const { userData } = useUser();
  
  // Chart version for forcing re-renders
  const [chartVersion, setChartVersion] = useState(0);
  
  // State management
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(1, 'year').startOf('month'),
    dayjs().endOf('month')
  ]);
  const [projects, setProjects] = useState([]);
  const [availableAccounts, setAvailableAccounts] = useState([]);
  // Single-page layout, no active tab
  const [exportingPDF, setExportingPDF] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [availableMinDate, setAvailableMinDate] = useState(null);
  const [availableMaxDate, setAvailableMaxDate] = useState(null);

  // Configuration
  const config = {
    statistics: {
      default_weight: 0.5,
      enable_bootstrap: true,
      bootstrap_samples: 1000,
      sensitivity_deltas: [-0.1, 0.1]
    },
    visualization: {
      chart_width: 1200,
      chart_height: 520,
      low_impact_color: '#2E8B57',
      high_impact_color: '#DC143C',
      generation_line_color: '#1f77b4',
      mer_bar_color: '#ff7f0e'
    }
  };

  // Fetch available projects and accounts on component mount
  useEffect(() => {
    fetchProjects();
    fetchAvailableAccounts();
  }, []);

  // Load devices when account selection changes (do not auto-fetch report)
  useEffect(() => {
    fetchDevicesForSelectedAccounts();
    // Also refresh available date range when account selection changes
    refreshAvailableRange();
  }, [selectedAccounts]);

  // Debug: Log when chart data changes and force chart re-render
  useEffect(() => {
    if (reportData) {
      console.log('Report data updated, chart should re-render');
      console.log('Data length:', reportData.hourlyData?.length);
      // Force chart re-render by incrementing version
      setChartVersion(prev => prev + 1);
    }
  }, [reportData]);

  // Debug: Log component re-renders
  useEffect(() => {
    console.log('Component re-rendered, chart version:', chartVersion);
  });

  const normalizeReportData = (data) => {
    try {
      if (!data) return data;
      const cloned = JSON.parse(JSON.stringify(data));
      const hourly = Array.isArray(cloned.hourlyData) ? cloned.hourlyData : [];
      const kpis = cloned.kpis || {};
      const deviceBreakdown = Array.isArray(cloned.device_breakdown) ? cloned.device_breakdown : [];

      const reportedTotal = Number(kpis.total_generation_mwh) || hourly.reduce((sum, item) => sum + (Number(item.mwh) || 0), 0);
      let scale = 1;
      if (reportedTotal > 1e6) scale = 1e6; // assume Wh → MWh
      else if (reportedTotal > 1e3) scale = 1e3; // assume kWh → MWh

      if (scale !== 1) {
        for (const item of hourly) {
          if (Number.isFinite(item.mwh)) item.mwh = item.mwh / scale;
        }
        for (const row of deviceBreakdown) {
          if (Number.isFinite(row.total_generation_mwh)) row.total_generation_mwh = row.total_generation_mwh / scale;
          if (Number.isFinite(row.avoided_emissions_kg)) row.avoided_emissions_kg = row.avoided_emissions_kg / scale;
        }
      }

      const totalMwh = hourly.reduce((sum, item) => sum + (Number(item.mwh) || 0), 0);
      let avoidedKg = 0;
      for (const item of hourly) {
        const mwhVal = Number(item.mwh) || 0;
        let merKg = Number(item.mer_kgco2_per_mwh);
        if (!Number.isFinite(merKg)) {
          const cm = Number(item.combined_mer);
          if (Number.isFinite(cm)) {
            merKg = cm <= 2 ? cm * 1000 : cm; // convert tCO2e/MWh → kgCO2e/MWh if needed
          } else {
            merKg = 0;
          }
        }
        avoidedKg += mwhVal * merKg;
      }

      cloned.kpis = {
        ...kpis,
        total_generation_mwh: Number.isFinite(totalMwh) ? totalMwh : kpis.total_generation_mwh,
        total_avoided_emissions_kg: Number.isFinite(avoidedKg) && avoidedKg > 0 ? avoidedKg : kpis.total_avoided_emissions_kg,
        net_impact_kg: Number.isFinite(avoidedKg) && avoidedKg > 0 ? avoidedKg : kpis.net_impact_kg,
        weighted_avg_mer: totalMwh > 0 ? avoidedKg / totalMwh : kpis.weighted_avg_mer,
      };

      cloned.hourlyData = hourly;
      cloned.device_breakdown = deviceBreakdown;
      return cloned;
    } catch (e) {
      console.warn('normalizeReportData failed', e);
      return data;
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await baseAPI.get('/reporting/carbon-impact/projects');
      const projectData = response.data || [];
      setProjects(projectData);
      if (projectData.length > 0) {
        setSelectedProject(projectData[0].id);
        // For legacy project mode, set available range
        setTimeout(() => refreshAvailableRange(projectData[0].id), 0);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    }
  };

  const fetchAvailableAccounts = async () => {
    try {
      const response = await baseAPI.get('/reporting/carbon-impact/accounts');
      const accountData = response.data?.accounts || [];
      setAvailableAccounts(accountData);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to load accounts');
    }
  };

  const fetchDevicesForSelectedAccounts = async () => {
    try {
      if (!selectedAccounts || selectedAccounts.length === 0) {
        setAvailableDevices([]);
        setSelectedDevices([]);
        return;
      }
      // Fetch devices per selected account and de-duplicate
      const requests = selectedAccounts.map(accId => baseAPI.get(`/accounts/${accId}/devices`));
      const results = await Promise.allSettled(requests);
      const devices = [];
      for (const res of results) {
        if (res.status === 'fulfilled') {
          const arr = res.value.data || [];
          for (const d of arr) {
            if (!devices.find(ex => ex.id === d.id)) devices.push(d);
          }
        }
      }
      setAvailableDevices(devices);
      // Remove any selected devices not in the new list
      const ids = new Set(devices.map(d => d.id));
      setSelectedDevices(prev => prev.filter(id => ids.has(id)));
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError('Failed to load devices for selected accounts');
    }
  };

  // Fetch available range based on current selections
  const refreshAvailableRange = async (projectOverride) => {
    try {
      const hasAccounts = selectedAccounts && selectedAccounts.length > 0;
      const params = {};
      if (hasAccounts) {
        params.account_ids = selectedAccounts.join(',');
        if (selectedDevices && selectedDevices.length > 0) {
          params.device_ids = selectedDevices.join(',');
        }
      } else {
        const pid = projectOverride || selectedProject;
        if (pid) params.project_id = pid;
      }
      const { data } = await baseAPI.get('/reporting/carbon-impact/available-range', { params });
      if (data && data.min_date && data.max_date) {
        const min = dayjs(data.min_date).startOf('month');
        const max = dayjs(data.max_date).endOf('month');
        setAvailableMinDate(min);
        setAvailableMaxDate(max);
        setDateRange([min, max]);
      }
    } catch (err) {
      // Non-blocking; keep existing defaults
      console.warn('Failed to refresh available range', err);
    }
  };

  const fetchReportData = async (projectId = null, range = null) => {
    const project = projectId || selectedProject;
    const dates = range || dateRange;
    
    if (!project || !dates) return;

    setLoading(true);
    setError(null);

    try {
      const startDate = dates[0].format('YYYY-MM-DD');
      const endDate = dates[1].format('YYYY-MM-DD');
      
      const response = await baseAPI.get('/reporting/carbon-impact/data', {
        params: {
          project_id: project,
          start_date: startDate,
          end_date: endDate
        }
      });
      
      const normalized = normalizeReportData(response.data);
      setReportData(normalized);
    } catch (err) {
      console.error('Error fetching report data:', err);
      if (err.response?.status === 404) {
        setError('No carbon impact data found for the selected project and date range');
      } else {
        setError('Failed to load carbon impact data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountReportData = async (accounts = null, devices = null, range = null) => {
    const accountList = accounts || selectedAccounts;
    const deviceList = devices !== null ? devices : selectedDevices;
    const dates = range || dateRange;
    
    if (accountList.length === 0 || !dates) return;

    setLoading(true);
    setError(null);

    try {
      const startDate = dates[0].format('YYYY-MM-DD');
      const endDate = dates[1].format('YYYY-MM-DD');
      const accountIds = accountList.join(',');
      const deviceIds = deviceList.length > 0 ? deviceList.join(',') : undefined;
      
      const response = await baseAPI.get('/reporting/carbon-impact/account-data', {
        params: {
          account_ids: accountIds,
          start_date: startDate,
          end_date: endDate,
          ...(deviceIds ? { device_ids: deviceIds } : {})
        }
      });
      
      const data = response.data;
      
      // Check if we have the action_required field (no carbon data)
      if (data.action_required) {
        setError(data.message);
        return;
      }

      // Transform account-level data to match existing chart expectations
      const transformedData = {
        ...data,
        kpis: {
          total_generation_mwh: data.account_summary?.total_generation_mwh || 0,
          weighted_avg_mer: data.account_summary?.weighted_avg_mer_kgco2_per_mwh || 0, // kgCO2e/MWh
          median_mer: data.account_summary?.median_mer_kgco2_per_mwh || 0, // kgCO2e/MWh
          total_avoided_emissions_kg: data.account_summary?.total_avoided_emissions_kg || 0, // kg CO2e
          net_impact_kg: data.account_summary?.total_avoided_emissions_kg || 0, // kg CO2e
          p25_mer: data.account_summary?.p25_mer || 0,
          p75_mer: data.account_summary?.p75_mer || 0,
          data_quality: data.account_summary?.data_quality || {}
        },
        // Keep MER values in kgCO2e/MWh for charts and summaries
        hourlyData: data.hourlyData?.map(item => ({
          ...item,
          combined_mer: item.mer_kgco2_per_mwh, // kgCO2e/MWh
          om_kgco2_per_mwh: item.om_kgco2_per_mwh,
          bm_kgco2_per_mwh: item.bm_kgco2_per_mwh,
          avoided_emissions: item.avoided_emissions_kg // keep kg for any textual display
        })) || []
      };
      
      const normalized = normalizeReportData(transformedData);
      setReportData(normalized);
    } catch (err) {
      console.error('Error fetching account report data:', err);
      if (err.response?.status === 404) {
        setError('No carbon impact data found for the selected accounts and date range');
      } else if (err.response?.status === 403) {
        setError('Access denied to one or more selected accounts');
      } else {
        setError('Failed to load carbon impact data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedAccounts.length > 0) {
      await fetchAccountReportData();
    } else if (selectedProject) {
      await fetchReportData();
    } else {
      message.warning('Please select at least one account or a legacy project.');
    }
  };

  // Recompute available range when devices or project selection changes
  useEffect(() => {
    refreshAvailableRange();
  }, [selectedDevices, selectedProject]);

  const handleRefreshChart = () => {
    console.log('Manual chart refresh triggered');
    setChartVersion(prev => prev + 1);
    message.info('Chart refreshed');
  };


  const createBarChart = () => {
    console.log('=== createBarChart called ===');
    console.log('Chart version:', chartVersion);
    console.log('Report data exists:', !!reportData);
    if (!reportData) return null;

    // Filter by selected devices if any
    const data = (selectedDevices.length > 0)
      ? reportData.hourlyData.filter(d => selectedDevices.includes(d.device_id))
      : reportData.hourlyData;

    if (!data.length) return { data: [], layout: { autosize: true, height: config.visualization.chart_height } };

    // Fixed 100-kg bins from 0 to 1000 kgCO2e/MWh
    const minV = 0;
    const maxV = 1000;
    const step = 100;
    const edges = Array.from({ length: (maxV - minV) / step + 1 }, (_, i) => minV + i * step); // 0..1000
    const binCount = edges.length - 1; // 10 bins

    const binData = new Array(binCount).fill(0);
    const binColors = new Array(binCount).fill(0);
    const binLabels = Array.from({ length: binCount }, (_, i) => `${edges[i]}-${edges[i + 1]}`);

    for (const d of data) {
      const v = d.combined_mer;
      // Clamp to 0..1000, values outside go to nearest edge bin
      const clamped = Math.min(maxV - 0.0001, Math.max(minV, Number(v) || 0));
      const idx = Math.floor((clamped - minV) / step);
      binData[idx] += d.mwh;
      binColors[idx] += clamped * d.mwh;
    }

    // Create colors based on MER values - matching heatmap: low MER (red) to high MER (green)
    const colors = [];
    for (let i = 0; i < binCount; i++) {
      if (binData[i] > 0) {
        // Calculate average MER for this bin
        const avgMer = binColors[i] / binData[i];
        // Normalize MER value between 0 and 1000
        const normalizedMer = Math.min(1, Math.max(0, avgMer / 1000));
        
        // Match heatmap color scale: red (low) -> yellow (mid) -> green (high)
        let red, green, blue;
        if (normalizedMer <= 0.5) {
          // Interpolate from red (220, 53, 69) to yellow (255, 193, 7)
          const t = normalizedMer * 2; // Scale 0-0.5 to 0-1
          red = Math.floor(220 + (255 - 220) * t);
          green = Math.floor(53 + (193 - 53) * t);
          blue = Math.floor(69 + (7 - 69) * t);
        } else {
          // Interpolate from yellow (255, 193, 7) to green (40, 167, 69)
          const t = (normalizedMer - 0.5) * 2; // Scale 0.5-1.0 to 0-1
          red = Math.floor(255 + (40 - 255) * t);
          green = Math.floor(193 + (167 - 193) * t);
          blue = Math.floor(7 + (69 - 7) * t);
        }
        colors.push(`rgb(${red}, ${green}, ${blue})`);
        
        // Debug logging
        console.log(`Bin ${i}: MER=${avgMer.toFixed(3)}, normalized=${normalizedMer.toFixed(3)}, color=rgb(${red},${green},${blue})`);
      } else {
        colors.push('rgb(128, 128, 128)'); // Default gray for empty bins
      }
    }

    // Use numeric x values (bin centers) so axis can be fixed 0..1000
    const binCenters = Array.from({ length: binCount }, (_, i) => edges[i] + step / 2);

    const chartConfig = {
      data: [{
        x: binCenters,
        y: binData,
        type: 'bar',
        width: step * 0.95,
        marker: { color: colors },
        text: binData.map(v => v.toFixed(1)),
        textposition: 'outside',
        customdata: binLabels,
        hovertemplate: '<b>MER Range:</b> %{customdata} kgCO2e/MWh<br><b>Energy:</b> %{y:,.1f} MWh<extra></extra>'
      }],
      layout: {
        xaxis: { 
          title: { text: 'Marginal Emissions Factor (kgCO2e/MWh)' },
          automargin: true,
          range: [minV, maxV],
          tick0: 0,
          dtick: step,
          tickformat: 'd',
          zeroline: false
        },
        yaxis: { 
          title: { text: 'Energy Generation (MWh)' },
          automargin: true
        },
        autosize: true,
        height: config.visualization.chart_height,
        margin: { t: 20, l: 80, r: 20, b: 80 },
        plot_bgcolor: '#f0f8ff',
        paper_bgcolor: '#f0f8ff',
        showlegend: false
      },
      config: { responsive: true },
      useResizeHandler: true,
      style: { width: '100%', height: `${config.visualization.chart_height}px` }
    };
    
    // Debug logging
    console.log('Chart version:', chartVersion);
    console.log('Chart title:', chartConfig.layout.title);
    console.log('X-axis title:', chartConfig.layout.xaxis.title);
    console.log('Y-axis title:', chartConfig.layout.yaxis.title);
    console.log('Colors array:', colors);
    
    return chartConfig;
  };

  const createTimeSeriesChart = () => {
    if (!reportData) return null;

    // Filter by selected devices if any; keep hourly resolution
    const data = (selectedDevices.length > 0)
      ? reportData.hourlyData.filter(d => selectedDevices.includes(d.device_id))
      : reportData.hourlyData;

    // Normalize all points to a single local timezone for consistent plotting
    const localTz = dayjs.tz.guess();
    const normalized = data.map(d => {
      const raw = d.timestamp_utc || d.timestamp;
      const utc = dayjs.utc(raw);
      const local = utc.tz(localTz);
      return {
        xLocal: local.format('YYYY-MM-DDTHH:mm:ss'),
        xHourKey: local.format('YYYY-MM-DDTHH'), // bucket by local hour
        mwh: Number(d.mwh) || 0,
        mer: Number(d.combined_mer) || 0,
        localLabel: local.format('YYYY-MM-DD HH:00 z'),
      };
    });

    // Aggregate by local hour across devices to avoid duplicate MER points per hour
    const buckets = new Map();
    for (const r of normalized) {
      const existing = buckets.get(r.xHourKey) || { mwh: 0, merNumer: 0, label: r.localLabel };
      existing.mwh += r.mwh;
      existing.merNumer += r.mwh * r.mer; // weighted by generation
      buckets.set(r.xHourKey, existing);
    }

    const hourKeys = Array.from(buckets.keys()).sort();
    const dates = hourKeys.map(h => `${h}:00:00`);
    const mwhData = hourKeys.map(h => buckets.get(h).mwh);
    const merData = hourKeys.map(h => {
      const b = buckets.get(h);
      return b.mwh > 0 ? b.merNumer / b.mwh : 0;
    });
    const labels = hourKeys.map(h => buckets.get(h).label);

    return {
      data: [
        {
          x: dates,
          y: mwhData,
          type: 'bar',
          name: 'Generation',
          marker: { color: config.visualization.generation_line_color, opacity: 0.7 },
          yaxis: 'y',
          hovertemplate: '<b>Local time:</b> %{customdata}<br><b>MWh:</b> %{y:.2f}<extra></extra>',
          customdata: labels
        },
        {
          x: dates,
          y: merData,
          type: 'scatter',
          mode: 'lines+markers',
          name: 'MER',
          line: { color: config.visualization.mer_bar_color, width: 2 },
          marker: { size: 4 },
          yaxis: 'y2',
          hovertemplate: '<b>Local time:</b> %{customdata}<br><b>MER (weighted):</b> %{y:.3f} kgCO2e/MWh<extra></extra>',
          customdata: labels
        }
      ],
      layout: {
        title: 'Generation and Marginal Emissions Rate Over Time',
        xaxis: { title: { text: 'Time (Local)' }, automargin: true, type: 'date' },
        yaxis: { 
          title: { text: 'Energy Generation (MWh)' },
          side: 'left',
          automargin: true
        },
        yaxis2: { 
          title: { text: 'Marginal Emissions Rate (kgCO2e/MWh)' },
          side: 'right',
          overlaying: 'y',
          automargin: true
        },
        autosize: true,
        height: config.visualization.chart_height,
        legend: { 
          orientation: 'h', 
          y: -0.2, 
          x: 0.5, 
          xanchor: 'center',
          yanchor: 'top'
        },
        margin: { t: 60, l: 80, r: 80, b: 100 }
      },
      config: { responsive: true },
      useResizeHandler: true,
      style: { width: '100%', height: `${config.visualization.chart_height}px` }
    };
  };

  const createHourOfDayChart = () => {
    if (!reportData) return null;

    // Filter by selected devices if any
    const data = (selectedDevices.length > 0)
      ? reportData.hourlyData.filter(d => selectedDevices.includes(d.device_id))
      : reportData.hourlyData;

    if (!data.length) return { data: [], layout: { autosize: true, height: config.visualization.chart_height } };

    // Normalize all points to a single local timezone for consistent plotting
    const localTz = dayjs.tz.guess();
    const normalized = data.map(d => {
      const raw = d.timestamp_utc || d.timestamp;
      const utc = dayjs.utc(raw);
      const local = utc.tz(localTz);
      return {
        hour: local.hour(),
        mwh: Number(d.mwh) || 0,
        mer: Number(d.combined_mer) || 0,
      };
    });

    // Aggregate by hour of day
    const hourBuckets = new Array(24).fill().map(() => ({ mwh: 0, merNumer: 0, count: 0 }));
    
    for (const item of normalized) {
      const hour = item.hour;
      hourBuckets[hour].mwh += item.mwh;
      hourBuckets[hour].merNumer += item.mwh * item.mer; // weighted by generation
      hourBuckets[hour].count += 1;
    }

    // Calculate average MER for each hour (weighted by generation)
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const mwhData = hourBuckets.map(bucket => bucket.mwh);
    const merData = hourBuckets.map(bucket => 
      bucket.mwh > 0 ? bucket.merNumer / bucket.mwh : 0
    );

    return {
      data: [
        {
          x: hours,
          y: mwhData,
          type: 'bar',
          name: 'Energy Generation',
          marker: { color: config.visualization.generation_line_color, opacity: 0.7 },
          yaxis: 'y',
          hovertemplate: '<b>Hour:</b> %{x}:00<br><b>Energy:</b> %{y:.2f} MWh<extra></extra>'
        },
        {
          x: hours,
          y: merData,
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Avg MER',
          line: { color: config.visualization.mer_bar_color, width: 2 },
          marker: { size: 4 },
          yaxis: 'y2',
          hovertemplate: '<b>Hour:</b> %{x}:00<br><b>Avg MER:</b> %{y:.3f} kgCO2e/MWh<extra></extra>'
        }
      ],
      layout: {
        title: 'Hour of Day Aggregation (Local)',
        xaxis: { 
          title: { text: 'Hour of Day (0–23)' }, 
          zeroline: false, 
          automargin: true,
          range: [-0.5, 23.5],
          tick0: 0,
          dtick: 5
        },
        yaxis: { 
          title: { text: 'Energy (MWh)' }, 
          side: 'left',
          zeroline: false, 
          automargin: true 
        },
        yaxis2: { 
          title: { text: 'Avg MER (kgCO2e/MWh)' }, 
          side: 'right', 
          overlaying: 'y',
          zeroline: false, 
          automargin: true 
        },
        autosize: true,
        height: config.visualization.chart_height,
        legend: { 
          orientation: 'h', 
          y: -0.15, 
          x: 0.5, 
          xanchor: 'center',
          yanchor: 'top'
        },
        margin: { t: 60, l: 60, r: 60, b: 80 }
      },
      config: { responsive: true },
      useResizeHandler: true,
      style: { width: '100%', height: `${config.visualization.chart_height}px` }
    };
  };

  const createHeatmapChart = () => {
    if (!reportData) return null;

    // Filter by selected devices and exclude zero values (mwh==0 or MER==0)
    const filtered = ((selectedDevices.length > 0)
      ? reportData.hourlyData.filter(d => selectedDevices.includes(d.device_id))
      : reportData.hourlyData).filter(d => d.mwh > 0 && d.combined_mer > 0);

    // Build unique local days using precomputed local_date if provided
    const uniqueDays = [...new Set(filtered.map(d => {
      if (d.local_date) return d.local_date;
      const tz = d.device_timezone || dayjs.tz.guess();
      const raw = d.timestamp_utc || d.timestamp;
      return dayjs.utc(raw).tz(tz).format('YYYY-MM-DD');
    }))].sort();
    const numDays = uniqueDays.length;
    const heatmapData = Array(24).fill().map(() => Array(numDays).fill(null));
    const sums = Array(24).fill().map(() => Array(numDays).fill(0));

    filtered.forEach(d => {
      const hour = Number.isFinite(d.local_hour) ? d.local_hour : (() => {
        const tz = d.device_timezone || dayjs.tz.guess();
        const raw = d.timestamp_utc || d.timestamp;
        return dayjs.utc(raw).tz(tz).hour();
      })();
      const dayStr = d.local_date || (() => {
        const tz = d.device_timezone || dayjs.tz.guess();
        const raw = d.timestamp_utc || d.timestamp;
        return dayjs.utc(raw).tz(tz).format('YYYY-MM-DD');
      })();
      const dayIndex = uniqueDays.indexOf(dayStr);
      if (dayIndex >= 0) {
        sums[hour][dayIndex] += d.mwh;
        const prior = heatmapData[hour][dayIndex];
        const accum = (prior === null ? 0 : prior * (sums[hour][dayIndex] - d.mwh)) + d.combined_mer * d.mwh;
        heatmapData[hour][dayIndex] = accum / sums[hour][dayIndex];
      }
    });

    const dayLabels = uniqueDays.map((day, index) => {
      if (numDays <= 31) return dayjs(day).format('MMM DD');
      if (index % 7 === 0 || dayjs(day).date() === 1) return dayjs(day).format('MMM DD');
      return '';
    });
    const hourLabels = Array(24).fill().map((_, i) => `${i.toString().padStart(2, '0')}:00`);

    return {
      data: [{
        z: heatmapData,
        x: dayLabels,
        y: hourLabels,
        type: 'heatmap',
        colorscale: [
          [0.0, 'rgb(220, 53, 69)'],   // red for low MER
          [0.5, 'rgb(255, 193, 7)'],   // yellow mid
          [1.0, 'rgb(40, 167, 69)']    // green for high MER
        ],
        reversescale: false,
        showscale: true,
        colorbar: { 
          title: { 
            text: 'Avg MER<br>(kgCO2e/MWh)',
            side: 'right'
          }
        },
        hovertemplate: '<b>Date:</b> %{x}<br><b>Hour:</b> %{y}<br><b>Avg MER:</b> %{z:.3f} kgCO2e/MWh<extra></extra>'
      }],
      layout: {
        title: 'Marginal Emissions Impact Heatmap (Hourly by Local Day)',
        xaxis: { title: { text: 'Date' }, tickangle: -45, tickfont: { size: 10 }, automargin: true },
        yaxis: { title: { text: 'Hour of Local Day' }, autorange: 'reversed', automargin: true },
        autosize: true,
        height: config.visualization.chart_height,
        margin: { l: 60, r: 80, t: 80, b: 100 }
      },
      config: { responsive: true },
      useResizeHandler: true,
      style: { width: '100%', height: `${config.visualization.chart_height}px` }
    };
  };

  const handleExportPDF = async () => {
    if ((selectedAccounts.length === 0 && !selectedProject) || !dateRange) {
      message.error('Please select account(s) or project and date range');
      return;
    }

    setExportingPDF(true);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      // 1) Preferred path: ask backend to return a presigned S3 link
      try {
        if (selectedAccounts.length > 0) {
          const accountIds = selectedAccounts.join(',');
          const { data } = await baseAPI.post('/reporting/carbon-impact/export-account-pdf', null, {
            params: { account_ids: accountIds, start_date: startDate, end_date: endDate, delivery: 'link' },
          });
          if (data?.url) {
            window.open(data.url, '_blank', 'noopener');
            message.success('Report link generated');
            return;
          }
        } else {
          const { data } = await baseAPI.post('/reporting/carbon-impact/export-pdf', null, {
            params: { project_id: selectedProject, start_date: startDate, end_date: endDate, delivery: 'link' },
          });
          if (data?.url) {
            window.open(data.url, '_blank', 'noopener');
            message.success('Report link generated');
            return;
          }
        }
      } catch (linkErr) {
        // Fall back to inline PDF bytes if link flow not available
        console.warn('Link export not available, falling back to inline bytes...', linkErr);
      }

      // 2) Fallback: request inline PDF and download as before
      let response;
      if (selectedAccounts.length > 0) {
        const accountIds = selectedAccounts.join(',');
        response = await baseAPI.post('/reporting/carbon-impact/export-account-pdf', null, {
          params: { account_ids: accountIds, start_date: startDate, end_date: endDate, delivery: 'inline' },
          responseType: 'blob',
        });
      } else {
        response = await baseAPI.post('/reporting/carbon-impact/export-pdf', null, {
          params: { project_id: selectedProject, start_date: startDate, end_date: endDate, delivery: 'inline' },
          responseType: 'blob',
        });
      }

      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const contentDisposition = response.headers['content-disposition'];
      let filename;
      if (selectedAccounts.length > 0) {
        const accountSuffix = selectedAccounts.length === 1 ? selectedAccounts[0] : `${selectedAccounts.length}_accounts`;
        filename = `carbon_impact_account_report_${accountSuffix}_${startDate}_${endDate}.pdf`;
      } else {
        filename = `carbon_impact_report_${selectedProject}_${startDate}_${endDate}.pdf`;
      }
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match) filename = match[1].replace(/['"]/g, '');
      }
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('PDF report downloaded successfully!');
    } catch (err) {
      console.error('Error exporting PDF:', err);
      message.error('Failed to generate PDF report');
    } finally {
      setExportingPDF(false);
    }
  };

  const summaryCards = useMemo(() => {
    if (!reportData) return [];

    return [
      {
        title: 'Total Generation',
        value: reportData.kpis.total_generation_mwh,
        suffix: 'MWh',
        precision: 1,
        icon: <BarChartOutlined style={{ color: '#1890ff' }} />
      },
      {
        title: 'Avoided Emissions',
        value: reportData.kpis.total_avoided_emissions_kg,
        suffix: 'kg CO2e',
        precision: 1,
        icon: <EnvironmentOutlined style={{ color: '#52c41a' }} />
      },
      {
        title: 'Weighted Avg MER',
        value: reportData.kpis.weighted_avg_mer,
        suffix: 'kgCO2e/MWh',
        precision: 3,
        icon: <LineChartOutlined style={{ color: '#fa8c16' }} />
      },
      {
        title: 'Net Impact',
        value: reportData.kpis.net_impact_kg,
        suffix: 'kg CO2e',
        precision: 1,
        icon: <EnvironmentOutlined style={{ color: '#13c2c2' }} />
      }
    ];
  }, [reportData]);

  const monthlyColumns = [
    {
      title: 'Month',
      dataIndex: 'month_name',
      key: 'month_name'
    },
    {
      title: 'Generation (MWh)',
      dataIndex: 'total_mwh',
      key: 'total_mwh',
      render: (value) => value.toFixed(1)
    },
    {
      title: 'Avg MER (kgCO2e/MWh)',
      dataIndex: 'weighted_avg_mer',
      key: 'weighted_avg_mer',
      render: (value) => value.toFixed(3)
    },
    {
      title: 'Avoided Emissions (kg CO2e)',
      dataIndex: 'total_avoided',
      key: 'total_avoided',
      render: (value) => Number(value).toFixed(1)
    }
  ];

  const sensitivityColumns = [
    {
      title: 'Scenario',
      dataIndex: 'scenario',
      key: 'scenario'
    },
    {
      title: 'MER Adjustment',
      dataIndex: 'mer_adjustment',
      key: 'mer_adjustment'
    },
    {
      title: 'Total Avoided (kg CO2e)',
      dataIndex: 'total_avoided_mt',
      key: 'total_avoided_mt',
      render: (value) => (Number(value) * 1000).toFixed(1)
    },
    {
      title: 'Change from Baseline',
      dataIndex: 'delta_percent',
      key: 'delta_percent',
      render: (value) => (
        <Tag color={value === '0%' ? 'default' : value.startsWith('+') ? 'red' : 'green'}>
          {value}
        </Tag>
      )
    }
  ];

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/reporting')}
          style={{ marginBottom: '16px' }}
        >
          Back to Reports
        </Button>
        <Alert
          message="Error Loading Carbon Impact Report"
          description={error}
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/reporting')}
            style={{ marginBottom: '16px' }}
          >
            Back to Reports
          </Button>
          <Title level={2}>
            <EnvironmentOutlined style={{ marginRight: '8px' }} />
            Carbon Impact Report
          </Title>
          <Text type="secondary">
            Quantified avoided emissions from granular certificates using marginal emissions factors
          </Text>
        </div>

        {/* Controls */}
        <ReportingFiltersBar
          baseKey="carbon-impact"
          exportEnabled={true}
          defaultSelectAll={true}
          onLoad={async ({ mode, params }) => {
            if (mode === 'accounts') {
              const accounts = params.account_ids.split(',').map((v) => Number(v));
              const devices = params.device_ids ? params.device_ids.split(',').map((v) => Number(v)) : [];
              const range = [dayjs(params.start_date), dayjs(params.end_date)];
              
              // Set state for UI
              setSelectedAccounts(accounts);
              setSelectedDevices(devices);
              setDateRange(range);
              
              // Fetch using the fresh values (not state)
              await fetchAccountReportData(accounts, devices, range);
            } else {
              const projectId = params.project_id;
              const range = [dayjs(params.start_date), dayjs(params.end_date)];
              
              // Set state for UI
              setSelectedProject(projectId);
              setDateRange(range);
              
              // Fetch using the fresh values (not state)
              await fetchReportData(projectId, range);
            }
          }}
          onExport={async () => {
            await handleExportPDF();
          }}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Loading carbon impact data...</div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            {reportData && (
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {summaryCards.map((card, index) => (
                  <Col xs={24} sm={12} lg={6} key={index}>
                    <Card size="small">
                      <Statistic
                        title={card.title}
                        value={card.value}
                        suffix={card.suffix}
                        precision={card.precision}
                        prefix={card.icon}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            )}

            {/* Executive Summary */}
            {reportData && (
              <Card title="Executive Summary" size="small" style={{ marginBottom: 16 }}>
                <Paragraph>
                  {selectedAccounts.length > 0 ? (
                    <>
                      <Text strong>Selected Account{selectedAccounts.length > 1 ? 's' : ''}</Text> avoided{' '}
                      <Text strong>{(reportData?.kpis?.total_avoided_emissions_kg || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg CO2e</Text> via marginal displacement 
                      during {reportData.period}. The account{selectedAccounts.length > 1 ? 's' : ''} generated{' '}
                      <Text strong>{(reportData?.kpis?.total_generation_mwh || 0).toFixed(1)} MWh</Text> across{' '}
                      {reportData.device_breakdown?.length || 0} device{(reportData.device_breakdown?.length || 0) !== 1 ? 's' : ''} with a weighted average 
                      marginal emissions factor of <Text strong>{(reportData?.kpis?.weighted_avg_mer || 0).toFixed(3)} kgCO2e/MWh</Text>.
                    </>
                  ) : (
                    <>
                      <Text strong>{projects.find(p => p.id === selectedProject)?.name || 'Selected Project'}</Text> avoided{' '}
                      <Text strong>{(reportData?.kpis?.total_avoided_emissions_kg || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg CO2e</Text> via marginal displacement 
                      during {reportData.period}. The project generated{' '}
                      <Text strong>{(reportData?.kpis?.total_generation_mwh || 0).toFixed(1)} MWh</Text> with a weighted average 
                      marginal emissions factor of <Text strong>{(reportData?.kpis?.weighted_avg_mer || 0).toFixed(3)} kgCO2e/MWh</Text>.
                    </>
                  )}
                </Paragraph>
                
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={12}>
                    <Text type="secondary">Methodology:</Text>
                    <div style={{ marginTop: 8 }}>
                      <Text>Combined EF = OM × (1 - w) + BM × w</Text><br/>
                      <Text type="secondary">Default weight (w) = 0.5 (50/50 OM/BM)</Text>
                    </div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Data Quality:</Text>
                    <div style={{ marginTop: 8 }}>
                      <Text>Total Records: {reportData?.kpis?.data_quality?.total_rows?.toLocaleString?.() || 0}</Text><br/>
                      <Text>Missing BM Values: {reportData?.kpis?.data_quality?.missing_bm || 0}</Text><br/>
                      <Text>Zero Generation: {reportData?.kpis?.data_quality?.zero_generation_rows || 0}</Text>
                    </div>
                  </Col>
                </Row>
              </Card>
            )}

            {/* Device Breakdown Table */}
            {reportData?.device_breakdown && reportData.device_breakdown.length > 0 && (
              <Card title="Device Breakdown" size="small" style={{ marginBottom: 16 }}>
                <Table
                  dataSource={reportData.device_breakdown}
                  rowKey="device_id"
                  pagination={false}
                  size="small"
                  rowSelection={{
                    selectedRowKeys: selectedDevices,
                    onChange: setSelectedDevices,
                    getCheckboxProps: (record) => ({
                      name: record.device_name,
                    }),
                  }}
                  columns={[
                    {
                      title: 'Device Name',
                      dataIndex: 'device_name',
                      key: 'device_name',
                      sorter: (a, b) => a.device_name.localeCompare(b.device_name),
                    },
                    {
                      title: 'Technology',
                      dataIndex: 'technology_type',
                      key: 'technology_type',
                      filters: [...new Set(reportData.device_breakdown.map(d => d.technology_type))].map(tech => ({
                        text: tech,
                        value: tech,
                      })),
                      onFilter: (value, record) => record.technology_type === value,
                    },
                    {
                      title: 'Generation (MWh)',
                      dataIndex: 'total_generation_mwh',
                      key: 'total_generation_mwh',
                      render: (value) => value.toFixed(1),
                      sorter: (a, b) => a.total_generation_mwh - b.total_generation_mwh,
                      sortDirections: ['descend', 'ascend'],
                    },
                    {
                      title: 'Avg MER (kgCO2e/MWh)',
                      dataIndex: 'weighted_avg_mer',
                      key: 'weighted_avg_mer',
                      render: (value) => value.toFixed(3),
                      sorter: (a, b) => a.weighted_avg_mer - b.weighted_avg_mer,
                    },
                    {
                      title: 'Avoided Emissions (kg CO2e)',
                      dataIndex: 'avoided_emissions_kg',
                      key: 'avoided_emissions_kg',
                      render: (value) => value.toLocaleString(undefined, { maximumFractionDigits: 0 }),
                      sorter: (a, b) => a.avoided_emissions_kg - b.avoided_emissions_kg,
                      sortDirections: ['descend', 'ascend'],
                    },
                  ]}
                />
                <div style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
                  <InfoCircleOutlined style={{ marginRight: 4 }} />
                  Select devices to filter charts below
                </div>
              </Card>
            )}

            {/* Visualizations */}
            {reportData && (
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Card 
                    title={
                      <Space>
                        <BarChartOutlined />
                        Hour of Day Aggregation (Local)
                      </Space>
                    }
                    size="small"
                  >
                    <Plot {...createHourOfDayChart()} />
                  </Card>
                </Col>
                
                <Col span={24}>
                  <Card 
                    title={
                      <Space>
                        <BarChartOutlined />
                        Energy Distribution by Marginal Emissions Factor Bins
                      </Space>
                    }
                    size="small"
                  >
                    <Plot 
                      key={`chart-v${chartVersion}-${JSON.stringify(reportData?.hourlyData?.length || 0)}`} 
                      {...createBarChart()} 
                    />
                  </Card>
                </Col>
                
                <Col span={24}>
                  <Card 
                    title={
                      <Space>
                        <LineChartOutlined />
                        Generation and Emissions Over Time
                      </Space>
                    }
                    size="small"
                  >
                    <Plot {...createTimeSeriesChart()} />
                  </Card>
                </Col>
                
                <Col span={24}>
                  <Card 
                    title={
                      <Space>
                        <HeatMapOutlined />
                        Hourly Emissions Pattern
                      </Space>
                    }
                    size="small"
                  >
                    <Plot {...createHeatmapChart()} />
                  </Card>
                </Col>
              </Row>
            )}

            {/* Removed Monthly Distribution and Sensitivity Analysis as requested */}

            

            {/* Methodology */}
            {reportData && (
              <Card title="Calculation Methodology" size="small">
                <Paragraph>
                  <Title level={4}>Combined Long-Run Emissions Factor</Title>
                  <Text>This report calculates avoided emissions using long-run marginal emissions factors (MERs) 
                  following GHG Protocol project-level accounting guidelines.</Text>
                </Paragraph>
                
                <Paragraph>
                  <Text strong>Formula:</Text><br/>
                  <Text code>Combined EF = OM × (1 - w) + COALESCE(BM, 0) × w</Text>
                </Paragraph>
                
                <Paragraph>
                  <Text strong>Where:</Text>
                  <ul>
                    <li><Text strong>OM:</Text> Operating Margin from WattTime (kgCO2e/MWh)</li>
                    <li><Text strong>BM:</Text> Build Margin from Climate Trace via mber_hourly table</li>
                    <li><Text strong>w:</Text> Weight factor (default 0.5 for 50/50 weighting)</li>
                    <li><Text strong>BM nulls:</Text> Treated as zero in calculations</li>
                  </ul>
                </Paragraph>
                
                <Paragraph>
                  <Text strong>Avoided Emissions:</Text><br/>
                  <Text code>Avoided Emissions = Σ(MWh_i × Combined_EF_i)</Text>
                </Paragraph>
                
                <Divider />
                
                <Title level={4}>Data Sources</Title>
                <ul>
                  <li><Text strong>Operating Margins:</Text> WattTime API (hourly/nodal where available)</li>
                  <li><Text strong>Build Margins:</Text> Climate Trace data via mber_hourly database table</li>
                  <li><Text strong>Generation Data:</Text> Granular Certificate Registry</li>
                  <li><Text strong>Methodology:</Text> GHG Protocol Scope 2 Guidance (project-level accounting)</li>
                </ul>
              </Card>
            )}
          </>
        )}
      </Space>
    </div>
  );
}
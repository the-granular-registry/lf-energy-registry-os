import React, { useEffect, useState, useRef } from 'react';
import { Card, Table, Button, Space, Modal, Descriptions, Input, message, Alert, Tag, Progress, Divider, Form, Select } from 'antd';
import { getPendingMeterDataApprovalsAPI, getMeterDataDetailedReviewAPI, approveMeterDataAPI } from '../../api/superAdminAPI';
import { getAllAccessibleDevicesAPI } from '../../api/deviceAPI';
import DeviceUploadDialog from '../device/DeviceUploadDataForm';

const MeasurementManagement = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [detail, setDetail] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [comments, setComments] = useState('Looks good');
  const [mfaToken, setMfaToken] = useState('');
  const [qualityScenario, setQualityScenario] = useState('perfect_balance');
  const [energyBalance, setEnergyBalance] = useState(null);
  const [eacScenario, setEacScenario] = useState('all_valid');
  const [eacValidation, setEacValidation] = useState(null);
  const [certScenario, setCertScenario] = useState('valid_all');
  const [certBounds, setCertBounds] = useState(null);
  const [temporalScenario, setTemporalScenario] = useState('complete');
  const [temporalAccuracy, setTemporalAccuracy] = useState(null);
  const [quality, setQuality] = useState(null);

  // Upload Meter Data (reuse device page form)
  const [uploadSelectVisible, setUploadSelectVisible] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectForm] = Form.useForm();
  const deviceUploadDialogRef = useRef();

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await getPendingMeterDataApprovalsAPI();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      message.error('Failed to load pending meter data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!detail) {
      setEnergyBalance(null);
      return;
    }

    const toMWh = (wh) => (typeof wh === 'number' ? wh / 1_000_000 : 0);
    const start = detail?.interval_start_datetime ? new Date(detail.interval_start_datetime) : null;
    const end = detail?.interval_end_datetime ? new Date(detail.interval_end_datetime) : null;

    let numHours = 24;
    if (start && end) {
      const diffMs = Math.max(0, end.getTime() - start.getTime());
      numHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)) || 1);
    }

    const meterTotalMWh = toMWh(detail?.interval_usage_wh) || 0;
    const meterPerHour = numHours > 0 ? meterTotalMWh / numHours : 0;

    const perHour = [];
    let certificateTotalMWh = 0;

    for (let i = 0; i < numHours; i += 1) {
      const hourLabel = start ? new Date(start.getTime() + i * 3600_000).toISOString().slice(0, 13) + ':00' : `Hour ${i + 1}`;

      let certificateMWh = meterPerHour;
      if (qualityScenario === 'minor_imbalance') {
        const delta = ((i % 2 === 0) ? 1 : -1) * 0.002;
        certificateMWh = Math.max(0, meterPerHour + delta);
      } else if (qualityScenario === 'significant_violation') {
        const delta = i === Math.floor(numHours / 2) ? 0.2 : 0.0;
        certificateMWh = Math.max(0, meterPerHour + delta);
      } else if (qualityScenario === 'under_reporting') {
        certificateMWh = Math.max(0, meterPerHour * 0.95);
      } else if (qualityScenario === 'over_reporting') {
        certificateMWh = meterPerHour * 1.05;
      }

      certificateTotalMWh += certificateMWh;
      const diffMWh = certificateMWh - meterPerHour;
      perHour.push({
        key: `${i}`,
        hour: hourLabel,
        meter_mwh: Number(meterPerHour.toFixed(3)),
        cert_mwh: Number(certificateMWh.toFixed(3)),
        diff_mwh: Number(diffMWh.toFixed(3)),
        isViolation: Math.abs(diffMWh) > 0.1,
      });
    }

    const totalDiffMWh = certificateTotalMWh - meterTotalMWh;
    const absDiff = Math.abs(totalDiffMWh);
    let status = 'success';
    let statusText = 'Perfect balance';
    if (absDiff > 0.1) {
      status = 'exception';
      statusText = 'Significant imbalance (> 0.1 MWh)';
    } else if (absDiff > 0.01) {
      status = 'active';
      statusText = 'Minor imbalance';
    }

    setEnergyBalance({
      meterTotalMWh: Number(meterTotalMWh.toFixed(3)),
      certificateTotalMWh: Number(certificateTotalMWh.toFixed(3)),
      totalDiffMWh: Number(totalDiffMWh.toFixed(3)),
      perHour,
      status,
      statusText,
      percentMatch: meterTotalMWh > 0 ? Math.max(0, Math.min(100, Math.round((1 - absDiff / Math.max(0.0001, meterTotalMWh)) * 100))) : 0,
    });
  }, [detail, qualityScenario]);

  // Story 2: EAC Metadata Consistency — mock validation
  useEffect(() => {
    if (!detail) {
      setEacValidation(null);
      return;
    }

    const toMWh = (wh) => (typeof wh === 'number' ? wh / 1_000_000 : 0);
    const meterTotalMWh = toMWh(detail?.interval_usage_wh) || 0;

    const numEACs = Math.max(1, Math.ceil(meterTotalMWh));
    const fullCount = Math.floor(meterTotalMWh);
    const remainder = Math.max(0, meterTotalMWh - fullCount);

    const year = new Date().getUTCFullYear();
    const batch = '000123';
    const mkStructuredId = (seq) => `EAC-${year}-${batch}-${String(seq).padStart(3, '0')}`;
    const mkNumericId = (seq) => String(100000000 + seq);

    let structuredSeqs = [];
    const eacs = [];
    for (let i = 1; i <= numEACs; i += 1) {
      let id = mkStructuredId(i);
      let energy = i <= fullCount ? 1.0 : (remainder > 0 ? Number(remainder.toFixed(3)) : 1.0);

      if (eacScenario === 'mixed_formats' && i % 2 === 0) {
        id = mkNumericId(i);
      }
      if (eacScenario === 'invalid_ids' && i % 3 === 0) {
        id = `BAD-${year}-${i}`;
      }
      if (eacScenario === 'over_limit' && i === 1) {
        energy = 1.2;
      }
      if (eacScenario === 'non_sequential') {
        const seq = i >= 3 ? i + 1 : i;
        if (/^EAC-/.test(id)) {
          id = mkStructuredId(seq);
        }
      }

      const isNumeric = /^[0-9]{9,}$/.test(id);
      const isStructured = /^EAC-\d{4}-\d{6}-\d{3}$/.test(id);
      const isValidId = isNumeric || isStructured;
      const exceedsLimit = energy > 1.0 + 1e-9;

      if (isStructured) {
        const seq = parseInt(id.slice(-3), 10);
        structuredSeqs.push(seq);
      }

      eacs.push({
        key: String(i),
        id,
        idFormat: isStructured ? 'structured' : (isNumeric ? 'numeric' : 'invalid'),
        energy_mwh: Number(energy.toFixed(3)),
        isValidId,
        exceedsLimit,
      });
    }

    let isSequential = true;
    if (structuredSeqs.length > 0) {
      structuredSeqs.sort((a, b) => a - b);
      for (let j = 1; j < structuredSeqs.length; j += 1) {
        if (structuredSeqs[j] !== structuredSeqs[j - 1] + 1) {
          isSequential = false;
          break;
        }
      }
    }

    const totalEnergy = eacs.reduce((s, e) => s + e.energy_mwh, 0);
    const capacity = eacs.length * 1.0;
    const utilization = capacity > 0 ? Math.round((totalEnergy / capacity) * 100) : 0;
    const numInvalidIds = eacs.filter((e) => !e.isValidId).length;
    const numOverLimit = eacs.filter((e) => e.exceedsLimit).length;
    const hasViolations = numInvalidIds > 0 || numOverLimit > 0 || !isSequential;

    setEacValidation({
      eacs,
      isSequential,
      numInvalidIds,
      numOverLimit,
      utilization,
      totalEnergy: Number(totalEnergy.toFixed(3)),
      capacity,
      hasViolations,
    });
  }, [detail, eacScenario]);

  // Story 3: Certificate Energy Bounds Validation — mock certificates
  useEffect(() => {
    if (!detail) {
      setCertBounds(null);
      return;
    }

    const toMWh = (wh) => (typeof wh === 'number' ? wh / 1_000_000 : 0);
    const totalMWh = toMWh(detail?.interval_usage_wh) || 0;
    const count = Math.min(50, Math.max(1, Math.ceil(totalMWh * 2)));
    const base = count > 0 ? totalMWh / count : 0;

    const certs = [];
    let remaining = totalMWh;
    for (let i = 0; i < count; i += 1) {
      let energy = Number((i === count - 1 ? remaining : base).toFixed(3));
      remaining = Math.max(0, Number((remaining - energy).toFixed(6)));

      if (certScenario === 'over_one_mwh' && i === 0) {
        energy = 1.2;
      }
      if (certScenario === 'zero_or_negative' && i === 1) {
        energy = 0.0;
      }
      if (certScenario === 'zero_or_negative' && i === 2) {
        energy = -0.1;
      }
      if (certScenario === 'mixed_whole_partial') {
        energy = i % 3 === 0 ? 1.0 : Math.max(0.001, Number((base * 0.6).toFixed(3)));
      }
      if (certScenario === 'skewed_distribution') {
        const factor = i < Math.floor(count * 0.2) ? 0.1 : (i < Math.floor(count * 0.8) ? 0.6 : 0.9);
        energy = Math.min(1.0, Math.max(0.0, Number((base * factor).toFixed(3))));
      }

      const isOverLimit = energy > 1.0 + 1e-9;
      const isNonPositive = energy <= 0;
      const isWhole = Math.abs(energy - 1.0) < 1e-6 || Number(energy.toFixed(3)) === 1.0;

      certs.push({
        key: `cert-${i + 1}`,
        certificate_id: `CERT-${String(i + 1).padStart(3, '0')}`,
        energy_mwh: Number(energy.toFixed(3)),
        type: isWhole ? 'whole' : 'partial',
        isOverLimit,
        isNonPositive,
      });
    }

    const energies = certs.map((c) => c.energy_mwh);
    const minEnergy = energies.length ? Math.min(...energies) : 0;
    const maxEnergy = energies.length ? Math.max(...energies) : 0;
    const avgEnergy = energies.length ? Number((energies.reduce((a, b) => a + b, 0) / energies.length).toFixed(3)) : 0;
    const wholeCount = certs.filter((c) => c.type === 'whole').length;
    const partialCount = certs.filter((c) => c.type === 'partial').length;
    const numOver = certs.filter((c) => c.isOverLimit).length;
    const numNonPositive = certs.filter((c) => c.isNonPositive).length;

    setCertBounds({
      certs,
      minEnergy,
      maxEnergy,
      avgEnergy,
      wholeCount,
      partialCount,
      numOver,
      numNonPositive,
    });
  }, [detail, certScenario]);

  // Story 4: Temporal Splitting Accuracy — mock coverage, gaps, overlaps, carryover
  useEffect(() => {
    if (!detail) {
      setTemporalAccuracy(null);
      return;
    }

    const start = detail?.interval_start_datetime ? new Date(detail.interval_start_datetime) : null;
    const end = detail?.interval_end_datetime ? new Date(detail.interval_end_datetime) : null;

    let numHours = 24;
    if (start && end) {
      const diffMs = Math.max(0, end.getTime() - start.getTime());
      numHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)) || 1);
    }

    const hours = Array.from({ length: numHours }, (_, i) => ({
      key: `h-${i}`,
      idx: i,
      hour: start ? new Date(start.getTime() + i * 3600_000).toISOString().slice(0, 13) + ':00' : `Hour ${i + 1}`,
      covered: true,
      overlapCount: 1,
      carryoverIn: 0,
      carryoverOut: 0,
      hasGap: false,
      hasOverlap: false,
      carryoverIssue: false,
    }));

    // Scenarios
    if (temporalScenario === 'with_gaps') {
      for (const i of [2, 7]) {
        if (hours[i]) {
          hours[i].covered = false;
          hours[i].hasGap = true;
          hours[i].overlapCount = 0;
        }
      }
    } else if (temporalScenario === 'with_overlaps') {
      for (const i of [3, 4]) {
        if (hours[i]) {
          hours[i].overlapCount = 2;
          hours[i].hasOverlap = true;
        }
      }
    }

    // Carryover simulation: match previous out to next in
    for (let i = 0; i < hours.length; i += 1) {
      const prevOut = i > 0 ? hours[i - 1].carryoverOut : 0;
      hours[i].carryoverIn = prevOut;
      // Create some plausible carryover flow
      hours[i].carryoverOut = (i % 5 === 0) ? 0.05 : 0.0; // 0.05 MWh every 5th hour
    }

    if (temporalScenario === 'carryover_mismatch') {
      // Break the chain at one point
      const j = Math.min( Math.max(1, Math.floor(numHours / 3)), numHours - 1);
      if (hours[j]) {
        hours[j].carryoverIn = 0.02; // does not equal previous carryoverOut (0.05 or 0)
        hours[j].carryoverIssue = true;
      }
    }

    const coveredCount = hours.filter((h) => h.covered).length;
    const gaps = hours.filter((h) => h.hasGap).map((h) => h.hour);
    const overlaps = hours.filter((h) => h.hasOverlap).map((h) => h.hour);
    const carryIssues = hours.filter((h) => h.carryoverIssue).map((h) => h.hour);

    setTemporalAccuracy({
      hours,
      completenessPct: Math.round((coveredCount / Math.max(1, hours.length)) * 100),
      gaps,
      overlaps,
      carryIssues,
      hasIssues: gaps.length > 0 || overlaps.length > 0 || carryIssues.length > 0,
    });
  }, [detail, temporalScenario]);

  // Story 5 & 6: Quality Dashboard, Scoring, Recommendations
  useEffect(() => {
    if (!detail) {
      setQuality(null);
      return;
    }

    // Only compute when sub-metrics are available
    if (!energyBalance || !eacValidation || !certBounds || !temporalAccuracy) {
      return;
    }

    // Component scores
    const absDiff = Math.abs(energyBalance.totalDiffMWh ?? 0);
    let energyScore = 100;
    if (absDiff > 0.1) energyScore = 40;
    else if (absDiff > 0.05) energyScore = 80;
    else if (absDiff > 0.01) energyScore = 90;
    else if (absDiff > 0.001) energyScore = 95;
    else energyScore = 100;

    const validIdRatio = eacValidation.eacs.length
      ? (eacValidation.eacs.length - eacValidation.numInvalidIds) / eacValidation.eacs.length
      : 1;
    const withinLimitRatio = eacValidation.eacs.length
      ? (eacValidation.eacs.length - eacValidation.numOverLimit) / eacValidation.eacs.length
      : 1;
    const seqScore = eacValidation.isSequential ? 1 : 0.7;
    const eacScore = Math.round((validIdRatio * 0.5 + withinLimitRatio * 0.3 + seqScore * 0.2) * 100);

    let certScore = 100;
    if (certBounds.numOver > 0) certScore -= 60;
    if (certBounds.numNonPositive > 0) certScore -= 60;
    certScore = Math.max(0, Math.min(100, certScore));

    let temporalScore = Math.max(0, Math.min(100, Number(temporalAccuracy.completenessPct || 0)));
    if (temporalAccuracy.gaps.length > 0) temporalScore -= 10;
    if (temporalAccuracy.overlaps.length > 0) temporalScore -= 10;
    if (temporalAccuracy.carryIssues.length > 0) temporalScore -= 10;
    temporalScore = Math.max(0, Math.min(100, temporalScore));

    // Weights
    const weights = { energy: 0.35, eac: 0.25, cert: 0.2, temporal: 0.2 };
    const overall = Math.round(
      energyScore * weights.energy + eacScore * weights.eac + certScore * weights.cert + temporalScore * weights.temporal
    );

    // Critical issues block auto-approval
    const criticalIssues = [];
    if (absDiff > 0.1) criticalIssues.push('Energy imbalance > 0.1 MWh');
    if (certBounds.numOver > 0) criticalIssues.push('Certificate > 1 MWh');
    if (certBounds.numNonPositive > 0) criticalIssues.push('Certificate ≤ 0 MWh');

    // Recommendation category
    let recommendation = 'Auto-Approve';
    if (criticalIssues.length > 0) recommendation = 'Reject';
    else if (overall < 60) recommendation = 'Reject';
    else if (overall < 75) recommendation = 'Manual Review';
    else if (overall < 90) recommendation = 'Manual Review';
    else recommendation = 'Auto-Approve';

    const canAutoApprove = recommendation === 'Auto-Approve' && criticalIssues.length === 0;

    // Generate a simple trend based on overall
    const trend = Array.from({ length: 6 }, (_, i) => {
      const jitter = ((i % 3) - 1) * 2; // -2, 0, +2, repeat
      return Math.max(40, Math.min(100, overall + jitter - (6 - i)));
    });

    // Recommendations
    const recs = [];
    if (energyScore < 95) recs.push('Investigate energy allocation; minimize meter vs certificate differences.');
    if (eacScore < 100) recs.push('Fix EAC IDs and ensure ≤ 1 MWh; restore sequential numbering.');
    if (certScore < 100) recs.push('Ensure each certificate has 0 < energy ≤ 1 MWh; adjust splitting.');
    if (temporalScore < 95) recs.push('Resolve time gaps/overlaps and verify carryover matching.');

    setQuality({
      overall,
      breakdown: { energy: energyScore, eac: eacScore, cert: certScore, temporal: temporalScore },
      recommendation,
      criticalIssues,
      canAutoApprove,
      trend,
      recs,
    });
  }, [detail, energyBalance, eacValidation, certBounds, temporalAccuracy]);

  const showDetail = async (meterDataId) => {
    try {
      setLoading(true);
      const { data } = await getMeterDataDetailedReviewAPI(meterDataId);
      setDetail(data);
      setDetailVisible(true);
    } catch (e) {
      message.error('Failed to load meter data details');
    } finally {
      setLoading(false);
    }
  };

  const approve = async () => {
    if (!detail) return;
    try {
      setLoading(true);
      await approveMeterDataAPI(detail.measurement_report_id, 'APPROVE', comments, mfaToken || 'placeholder');
      message.success('Approved');
      setDetailVisible(false);
      setDetail(null);
      await load();
    } catch (e) {
      message.error(e?.response?.data?.detail || 'Approve failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    // Preload devices for selection
    const fetchDevices = async () => {
      try {
        const { data } = await getAllAccessibleDevicesAPI(true);
        const list = Array.isArray(data) ? data : (Array.isArray(data?.devices) ? data.devices : []);
        setDevices(list);
      } catch (e) {
        // Non-blocking
      }
    };
    fetchDevices();
  }, []);

  const openUploadFlow = () => {
    selectForm.resetFields();
    setUploadSelectVisible(true);
  };

  const startUploadForSelected = async () => {
    try {
      const values = await selectForm.validateFields();
      const device = devices.find((d) => d.id === values.device_id);
      if (!device) {
        message.error('Device not found');
        return;
      }
      setUploadSelectVisible(false);
      deviceUploadDialogRef.current?.openDialog({
        deviceName: device.device_name,
        deviceLocalID: device.local_device_identifier,
        deviceID: device.id,
      });
    } catch (e) {
      // antd validation errors handled by form
    }
  };

  const columns = [
    { title: 'Measurement ID', dataIndex: 'measurement_report_id', key: 'mid' },
    { title: 'Device', dataIndex: 'device_name', key: 'dn' },
    { title: 'Org', dataIndex: 'organization_name', key: 'on' },
    { title: 'Energy (Wh)', dataIndex: 'interval_usage_wh', key: 'wh' },
    { title: 'Submitted', dataIndex: 'submitted_at', key: 'sa' },
    {
      title: 'Files',
      key: 'files',
      render: (_, rec) => (
        <Space>
          <Button
            type="link"
            href={rec.raw_file_download_url || undefined}
            target="_blank"
            disabled={!rec.raw_file_download_url}
          >
            Raw
          </Button>
          <Button
            type="link"
            href={rec.processed_file_download_url || undefined}
            target="_blank"
            disabled={!rec.processed_file_download_url}
          >
            Processed
          </Button>
        </Space>
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, rec) => (
        <Space>
          <Button onClick={() => showDetail(rec.measurement_report_id)}>Review</Button>
        </Space>
      )
    },
  ];

  return (
    <Card title="Measurement Management" loading={loading} extra={(
      <Button type="primary" onClick={openUploadFlow}>Upload Meter Data</Button>
    )}>
      <Table rowKey={(r) => `${r.approval_id}`} dataSource={items} columns={columns} pagination={{ pageSize: 10 }} />

      <Modal title="Detailed Review" open={detailVisible} onCancel={() => setDetailVisible(false)} footer={null}>
        {detail && (
          <>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="Measurement ID">{detail.measurement_report_id}</Descriptions.Item>
              <Descriptions.Item label="Device">{detail.device_name}</Descriptions.Item>
              <Descriptions.Item label="Organization">{detail.organization_name}</Descriptions.Item>
              <Descriptions.Item label="Interval Usage (Wh)">{detail.interval_usage_wh}</Descriptions.Item>
              <Descriptions.Item label="Period Start">{detail.interval_start_datetime}</Descriptions.Item>
              <Descriptions.Item label="Period End">{detail.interval_end_datetime}</Descriptions.Item>
              <Descriptions.Item label="Gross/Net">{detail.gross_net_indicator}</Descriptions.Item>
            </Descriptions>
            {quality && (
              <Card style={{ marginTop: 12 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>Overall Quality Score: {quality.overall}</div>
                      <div>
                        <strong>Recommendation:</strong>{' '}
                        <Tag color={quality.recommendation === 'Auto-Approve' ? 'green' : (quality.recommendation === 'Manual Review' ? 'orange' : 'red')}>
                          {quality.recommendation}
                        </Tag>
                      </div>
                    </div>
                    <div style={{ minWidth: 320 }}>
                      <Space>
                        <div style={{ textAlign: 'center' }}>
                          <div>Energy</div>
                          <Progress type="circle" percent={quality.breakdown.energy} width={64} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div>EAC</div>
                          <Progress type="circle" percent={quality.breakdown.eac} width={64} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div>Bounds</div>
                          <Progress type="circle" percent={quality.breakdown.cert} width={64} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div>Temporal</div>
                          <Progress type="circle" percent={quality.breakdown.temporal} width={64} />
                        </div>
                      </Space>
                    </div>
                  </Space>
                  {quality.criticalIssues.length > 0 && (
                    <Alert type="error" showIcon message="Critical issues detected" description={quality.criticalIssues.join('; ')} />
                  )}
                  {quality.recs && quality.recs.length > 0 && (
                    <div>
                      <strong>Recommendations:</strong>
                      <ul style={{ marginBottom: 0 }}>
                        {quality.recs.map((r, idx) => (
                          <li key={`rec-${idx}`}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Space>
              </Card>
            )}
            <Divider />
            <Card
              title="Quality Control — Energy Balance"
              size="small"
              extra={(
                <Space>
                  <span>Scenario:</span>
                  <select value={qualityScenario} onChange={(e) => setQualityScenario(e.target.value)}>
                    <option value="perfect_balance">Perfect</option>
                    <option value="minor_imbalance">Minor Imbalance</option>
                    <option value="significant_violation">Significant Violation</option>
                    <option value="under_reporting">Under Reporting</option>
                    <option value="over_reporting">Over Reporting</option>
                  </select>
                </Space>
              )}
              style={{ marginTop: 8 }}
            >
              {!energyBalance ? (
                <Alert type="info" message="Energy balance will appear once details are loaded." showIcon />
              ) : (
                <>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                      <div>
                        <div><strong>Total Meter Energy:</strong> {energyBalance.meterTotalMWh} MWh</div>
                        <div><strong>Total Certificate Energy:</strong> {energyBalance.certificateTotalMWh} MWh</div>
                        <div>
                          <strong>Difference:</strong> {energyBalance.totalDiffMWh} MWh{' '}
                          {energyBalance.status === 'exception' ? (
                            <Tag color="red">Significant</Tag>
                          ) : energyBalance.status === 'active' ? (
                            <Tag color="orange">Minor</Tag>
                          ) : (
                            <Tag color="green">Perfect</Tag>
                          )}
                        </div>
                      </div>
                      <div style={{ minWidth: 260 }}>
                        <Progress
                          percent={energyBalance.percentMatch}
                          status={energyBalance.status}
                          format={() => energyBalance.statusText}
                        />
                      </div>
                    </Space>

                    {energyBalance.status === 'exception' && (
                      <Alert
                        type="error"
                        showIcon
                        message="Energy conservation violation detected"
                        description="> 0.1 MWh difference between meter data and certificates. Review splitting/allocation logic."
                      />
                    )}

                    <Table
                      size="small"
                      pagination={false}
                      dataSource={energyBalance.perHour}
                      columns={[
                        { title: 'Hour', dataIndex: 'hour', key: 'hour' },
                        { title: 'Meter (MWh)', dataIndex: 'meter_mwh', key: 'meter' },
                        { title: 'Cert (MWh)', dataIndex: 'cert_mwh', key: 'cert' },
                        {
                          title: 'Δ (MWh)',
                          dataIndex: 'diff_mwh',
                          key: 'diff',
                          render: (v, rec) => (
                            <span>
                              {v} {rec.isViolation && <Tag color="red">> 0.1</Tag>}
                            </span>
                          ),
                        },
                      ]}
                      rowClassName={(rec) => (rec.isViolation ? 'table-row-violation' : '')}
                      style={{ marginTop: 8 }}
                    />
                  </Space>
                </>
              )}
            </Card>
            <Card
              title="Quality Control — Temporal Accuracy"
              size="small"
              extra={(
                <Space>
                  <span>Scenario:</span>
                  <select value={temporalScenario} onChange={(e) => setTemporalScenario(e.target.value)}>
                    <option value="complete">Complete</option>
                    <option value="with_gaps">Gaps</option>
                    <option value="with_overlaps">Overlaps</option>
                    <option value="carryover_mismatch">Carryover Mismatch</option>
                  </select>
                </Space>
              )}
              style={{ marginTop: 12 }}
            >
              {!temporalAccuracy ? (
                <Alert type="info" message="Temporal analysis will appear once details are loaded." showIcon />
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <div>
                      <div>
                        <strong>Coverage completeness:</strong> {temporalAccuracy.completenessPct}%
                      </div>
                      <div>
                        <strong>Gaps:</strong> {temporalAccuracy.gaps.length} {temporalAccuracy.gaps.length > 0 && <Tag color="orange">Check</Tag>}
                      </div>
                      <div>
                        <strong>Overlaps:</strong> {temporalAccuracy.overlaps.length} {temporalAccuracy.overlaps.length > 0 && <Tag color="orange">Check</Tag>}
                      </div>
                      <div>
                        <strong>Carryover issues:</strong> {temporalAccuracy.carryIssues.length} {temporalAccuracy.carryIssues.length > 0 && <Tag color="red">Mismatch</Tag>}
                      </div>
                    </div>
                    <div style={{ minWidth: 260 }}>
                      <Progress
                        percent={temporalAccuracy.completenessPct}
                        status={temporalAccuracy.hasIssues ? 'active' : 'success'}
                        format={() => `${temporalAccuracy.completenessPct}% covered`}
                      />
                    </div>
                  </Space>

                  {temporalAccuracy.hasIssues && (
                    <Alert
                      type="warning"
                      showIcon
                      message="Temporal coverage issues detected"
                      description="Resolve gaps/overlaps and ensure carryover between intervals is consistent."
                    />
                  )}

                  <Table
                    size="small"
                    pagination={false}
                    dataSource={temporalAccuracy.hours}
                    columns={[
                      { title: 'Hour', dataIndex: 'hour', key: 'hour' },
                      { title: 'Covered', dataIndex: 'covered', key: 'covered', render: (v) => v ? <Tag color="green">Yes</Tag> : <Tag color="red">No</Tag> },
                      { title: 'Overlaps', dataIndex: 'overlapCount', key: 'overlaps', render: (v) => (v > 1 ? <Tag color="orange">{v}</Tag> : v) },
                      { title: 'Carry-in (MWh)', dataIndex: 'carryoverIn', key: 'cin', render: (v) => v?.toFixed ? v.toFixed(3) : v },
                      { title: 'Carry-out (MWh)', dataIndex: 'carryoverOut', key: 'cout', render: (v) => v?.toFixed ? v.toFixed(3) : v },
                      {
                        title: 'Issues',
                        key: 'issues',
                        render: (_, r) => (
                          <Space>
                            {r.hasGap && <Tag color="red">Gap</Tag>}
                            {r.hasOverlap && <Tag color="orange">Overlap</Tag>}
                            {r.carryoverIssue && <Tag color="red">Carryover</Tag>}
                            {!r.hasGap && !r.hasOverlap && !r.carryoverIssue && <Tag color="green">OK</Tag>}
                          </Space>
                        )
                      }
                    ]}
                    style={{ marginTop: 8 }}
                  />
                </Space>
              )}
            </Card>
            <Card
              title="Quality Control — Certificate Energy Bounds"
              size="small"
              extra={(
                <Space>
                  <span>Scenario:</span>
                  <select value={certScenario} onChange={(e) => setCertScenario(e.target.value)}>
                    <option value="valid_all">All Valid</option>
                    <option value="over_one_mwh">> 1 MWh Cert</option>
                    <option value="zero_or_negative">Zero/Negative</option>
                    <option value="mixed_whole_partial">Mixed Whole/Partial</option>
                    <option value="skewed_distribution">Skewed Distribution</option>
                  </select>
                </Space>
              )}
              style={{ marginTop: 12 }}
            >
              {!certBounds ? (
                <Alert type="info" message="Certificate bounds will appear once details are loaded." showIcon />
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <div>
                      <div>
                        <strong>No > 1 MWh certificates:</strong>{' '}
                        {certBounds.numOver === 0 ? <Tag color="green">OK</Tag> : <Tag color="red">{certBounds.numOver} over</Tag>}
                      </div>
                      <div>
                        <strong>No zero/negative energy:</strong>{' '}
                        {certBounds.numNonPositive === 0 ? <Tag color="green">OK</Tag> : <Tag color="red">{certBounds.numNonPositive} invalid</Tag>}
                      </div>
                      <div>
                        <strong>Type classification:</strong> {certBounds.wholeCount} whole, {certBounds.partialCount} partial
                      </div>
                    </div>
                    <div>
                      <div><strong>Distribution:</strong> min {certBounds.minEnergy} MWh • max {certBounds.maxEnergy} MWh • avg {certBounds.avgEnergy} MWh</div>
                    </div>
                  </Space>

                  {(certBounds.numOver > 0 || certBounds.numNonPositive > 0) && (
                    <Alert
                      type="error"
                      showIcon
                      message="Certificate energy bound violations"
                      description="Ensure each certificate has 0 < energy ≤ 1 MWh. Review splitting to correct outliers."
                    />
                  )}

                  <Table
                    size="small"
                    pagination={false}
                    dataSource={certBounds.certs}
                    columns={[
                      { title: 'Certificate', dataIndex: 'certificate_id', key: 'cid' },
                      { title: 'Energy (MWh)', dataIndex: 'energy_mwh', key: 'energy' },
                      { title: 'Type', dataIndex: 'type', key: 'type', render: (v) => <Tag>{v}</Tag> },
                      {
                        title: 'Status',
                        key: 'status',
                        render: (_, rec) => (
                          <Space>
                            {rec.isOverLimit && <Tag color="red">> 1 MWh</Tag>}
                            {rec.isNonPositive && <Tag color="red">≤ 0</Tag>}
                            {!rec.isOverLimit && !rec.isNonPositive && <Tag color="green">OK</Tag>}
                          </Space>
                        ),
                      },
                    ]}
                    style={{ marginTop: 8 }}
                  />
                </Space>
              )}
            </Card>
            <Card
              title="Quality Control — EAC Metadata Consistency"
              size="small"
              extra={(
                <Space>
                  <span>Scenario:</span>
                  <select value={eacScenario} onChange={(e) => setEacScenario(e.target.value)}>
                    <option value="all_valid">All Valid</option>
                    <option value="invalid_ids">Invalid IDs</option>
                    <option value="over_limit">Over 1 MWh</option>
                    <option value="non_sequential">Non-Sequential</option>
                    <option value="mixed_formats">Mixed Formats</option>
                  </select>
                </Space>
              )}
              style={{ marginTop: 12 }}
            >
              {!eacValidation ? (
                <Alert type="info" message="EAC checks will appear once details are loaded." showIcon />
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <div>
                      <div>
                        <strong>Valid IDs:</strong> {eacValidation.eacs.length - eacValidation.numInvalidIds} / {eacValidation.eacs.length}{' '}
                        {eacValidation.numInvalidIds > 0 && <Tag color="red">{eacValidation.numInvalidIds} invalid</Tag>}
                      </div>
                      <div>
                        <strong>≤ 1 MWh:</strong> {eacValidation.eacs.length - eacValidation.numOverLimit} / {eacValidation.eacs.length}{' '}
                        {eacValidation.numOverLimit > 0 && <Tag color="red">{eacValidation.numOverLimit} over</Tag>}
                      </div>
                      <div>
                        <strong>Sequential Numbering (structured):</strong>{' '}
                        {eacValidation.isSequential ? <Tag color="green">OK</Tag> : <Tag color="orange">Gap detected</Tag>}
                      </div>
                    </div>
                    <div style={{ minWidth: 260 }}>
                      <Progress
                        percent={Math.min(100, eacValidation.utilization)}
                        status={eacValidation.hasViolations ? 'exception' : 'active'}
                        format={() => `Utilization ${eacValidation.utilization}%`}
                      />
                      <div style={{ textAlign: 'right', fontSize: 12 }}>
                        {eacValidation.totalEnergy} / {eacValidation.capacity.toFixed(0)} MWh
                      </div>
                    </div>
                  </Space>

                  {eacValidation.hasViolations && (
                    <Alert
                      type="warning"
                      showIcon
                      message="EAC constraint violations detected"
                      description="Fix invalid IDs, ensure ≤ 1 MWh per EAC, and restore sequential numbering for structured IDs."
                    />
                  )}

                  <Table
                    size="small"
                    pagination={false}
                    dataSource={eacValidation.eacs}
                    columns={[
                      { title: 'EAC ID', dataIndex: 'id', key: 'id' },
                      { title: 'Format', dataIndex: 'idFormat', key: 'format', render: (v) => <Tag>{v}</Tag> },
                      { title: 'Energy (MWh)', dataIndex: 'energy_mwh', key: 'energy' },
                      {
                        title: 'Status',
                        key: 'status',
                        render: (_, rec) => (
                          <Space>
                            {!rec.isValidId && <Tag color="red">Invalid ID</Tag>}
                            {rec.exceedsLimit && <Tag color="red">> 1 MWh</Tag>}
                            {rec.isValidId && !rec.exceedsLimit && <Tag color="green">OK</Tag>}
                          </Space>
                        )
                      },
                    ]}
                    style={{ marginTop: 8 }}
                  />
                </Space>
              )}
            </Card>
            <Space direction="vertical" style={{ marginTop: 12, width: '100%' }}>
              <Input placeholder="MFA token (optional)" value={mfaToken} onChange={(e) => setMfaToken(e.target.value)} />
              <Input placeholder="Comments" value={comments} onChange={(e) => setComments(e.target.value)} />
              <Space>
                <Button type="primary" onClick={approve} loading={loading}>Approve</Button>
                <Button onClick={() => setDetailVisible(false)}>Close</Button>
              </Space>
            </Space>
          </>
        )}
      </Modal>

      <Modal
        title="Select Device to Upload Meter Data"
        open={uploadSelectVisible}
        onCancel={() => setUploadSelectVisible(false)}
        onOk={startUploadForSelected}
        okText="Continue"
      >
        <Form form={selectForm} layout="vertical" requiredMark={false}>
          <Form.Item
            label="Device"
            name="device_id"
            rules={[{ required: true, message: 'Please select a device' }]}
          >
            <Select
              showSearch
              placeholder="Select device"
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={devices.map((d) => ({
                value: d.id,
                label: `${d.device_name}${d.account_name ? ' — ' + d.account_name : ''}`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <DeviceUploadDialog ref={deviceUploadDialogRef} />
    </Card>
  );
};

export default MeasurementManagement;

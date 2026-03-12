import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Tag, Typography, Space, Alert, Progress } from 'antd';
import Plot from 'react-plotly.js';
import { getMeasurementDetailsAPI } from '../../api/measurementAPI';
import { logger } from '../../utils';

const { Text } = Typography;

/**
 * MeasurementReportDetailsPanel
 * Renders energy analysis and certificate analysis for a measurement report.
 * Intended to be embedded inside a Modal by the caller.
 */
const MeasurementReportDetailsPanel = ({ deviceId, measurementId }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!deviceId || !measurementId) return;
    const load = async () => {
      try {
        setLoading(true);
        const resp = await getMeasurementDetailsAPI(deviceId, measurementId);
        setDetails(resp);
      } catch (err) {
        logger.error('MeasurementReportDetailsPanel: failed to load details', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [deviceId, measurementId]);

  const getStatusColor = (status) => {
    const s = String(status ?? '').toLowerCase();
    if (s === 'approved') return 'green';
    if (s === 'pending') return 'gold';
    if (s === 'rejected') return 'red';
    return 'blue';
  };

  const selectedMeasurement = details || {};

  if (!deviceId || !measurementId) {
    return <Text type="secondary">Missing device or measurement identifier.</Text>;
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {/* Energy Analysis */}
      <Card size="small" title="⚡ Energy Analysis">
        {details && (
          <Row gutter={16}>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', color: '#4c6ef5' }}>Σ</div>
                <div style={{ fontWeight: 500 }}>Interval Energy (Wh)</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{(details.interval_usage_wh || 0).toLocaleString()}</div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', color: '#4c6ef5' }}>Σ</div>
                <div style={{ fontWeight: 500 }}>Interval Energy (MWh)</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{((details.interval_usage_wh || 0) / 1_000_000).toFixed(6)}</div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', color: '#096dd9' }}>⏱</div>
                <div style={{ fontWeight: 500 }}>Start Time</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{details.interval_start_datetime}</div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', color: '#096dd9' }}>⏱</div>
                <div style={{ fontWeight: 500 }}>End Time</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{details.interval_end_datetime}</div>
              </div>
            </Col>
          </Row>
        )}

        {/* Non-accumulated energy over time */}
        {details && Array.isArray(details.timeseries) && details.timeseries.length > 0 && (() => {
          try {
            const xs = details.timeseries.map(p => p.timestamp).filter(Boolean);
            const ys = details.timeseries.map(p => Number(p.energy_wh || 0));
            return (
              <div style={{ marginTop: 16 }}>
                <Plot
                  data={[{
                    type: 'scatter',
                    mode: 'lines+markers',
                    x: xs,
                    y: ys,
                    line: { color: '#4c6ef5' },
                    marker: { size: 4 },
                    hovertemplate: '%{x|%Y-%m-%d %H:%M}<br>Energy: %{y:,} Wh<extra></extra>'
                  }]}
                  layout={{
                    margin: { l: 70, r: 20, t: 20, b: 60 },
                    xaxis: { title: 'Time', type: 'date', tickformat: '%H:%M\n%m/%d', automargin: true },
                    yaxis: { title: 'Energy (Wh)', rangemode: 'tozero', automargin: true },
                    hovermode: 'x',
                    showlegend: false,
                    plot_bgcolor: '#fafafa',
                    paper_bgcolor: 'white'
                  }}
                  config={{ responsive: true, displaylogo: false }}
                  style={{ width: '100%', height: '280px' }}
                />
              </div>
            );
          } catch (e) {
            logger.error('MeasurementReportDetailsPanel: failed to render energy chart', e);
            return null;
          }
        })()}
      </Card>

      {/* Certificate Analysis */}
      <Card size="small" title="🏆 Certificate Analysis">
        <Alert
          type="success"
          message="Energy Certificate Generation Ready"
          description={
            selectedMeasurement.status === 'approved'
              ? `This measurement can generate ${(selectedMeasurement.interval_usage_wh || 0) >= 1_000_000 ? Math.floor((selectedMeasurement.interval_usage_wh || 0) / 1_000_000) : 0} certificate bundles of 1 MWh each.`
              : `Upon approval, this measurement will generate ${(selectedMeasurement.interval_usage_wh || 0) >= 1_000_000 ? Math.floor((selectedMeasurement.interval_usage_wh || 0) / 1_000_000) : 0} certificate bundles.`
          }
          showIcon
        />
        <div style={{ marginTop: 12 }}>
          <Progress
            percent={selectedMeasurement.status === 'approved' ? 100 : selectedMeasurement.status === 'pending' ? 70 : 30}
            status={selectedMeasurement.status === 'approved' ? 'success' : selectedMeasurement.status === 'rejected' ? 'exception' : 'active'}
            format={() =>
              selectedMeasurement.status === 'approved' ? 'Ready for certificate issuance' :
              selectedMeasurement.status === 'pending' ? 'Pending approval' :
              selectedMeasurement.status === 'rejected' ? 'Rejected - requires revision' :
              'Submitted for review'
            }
          />
        </div>

        {/* Bundle-stacked bar chart by hour sorted by EAC ID */}
        {details && Array.isArray(details.certificates) && details.certificates.length > 0 && (() => {
          try {
            const certs = details.certificates || [];
            const byHour = new Map();
            certs.forEach(c => {
              const t = c.production_starting_interval || c.production_Starting_interval || c.start_time || '';
              if (!t) return;
              if (!byHour.has(t)) byHour.set(t, []);
              byHour.get(t).push({
                certificate_bundle_id: String(c.certificate_bundle_id || ''),
                eac_id: c.eac_id ? String(c.eac_id) : '',
                bundle_quantity: Number(c.bundle_quantity || 0)
              });
            });
            const times = Array.from(byHour.keys()).sort();
            times.forEach(t => {
              byHour.get(t).sort((a, b) => a.eac_id.localeCompare(b.eac_id) || a.certificate_bundle_id.localeCompare(b.certificate_bundle_id));
            });
            const maxStack = times.reduce((m, t) => Math.max(m, byHour.get(t).length), 0);
            const palette = ['#4c6ef5','#228be6','#15aabf','#12b886','#40c057','#82c91e','#fab005','#fd7e14','#e64980','#be4bdb'];
            const traces = [];
            for (let i = 0; i < maxStack; i += 1) {
              traces.push({
                type: 'bar',
                x: times,
                y: times.map(t => Number((byHour.get(t)[i]?.bundle_quantity) || 0)),
                customdata: times.map(t => {
                  const b = byHour.get(t)[i];
                  return b ? [b.certificate_bundle_id, b.eac_id || '', Number(b.bundle_quantity || 0)] : [null, null, 0];
                }),
                hovertemplate: '%{x|%Y-%m-%d %H:%M}<br>Bundle: %{customdata[0]}<br>EAC: %{customdata[1]}<br>Energy: %{customdata[2]:,} Wh<extra></extra>',
                marker: { color: palette[i % palette.length] },
                showlegend: false,
              });
            }
            return (
              <div style={{ marginTop: 16 }}>
                <Plot
                  data={traces}
                  layout={{
                    barmode: 'stack',
                    margin: { l: 70, r: 20, t: 20, b: 60 },
                    xaxis: { title: 'Time', type: 'date', tickformat: '%H:%M\n%m/%d', automargin: true },
                    yaxis: { title: 'Energy (Wh)', rangemode: 'tozero', automargin: true },
                    hovermode: 'x unified',
                    showlegend: false,
                    plot_bgcolor: '#fafafa',
                    paper_bgcolor: 'white'
                  }}
                  config={{ responsive: true, displaylogo: false }}
                  style={{ width: '100%', height: '320px' }}
                />
              </div>
            );
          } catch (e) {
            logger.error('MeasurementReportDetailsPanel: failed to render certificate chart', e);
            return (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Unable to render certificate chart.</Text>
              </div>
            );
          }
        })()}
      </Card>

      {/* Technical Details */}
      {details && (
        <Card size="small" title="🔧 Technical Details">
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}>
                <strong>Energy (Wh):</strong> {details.interval_usage_wh?.toLocaleString() || 'N/A'}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Energy (MWh):</strong> {((details.interval_usage_wh || 0) / 1_000_000).toFixed(6)}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Gross/Net Indicator:</strong> {(details.gross_net_indicator || 'net').toUpperCase()}
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}>
                <strong>Start:</strong> {details.interval_start_datetime}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>End:</strong> {details.interval_end_datetime}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Status:</strong>
                <Tag color={getStatusColor(details.status)} style={{ marginLeft: 8 }}>
                  {String(details.status || '').toUpperCase()}
                </Tag>
              </div>
            </Col>
          </Row>

          {/* Submission Inputs / Processing Metadata */}
          {details.metadata && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Submission Inputs</div>
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 6 }}>
                    <strong>csv_in_local_time:</strong> {String(details.metadata.csv_in_local_time ?? 'N/A')}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>csv_timezone_requested:</strong> {details.metadata.csv_timezone_requested || 'N/A'}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>csv_timezone_resolved:</strong> {details.metadata.csv_timezone_resolved || 'N/A'}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>file_name:</strong> {details.metadata.file_name || 'N/A'}
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 6 }}>
                    <strong>total_hours:</strong> {details.metadata.total_hours ?? 'N/A'}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>processing_version:</strong> {details.metadata.processing_version || 'N/A'}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>workflow_type:</strong> {details.metadata.workflow_type || 'N/A'}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>qc_score:</strong> {details.metadata.qc_score ?? 'N/A'}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>qc_timestamp:</strong> {details.metadata.qc_timestamp || 'N/A'}
                  </div>
                </Col>
              </Row>
            </div>
          )}
        </Card>
      )}

      {/* Source Files */}
      {details && (
        <Card size="small" title="📎 Source Files">
          {(() => {
            const files = details.files || [];
            const list = Array.isArray(files) ? files : (files ? [files] : []);
            if (!list.length) {
              return <Text type="secondary">No files recorded for this submission</Text>;
            }
            return (
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {list.map((f, idx) => {
                  const url = f.presigned_url;
                  const label = f.original_filename || f.filename || `File ${idx + 1}`;
                  const fileTypeLabel = f.file_type === 'meter_readings' ? '📊 Meter Data' : 
                                       f.file_type === 'rec_verification' ? '✅ REC Verification' : 
                                       f.file_type;
                  return (
                    <li key={f.id || idx} style={{ marginBottom: 8 }}>
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer">{label}</a>
                      ) : (
                        <span>{label}</span>
                      )}
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        ({fileTypeLabel})
                      </Text>
                      {f.file_size ? (
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          ({(Number(f.file_size) / 1024).toFixed(1)} KB)
                        </Text>
                      ) : null}
                      {f.upload_status && (
                        <Tag 
                          color={f.upload_status === 'processed' ? 'green' : f.upload_status === 'processing' ? 'blue' : 'default'} 
                          style={{ marginLeft: 8 }}
                        >
                          {f.upload_status}
                        </Tag>
                      )}
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </Card>
      )}
    </Space>
  );
};

export default MeasurementReportDetailsPanel;



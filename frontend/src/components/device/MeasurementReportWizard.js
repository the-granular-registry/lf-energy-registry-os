import React, { useState, forwardRef, useImperativeHandle, useEffect, useRef } from "react";
import { Modal, Button, Space, Typography, Upload, message, Form, Select, InputNumber, Input, Alert, Progress, Steps, Switch, Card, Row, Col, Statistic } from "antd";
import { UploadOutlined, LoadingOutlined, FileTextOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { uploadMeterReadings, uploadRECVerification as uploadEACVerification, addActiveUpload, clearMeterReadingsUpload, clearRECVerificationUpload, aiReprocessMeterCSV } from "../../store/fileUpload/fileUploadSlice";

const { Text } = Typography;
const { Option } = Select;

const MeasurementReportWizard = forwardRef(({ onSuccess }, ref) => {
  const dispatch = useDispatch();
  const [visible, setVisible] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const deviceInfoRef = useRef(null); // ← FIX: Store device info in ref to avoid async state bugs
  const [csvFileList, setCsvFileList] = useState([]);
  const [recFileList, setRecFileList] = useState([]);
  const [asyncProcessing, setAsyncProcessing] = useState(true);
  const [step, setStep] = useState(0);
  const [timestampTimezone, setTimestampTimezone] = useState('local'); // 'local' | 'utc' | IANA tz string
  const [energyUnit, setEnergyUnit] = useState('Wh'); // 'Wh' | 'kWh' | 'MWh'
  const [form] = Form.useForm();
  const [msgApi, contextHolder] = message.useMessage();
  const [meterSummary, setMeterSummary] = useState(null);
  const [measurementReportSession, setMeasurementReportSession] = useState(null); // Track the session
  const [accountOptions, setAccountOptions] = useState([]);
  const [deviceOptions, setDeviceOptions] = useState([]);
  const allDevicesRef = useRef([]); // ← FIX: Store full device list to prevent filtering already-filtered list

  const { meterReadingsUpload, recVerificationUpload, aiReprocess } = useSelector((state) => state.fileUpload);

  // AI choice and re-upload state
  const [useCorrected, setUseCorrected] = useState(true);
  const [reuploadLoading, setReuploadLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    openDialog: (info) => {
      console.log('🔍 [Wizard] Opening dialog for device:', info?.deviceName, 'ID:', info?.deviceID);
      console.log('🔍 [Wizard] Previous device was:', deviceInfoRef.current?.deviceName, 'ID:', deviceInfoRef.current?.deviceID);
      
      // Store in both state and ref - ref is immediate, state is async
      deviceInfoRef.current = info;
      setDeviceInfo(info);
      setVisible(true);
      setStep(0); // Reset to first step
      setCsvFileList([]);
      setRecFileList([]);
      setMeterSummary(null);
      setMeasurementReportSession(null); // Clear session
      form.resetFields();
      dispatch(clearMeterReadingsUpload());
      dispatch(clearRECVerificationUpload());

      // Load selection options from globally cached devices (populated by page)
      try {
        const allDevices = window.__allAccessibleDevices || [];
        const accountsMap = new Map();
        const devicesOpts = allDevices
          .filter(d => !d.is_deleted)
          .map(d => ({ value: d.id, label: `${d.device_name} (${d.local_device_identifier})`, account_id: d.account_id }));
        
        // FIX: Store full device list in ref so we can always filter from complete list
        allDevicesRef.current = devicesOpts;
        
        allDevices.forEach(d => {
          if (d.account_id) accountsMap.set(d.account_id, d.account_name || `Account #${d.account_id}`);
        });
        const accountsOpts = Array.from(accountsMap.entries()).map(([id, name]) => ({ value: id, label: `${name} (#${id})` }));
        setAccountOptions(accountsOpts);
        setDeviceOptions(devicesOpts);

        // Preselect if device passed in
        if (info?.deviceID) {
          const dev = allDevices.find(d => d.id === info.deviceID);
          if (dev) {
            console.log('🔍 [Wizard] Preselecting device:', dev.device_name, 'Account:', dev.account_id);
            form.setFieldsValue({ targetAccountId: dev.account_id, targetDeviceId: dev.id });
            // filter device options by account
            setDeviceOptions(devicesOpts.filter(x => x.account_id === dev.account_id));
          }
        }
      } catch (e) {
        console.error('❌ [Wizard] Error loading device options:', e);
        // ignore errors populating options
      }
    },
    closeDialog: () => setVisible(false),
  }));

  const handleCancel = () => {
    console.log('🚪 [Wizard] Closing dialog');
    deviceInfoRef.current = null; // Clear ref when closing
    setDeviceInfo(null);
    setStep(0); // Reset to first step
    setCsvFileList([]);
    setRecFileList([]);
    setMeterSummary(null);
    setMeasurementReportSession(null); // Clear session
    setVisible(false);
    form.resetFields();
    dispatch(clearMeterReadingsUpload());
    dispatch(clearRECVerificationUpload());
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const csvUploadProps = {
    beforeUpload: (file) => {
      const isCsv = file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv");
      if (!isCsv) {
        msgApi.error("Meter data must be a CSV file");
        return false;
      }
      const isLt100M = file.size / 1024 / 1024 < 100;
      if (!isLt100M) {
        msgApi.error("CSV must be < 100MB");
        return false;
      }
      setCsvFileList([file]);
      setMeterSummary(null);
      return false;
    },
    fileList: csvFileList,
    onRemove: () => setCsvFileList([]),
  };

  const recUploadProps = {
    beforeUpload: (file) => {
      const accepted = ["application/pdf", "text/plain", "image/jpeg", "image/png"]; 
      const ok = accepted.includes(file.type) || [".pdf", ".txt", ".jpg", ".jpeg", ".png"].some((ext) => file.name.toLowerCase().endsWith(ext));
      if (!ok) {
        msgApi.error("REC verification must be PDF/TXT/JPEG/PNG");
        return false;
      }
      const isLt100M = file.size / 1024 / 1024 < 100;
      if (!isLt100M) {
        msgApi.error("REC file must be < 100MB");
        return false;
      }
      setRecFileList([file]);
      return false;
    },
    fileList: recFileList,
    onRemove: () => setRecFileList([]),
  };

  const handleSubmit = async () => {
    // FIX: Use ref instead of state to get current device (avoids async state update bugs)
    const currentDevice = deviceInfoRef.current;
    const valuesSnapshot = form.getFieldsValue();
    const selectedDeviceId = valuesSnapshot?.targetDeviceId || currentDevice?.deviceID;
    if (!selectedDeviceId) { msgApi.error("Please select account and device"); return; }
    
    console.log('📤 [Wizard] Submitting measurement report for device ID:', selectedDeviceId);
    
    if (step === 0 && !csvFileList.length) { msgApi.warning("Please select Meter CSV"); return; }
    if (step === 2 && !recFileList.length) { msgApi.warning("Please select REC verification file"); return; }
    try {
      const values = await form.validateFields();
      if (step === 0) {
        // Generate a unique session ID for this measurement report
        const sessionId = `mr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setMeasurementReportSession(sessionId);
        
        console.log('📤 [Wizard] Uploading meter readings - Device ID:', selectedDeviceId);
        
        const meterResult = await dispatch(uploadMeterReadings({ 
          file: csvFileList[0], 
          deviceId: selectedDeviceId,
          asyncProcessing,
          measurementReportSession: sessionId, // Pass the session ID
          timestampTimezone,
          energyUnit,
        })).unwrap();
        
        console.log('✅ [Wizard] Meter readings uploaded successfully');
        dispatch(addActiveUpload({ fileUploadId: meterResult.file_upload_id, fileName: csvFileList[0].name, uploadType: "meter_readings" }));
        setStep(1);
        return;
      }
      if (step === 2) {
        const recPayload = {
          file: recFileList[0],
          deviceId: selectedDeviceId,
          verificationType: values.verificationType,
          recQuantity: values.recQuantity,
          num_eacs: values.numEACs,
          measurementReportSession: measurementReportSession // Use the same session ID
          // eac_device_id and eac_meter_id automatically pulled from device metadata by backend
        };
        const recResult = await dispatch(uploadEACVerification(recPayload)).unwrap();
        dispatch(addActiveUpload({ fileUploadId: recResult.file_upload_id, fileName: recFileList[0].name, uploadType: "rec_verification" }));
        msgApi.success("Measurement report created: uploads queued for processing");
        setTimeout(() => {
          handleCancel();
          // Call onSuccess callback to refresh the parent page
          if (onSuccess) {
            onSuccess();
          }
        }, 800);
        return;
      }
    } catch (err) {
      // Handle form validation errors properly
      if (err && typeof err === 'object' && err.errorFields) {
        // This is a form validation error from validateFields()
        const errorMessages = err.errorFields.map(field => 
          `${field.name.join('.')}: ${field.errors.join(', ')}`
        ).join('; ');
        msgApi.error(`Form validation failed: ${errorMessages}`);
      } else if (step === 0 && csvFileList?.[0] && selectedDeviceId) {
        // CSV upload failed - trigger AI reprocessing without showing error first
        console.log('🔄 [Wizard] CSV format issue detected, starting AI reprocessing...');
        setStep(1); // Move to Verify step to show processing state
        try {
          await dispatch(aiReprocessMeterCSV({ deviceId: selectedDeviceId, file: csvFileList[0] })).unwrap();
          // Prefer corrected by default
          setUseCorrected(true);
          msgApi.success("CSV reformatted successfully! Please review and resubmit.");
        } catch (e) {
          console.error('AI reprocess error', e);
          msgApi.error(`AI reformatting failed: ${e?.message || 'Unknown error'}`);
        }
      } else {
        // Handle other errors (API errors, etc.)
        const errorMessage = typeof err === 'string' ? err : 
                           err?.message || err?.error || 
                           "Failed to create measurement report";
        msgApi.error(errorMessage);
      }
    }
  };

  const reuploadWithSelected = async () => {
    // Re-submit meter data using selected (original or corrected) file
    const currentDevice = deviceInfoRef.current;
    const valuesSnapshot = form.getFieldsValue();
    const selectedDeviceId = valuesSnapshot?.targetDeviceId || currentDevice?.deviceID;
    if (!selectedDeviceId) { msgApi.error("Please select account and device"); return; }
    if (!aiReprocess?.result) { msgApi.warning("No AI reprocess result available"); return; }

    const targetUrl = useCorrected ? aiReprocess.result.corrected_url : aiReprocess.result.original_url;
    const targetName = useCorrected ? `corrected-${aiReprocess.result?.original_s3_key?.split('/').pop() || 'meter.csv'}` : (csvFileList?.[0]?.name || 'meter.csv');
    if (!targetUrl) { msgApi.error("Missing download URL"); return; }

    try {
      setReuploadLoading(true);
      const resp = await fetch(targetUrl);
      if (!resp.ok) throw new Error("Failed to download selected CSV");
      const blob = await resp.blob();
      const file = new File([blob], targetName, { type: 'text/csv' });
      setCsvFileList([file]);

      const sessionId = measurementReportSession || `mr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (!measurementReportSession) setMeasurementReportSession(sessionId);

      const result = await dispatch(uploadMeterReadings({
        file,
        deviceId: selectedDeviceId,
        asyncProcessing,
        measurementReportSession: sessionId,
        timestampTimezone,
        energyUnit,
      })).unwrap();

      dispatch(addActiveUpload({ fileUploadId: result.file_upload_id, fileName: file.name, uploadType: "meter_readings" }));
      msgApi.success("Re-submitted meter data using selected CSV");
    } catch (e) {
      msgApi.error(typeof e === 'string' ? e : (e?.message || 'Re-submit failed'));
    } finally {
      setReuploadLoading(false);
    }
  };

  // Parse CSV in step 1 to show total energy and reporting period
  useEffect(() => {
    const file = csvFileList && csvFileList[0];
    if (step !== 1 || !file || meterSummary) return;
    (async () => {
      try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setMeterSummary({ error: "CSV has no data rows" });
          return;
        }
        const headersRaw = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const mapName = (name) => {
          const n = name.toLowerCase().trim();
          if (["interval start", "interval_start", "start_datetime", "start"].includes(n)) return "interval_start_datetime";
          if (["interval end", "interval_end", "end_datetime", "end"].includes(n)) return "interval_end_datetime";
          if (["usage", "energy", "interval_usage"].includes(n)) return "interval_usage";
          if (["gross_net", "gross/net", "grossnet", "gross_net_indicator"].includes(n)) return "gross_net_indicator";
          return name;
        };
        const headers = headersRaw.map(mapName);
        const idxStart = headers.indexOf("interval_start_datetime");
        const idxEnd = headers.indexOf("interval_end_datetime");
        const idxUsage = headers.indexOf("interval_usage");
        if (idxStart === -1 || idxEnd === -1 || idxUsage === -1) {
          setMeterSummary({ error: "CSV is missing required columns (start, end, usage)" });
          return;
        }
        
        // Convert to Wh based on selected unit
        const unitMultiplier = energyUnit === 'kWh' ? 1000 : energyUnit === 'MWh' ? 1000000 : 1;
        
        let minStart = null;
        let maxEnd = null;
        let totalWh = 0;
        let rows = 0;
        for (let i = 1; i < lines.length; i += 1) {
          const cols = lines[i].split(",");
          if (cols.length < Math.max(idxStart, idxEnd, idxUsage) + 1) continue;
          const s = cols[idxStart].trim();
          const e = cols[idxEnd].trim();
          const uRaw = cols[idxUsage].trim().replace(/,/g, "");
          const u = parseFloat(uRaw);
          if (!s || !e || Number.isNaN(u)) continue;
          const sd = new Date(s);
          const ed = new Date(e);
          if (!minStart || sd < minStart) minStart = sd;
          if (!maxEnd || ed > maxEnd) maxEnd = ed;
          totalWh += Math.round(u * unitMultiplier);
          rows += 1;
        }
        setMeterSummary({ totalWh, start: minStart?.toISOString() || null, end: maxEnd?.toISOString() || null, rows });
      } catch (e) {
        setMeterSummary({ error: "Failed to parse CSV" });
      }
    })();
  }, [step, csvFileList, meterSummary, energyUnit]);

  return (
    <>
      {contextHolder}
      <Modal
        title={<div><FileTextOutlined style={{ color: "#1890ff", marginRight: 8 }} />Create Measurement Report</div>}
        open={visible}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>Cancel</Button>,
          step > 0 && step <= 2 && <Button key="back" onClick={handleBack}>Back</Button>,
          step === 0 && <Button key="next1" type="primary" onClick={handleSubmit} loading={meterReadingsUpload.loading}>Next</Button>,
          step === 1 && <Button key="next2" type="primary" onClick={() => setStep(2)}>Next</Button>,
          step === 2 && <Button key="submit" type="primary" onClick={handleSubmit} loading={recVerificationUpload.loading}>Create Measurement Report</Button>,
        ].filter(Boolean)}
        width={720}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          {/* Target Selection */}
          <Card size="small" title="Target Account & Device">
            <Form form={form} layout="vertical" requiredMark={false}>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="Account" name="targetAccountId" rules={[{ required: true, message: 'Select account' }]}>
                    <Select
                      placeholder="Select account"
                      options={accountOptions}
                      onChange={(accId) => {
                        console.log('🔄 [Wizard] Account changed to:', accId);
                        // FIX: Always filter from the full device list stored in ref, not from already-filtered deviceOptions
                        const fullDeviceList = allDevicesRef.current;
                        const filtered = fullDeviceList.filter(d => d.account_id === accId);
                        console.log('🔄 [Wizard] Filtered to', filtered.length, 'devices for account', accId);
                        setDeviceOptions(filtered);
                        form.setFieldsValue({ targetDeviceId: undefined });
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Device" name="targetDeviceId" rules={[{ required: true, message: 'Select device' }]}>
                    <Select 
                      placeholder="Select device" 
                      options={deviceOptions} 
                      showSearch 
                      optionFilterProp="label"
                      onChange={(deviceId) => {
                        const device = allDevicesRef.current.find(d => d.value === deviceId);
                        console.log('🔄 [Wizard] Device selected:', device?.label, 'ID:', deviceId);
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          <Steps
            current={step}
            items={[
              { title: 'Upload Meter Data' },
              { title: 'Verify Meter Data' },
              { title: 'EAC Verification' },
              { title: 'Process & Assign IDs' },
              { title: 'Quality Control' },
            ]}
          />

          {/* Meter Data CSV */}
          {step === 0 && (
          <div>
            <Text strong>Meter Data (CSV)</Text>
            <Upload.Dragger {...csvUploadProps}>
              <p className="ant-upload-drag-icon">{meterReadingsUpload.loading ? <LoadingOutlined /> : <UploadOutlined />}</p>
              <p className="ant-upload-text">Click or drag CSV file here</p>
            </Upload.Dragger>
            <div style={{ marginTop: 12 }}>
              <Form layout="vertical">
                <Form.Item label="Timestamp in CSV">
                  <Select
                    value={timestampTimezone}
                    onChange={setTimestampTimezone}
                    placeholder="Select timestamp interpretation"
                  >
                    <Option value="local">Local time (default)</Option>
                    <Option value="utc">UTC</Option>
                    <Option value="America/Los_Angeles">America/Los_Angeles</Option>
                    <Option value="America/New_York">America/New_York</Option>
                    <Option value="Europe/London">Europe/London</Option>
                    <Option value="Europe/Berlin">Europe/Berlin</Option>
                    <Option value="Asia/Singapore">Asia/Singapore</Option>
                    <Option value="Asia/Tokyo">Asia/Tokyo</Option>
                  </Select>
                  <Text type="secondary">Choose how to interpret timestamps in your CSV.</Text>
                </Form.Item>
                <Form.Item label="Energy Units">
                  <Select value={energyUnit} onChange={(value) => { setEnergyUnit(value); setMeterSummary(null); }}>
                    <Option value="Wh">Watt-hours (Wh)</Option>
                    <Option value="kWh">Kilowatt-hours (kWh)</Option>
                    <Option value="MWh">Megawatt-hours (MWh)</Option>
                  </Select>
                  <Text type="secondary">Select the unit used for energy generation values.</Text>
                </Form.Item>
              </Form>
            </div>
            {meterReadingsUpload.loading && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">Uploading CSV…</Text>
                <Progress percent={undefined} status="active" />
              </div>
            )}
          </div>
          )}

          {step === 1 && (
          <div>
            {aiReprocess.loading && (
              <Alert 
                type="info" 
                showIcon 
                icon={<LoadingOutlined />}
                message="Processing CSV format correction..." 
                description="Please wait while we analyze and reformat your CSV file."
              />
            )}
            {aiReprocess.error && (
              <Alert type="warning" showIcon message={`CSV reformatting failed: ${aiReprocess.error}`} />
            )}
            {aiReprocess.result ? (
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Alert 
                  type="warning" 
                  showIcon 
                  message="Original CSV format issue detected" 
                  description="The original CSV was not in the correct format. We've automatically corrected it. Please review both versions and resubmit with your preferred file."
                />
                <Row gutter={12}>
                  <Col span={12}>
                    <Card size="small" title="Original CSV" extra={<a href={aiReprocess.result.original_url} target="_blank" rel="noreferrer">Download</a>}>
                      <Row gutter={8}>
                        <Col span={24}><Statistic title="Total Energy (MWh)" value={((aiReprocess.result.summary?.original?.totalWh || 0) / 1000000).toFixed(6)} /></Col>
                        <Col span={12}><Statistic title="Start" value={aiReprocess.result.summary?.original?.minDate || '-'} valueStyle={{ fontSize: 12 }} /></Col>
                        <Col span={12}><Statistic title="End" value={aiReprocess.result.summary?.original?.maxDate || '-'} valueStyle={{ fontSize: 12 }} /></Col>
                        <Col span={12}><Statistic title="Rows" value={aiReprocess.result.summary?.original?.rows || 0} /></Col>
                        <Col span={12}><Statistic title="Missing Hours" value={aiReprocess.result.summary?.original?.missingHours || 0} /></Col>
                      </Row>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" title="Corrected CSV" extra={<a href={aiReprocess.result.corrected_url} target="_blank" rel="noreferrer">Download</a>}>
                      <Row gutter={8}>
                        <Col span={24}><Statistic title="Total Energy (MWh)" value={((aiReprocess.result.summary?.corrected?.totalWh || 0) / 1000000).toFixed(6)} /></Col>
                        <Col span={12}><Statistic title="Start" value={aiReprocess.result.summary?.corrected?.minDate || '-'} valueStyle={{ fontSize: 12 }} /></Col>
                        <Col span={12}><Statistic title="End" value={aiReprocess.result.summary?.corrected?.maxDate || '-'} valueStyle={{ fontSize: 12 }} /></Col>
                        <Col span={12}><Statistic title="Rows" value={aiReprocess.result.summary?.corrected?.rows || 0} /></Col>
                        <Col span={12}><Statistic title="Missing Hours" value={aiReprocess.result.summary?.corrected?.missingHours || 0} /></Col>
                      </Row>
                    </Card>
                  </Col>
                </Row>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Switch checked={useCorrected} onChange={setUseCorrected} />
                  <Text>Use corrected CSV</Text>
                  <Button type="primary" loading={reuploadLoading} onClick={reuploadWithSelected}>Re-submit with selected CSV</Button>
                </div>
              </Space>
            ) : (
              <>
                <Alert type="info" message="Meter data upload queued. Processing and basic validation will run automatically." showIcon />
                <div style={{ marginTop: 12 }}>
                  <Card size="small" title="Meter Data Summary">
                    {!meterSummary ? (
                      <Text type="secondary">Parsing CSV to compute summary…</Text>
                    ) : meterSummary.error ? (
                      <Alert type="warning" message={meterSummary.error} showIcon />
                    ) : (
                      <Row gutter={16}>
                        <Col span={8}><Statistic title="Total Energy (MWh)" value={((meterSummary.totalWh || 0) / 1000000).toFixed(6)} /></Col>
                        <Col span={8}><Statistic title="Period Start" value={meterSummary.start || '-'} valueStyle={{ fontSize: 12 }} /></Col>
                        <Col span={8}><Statistic title="Period End" value={meterSummary.end || '-'} valueStyle={{ fontSize: 12 }} /></Col>
                      </Row>
                    )}
                  </Card>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">Click Next to provide EAC verification details.</Text>
                </div>
              </>
            )}
          </div>
          )}

          {step === 2 && (
          <div>
            <Text strong>EAC Verification</Text>
            {deviceInfoRef.current && (deviceInfoRef.current.eac_registry_name || deviceInfoRef.current.eac_registry_device_id || deviceInfoRef.current.eac_registry_meter_id) && (
              <Alert
                message="EAC Registry Information from Device"
                description={
                  <div>
                    {deviceInfoRef.current.eac_registry_name && <div><strong>Registry:</strong> {deviceInfoRef.current.eac_registry_name}</div>}
                    {deviceInfoRef.current.eac_registry_device_id && <div><strong>Device ID:</strong> {deviceInfoRef.current.eac_registry_device_id}</div>}
                    {deviceInfoRef.current.eac_registry_meter_id && <div><strong>Meter ID:</strong> {deviceInfoRef.current.eac_registry_meter_id}</div>}
                  </div>
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            <Form form={form} layout="vertical" requiredMark={false}>
              <Form.Item label="Verification Type" name="verificationType" rules={[{ required: true, message: "Select verification type" }]}>
                <Select placeholder="Select verification type">
                  <Option value="ownership_proof">Ownership Proof</Option>
                  <Option value="registry_statement">Registry Statement</Option>
                  <Option value="certificate_scan">Certificate Scan</Option>
                  <Option value="trading_record">Trading Record</Option>
                </Select>
              </Form.Item>
              <Form.Item label="EAC Quantity (MWh)" name="recQuantity" rules={[{ required: true, message: "Enter EAC quantity" }]}>
                <InputNumber style={{ width: "100%" }} min={0.01} step={0.01} placeholder="e.g. 10.00" />
              </Form.Item>
              <Form.Item label="Number of EACs" name="numEACs" help="Total number of individual EAC certificates">
                <InputNumber style={{ width: "100%" }} min={1} step={1} placeholder="e.g. 12" />
              </Form.Item>
            </Form>
            <Upload.Dragger {...recUploadProps}>
              <p className="ant-upload-drag-icon">{recVerificationUpload.loading ? <LoadingOutlined /> : <SafetyCertificateOutlined />}</p>
              <p className="ant-upload-text">Click or drag REC verification document here (PDF/TXT/JPEG/PNG)</p>
            </Upload.Dragger>
            {recVerificationUpload.loading && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">Uploading REC verification…</Text>
                <Progress percent={undefined} status="active" />
              </div>
            )}
          </div>
          )}

          {step === 3 && (
          <div>
            <Alert type="info" showIcon message="Processing" description="Data will be processed server-side to allocate energy to certificates and assign GC and EAC IDs." />
            <Text type="secondary">Proceed to Quality Control to review metrics.</Text>
          </div>
          )}

          {step === 4 && (
          <div>
            <Alert type="success" showIcon message="Quality Control" description="Quality metrics will be available in the measurement reports table once processing completes. Use Details to view checks." />
          </div>
          )}
        </Space>
      </Modal>
    </>
  );
});

export default MeasurementReportWizard;



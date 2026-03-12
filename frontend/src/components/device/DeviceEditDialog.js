import React, { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { Modal, Input, Select, DatePicker, Checkbox, Form, message } from "antd";
import dayjs from "dayjs";

import { useDispatch, useSelector } from "react-redux";
import { useAccount } from "../../context/AccountContext.js";

import { updateDevice } from "../../store/device/deviceThunk";
import { getAccountDetails } from "../../store/account/accountThunk";

import { ENERGY_SOURCE, DEVICE_TECHNOLOGY_TYPE } from "../../enum";
import { logger } from "../../utils";

const { Option } = Select;

const DeviceEditDialog = forwardRef((props, ref) => {
  const dispatch = useDispatch();
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(false);

  const { currentAccount, saveAccountDetail } = useAccount();
  const { loading: deviceLoading } = useSelector((state) => state.devices);

  useImperativeHandle(ref, () => ({
    openDialog: (device) => {
      setSelectedDevice(device);
      setVisible(true);
      // Pre-populate form with device data
      if (device) {
        // Robustly parse lat/lon (accept "lat,lon" or "lat, lon")
        const loc = device.location || "";
        const locationParts = loc.includes(",") ? loc.split(",") : [];
        form.setFieldsValue({
          device_name: device.device_name,
          local_device_identifier: device.local_device_identifier,
          grid: device.grid,
          technology_type: device.technology_type || undefined,
          energy_source: device.energy_source || undefined,
          operational_date: device.operational_date ? dayjs(device.operational_date) : null,
          capacity: device.capacity,
          peak_demand: device.peak_demand,
          location: {
            latitude: (locationParts[0] || "").trim(),
            longitude: (locationParts[1] || "").trim(),
          },
          is_storage: device.is_storage,
          project_timezone: device.project_timezone || undefined,
          project_grid_zone: device.project_grid_zone || undefined,
        });
      }
    },
    closeDialog: () => setVisible(false),
  }));

  const handleCancel = () => {
    form.resetFields();
    setSelectedDevice(null);
    setVisible(false);
  };

  const handleOk = async () => {
    try {
      setLoading(true);
      logger.debug("Starting device update...");
      
      const values = await form.validateFields();
      logger.debug("Form validation passed");
      
      // Format location only if provided (normalize with comma+space)
      const hasLat = values.location && values.location.latitude !== undefined && values.location.latitude !== "";
      const hasLon = values.location && values.location.longitude !== undefined && values.location.longitude !== "";
      if (hasLat && hasLon) {
        values.location = `${String(values.location.latitude).trim()}, ${String(values.location.longitude).trim()}`;
      } else {
        delete values.location;
      }
      
      // Only send operational_date if provided
      if (!values.operational_date) {
        delete values.operational_date;
      } else if (values.operational_date?.toISOString) {
        values.operational_date = values.operational_date.toISOString();
      }
      
      logger.debug("Device update values prepared");
      
      const response = await dispatch(
        updateDevice({ 
          deviceId: selectedDevice.id, 
          deviceData: values 
        })
      ).unwrap();
      
      logger.debug("Update Device Response received");
      
      // Refresh account details to get updated device list
      logger.debug("Refreshing account details...");
      if (currentAccount?.detail?.id) {
        const account = await dispatch(
          getAccountDetails(currentAccount.detail.id)
        ).unwrap();
        saveAccountDetail(account);
      } else {
        window.dispatchEvent(new CustomEvent('devices:refresh'));
      }
      
      message.success("Device updated successfully");
      setVisible(false);
      setSelectedDevice(null);
    } catch (error) {
      logger.error("Update failed:", error);
      message.error("Failed to update device. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Edit Device"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Update Device"
      cancelText="Cancel"
      width={600}
      confirmLoading={loading || deviceLoading}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Device Name"
          name="device_name"
          rules={[{ required: true, message: "Please input device name" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Device ID"
          name="local_device_identifier"
          rules={[{ required: true, message: "Please input device ID" }]}
          help="A unique identifier for the device, ideally used by the grid operator to identify the device and link it to available data sources. This could be a meter number, a serial number, or other appropriate identifier"
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Grid"
          name="grid"
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Technology type"
          name="technology_type"
        >
          <Select placeholder="Select...">
            {Object.entries(DEVICE_TECHNOLOGY_TYPE).map(([key, value]) => (
              <Option key={key} value={key.toLocaleLowerCase()}>
                {value}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="Energy source"
          name="energy_source"
        >
          <Select placeholder="Select...">
            {Object.entries(ENERGY_SOURCE).map(([key, value]) => (
              <Option key={key} value={key.toLocaleLowerCase()}>
                {value}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="Operational date"
          name="operational_date"
        >
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label="Device Capacity"
          name="capacity"
        >
          <Input suffix="MW" placeholder="Ex: 80" />
        </Form.Item>

        <Form.Item
          label="Peak Demand"
          name="peak_demand"
        >
          <Input suffix="MW" placeholder="Ex: 80" />
        </Form.Item>

        <Form.Item label="Location"> 
          <Input.Group compact>
            <Form.Item
              name={["location", "latitude"]}
              noStyle
              
            >
              <Input style={{ width: "50%" }} placeholder="Latitude" />
            </Form.Item>
            <Form.Item
              name={["location", "longitude"]}
              noStyle
              
            >
              <Input style={{ width: "50%" }} placeholder="Longitude" />
            </Form.Item>
          </Input.Group>
        </Form.Item>

        <Form.Item label="Time zone" name="project_timezone" help="Derived automatically from location via WattTime/TimezoneFinder on save.">
          <Input placeholder="e.g., America/Los_Angeles" disabled />
        </Form.Item>

        <Form.Item label="Grid Zone" name="project_grid_zone" help="Derived automatically from location via WattTime on save.">
          <Input placeholder="e.g., CAISO_NORTH" disabled />
        </Form.Item>

        <Form.Item
          name="is_storage"
          valuePropName="checked"
        >
          <Checkbox>Is storage device?</Checkbox>
        </Form.Item>

        <h4 style={{ marginTop: 24, marginBottom: 16 }}>EAC Registry Integration (Optional)</h4>

        <Form.Item
          label="EAC Registry Name"
          name="eac_registry_name"
          help="e.g., PJM-GATS, M-RETS, WREGIS"
        >
          <Input placeholder="e.g., PJM-GATS" />
        </Form.Item>

        <Form.Item
          label="EAC Registry Device ID"
          name="eac_registry_device_id"
          help="Device identifier in the registry"
        >
          <Input placeholder="e.g., NON604366" />
        </Form.Item>

        <Form.Item
          label="EAC Registry Meter ID"
          name="eac_registry_meter_id"
          help="Meter identifier in the registry"
        >
          <Input placeholder="e.g., H475393" />
        </Form.Item>
      </Form>
    </Modal>
  );
});

export default DeviceEditDialog; 
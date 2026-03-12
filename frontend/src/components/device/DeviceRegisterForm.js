import React, { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { Modal, Input, Select, DatePicker, Checkbox, Form, Row, Col, message } from "antd";

import { useDispatch, useSelector } from "react-redux";
import { useAccount } from "../../context/AccountContext.js";
import { useUser } from "../../context/UserContext.js";

import { createDevice } from "../../store/device/deviceThunk";
import { getAccountDetails } from "../../store/account/accountThunk";
import { getAllAccountsAPI } from "../../api/superAdminAPI";
import { getCurrentUserAccountsAPI } from "../../api/userAPI";

import { ENERGY_SOURCE, DEVICE_TECHNOLOGY_TYPE } from "../../enum";
import { logger } from "../../utils";

const { Option } = Select;

const DeviceRegisterDialog = forwardRef((props, ref) => {
  const dispatch = useDispatch();
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const { currentAccount, saveAccountDetail } = useAccount();
  const { userData } = useUser();
  const userInfo = userData?.userInfo;

  const isSuperAdmin = userInfo?.role === 'SUPER_ADMIN' || userInfo?.role === 5;
  const isAdmin = isSuperAdmin || userInfo?.role === 'ADMIN' || userInfo?.role === 4;

  useImperativeHandle(ref, () => ({
    openDialog: () => setVisible(true),
    closeDialog: () => setVisible(false),
  }));

  useEffect(() => {
    if (visible) {
      fetchAccounts();
    }
  }, [visible]);

  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true);
      let list = [];

      if (isSuperAdmin) {
        // Super admin users can see all accounts (paginated response)
        const response = await getAllAccountsAPI();
        list = response?.data?.accounts || [];
      } else {
        // Admins and regular users can only see accounts they have access to
        const response = await getCurrentUserAccountsAPI();
        list = response?.data || [];
      }

      setAccounts(Array.isArray(list) ? list : []);
    } catch (error) {
      logger.error("Failed to fetch accounts:", error);
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setVisible(false);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      values.location = `${values.location.latitude}, ${values.location.longitude}`;
      logger.debug("Device registration values prepared");
      
      const response = await dispatch(
        createDevice({ ...values, account_id: values.account_id })
      ).unwrap();
      
      logger.debug("Create Device Response received");
      // Refresh listing depending on view
      if (isAdmin) {
        // Notify parent to refresh admin device list
        window.dispatchEvent(new CustomEvent('devices:refresh'));
      } else {
        // Refresh the selected account details for non-admin users
        const account = await dispatch(
          getAccountDetails(values.account_id)
        ).unwrap();
        saveAccountDetail(account);
      }
      
      message.success('Device created successfully');
      
      setVisible(false);
      form.resetFields();
    } catch (error) {
      logger.error("Device creation failed:", error);
      
      // Provide user-friendly error messages
      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        message.error('Device creation is taking longer than expected. Please try again.');
      } else if (error.status === 422) {
        message.error('Please check your device information and try again.');
      } else if (error.status >= 500) {
        message.error('Server error occurred. Please try again later.');
      } else {
        message.error('Failed to create device. Please try again.');
      }
    }
  };

  return (
    <Modal
      title="Add Device"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Add Device"
      cancelText="Cancel"
      width={700}
    >
      <Form form={form} layout="vertical" initialValues={{ is_storage: false }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Account"
              name="account_id"
              rules={[{ required: true, message: "Please select account" }]}
            >
              <Select 
                placeholder="Select account"
                loading={loadingAccounts}
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {accounts.map(account => (
                  <Option key={account.id} value={account.id}>
                    {account.account_name}{account.organization_name ? ` (${account.organization_name})` : ''}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Device Name"
              name="device_name"
              rules={[{ required: true, message: "Please input device name" }]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Device ID"
              name="local_device_identifier"
              rules={[{ required: true, message: "Please input device ID" }]}
              help="A unique identifier for the device, ideally used by the grid operator to identify the device and link it to available data sources. This could be a meter number, a serial number, or other appropriate identifier"
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Grid"
              name="grid"
              rules={[{ required: true, message: "Please select grid" }]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Technology type"
              name="technology_type"
              rules={[{ required: true, message: "Please select technology type" }]}
            >
              <Select placeholder="Select...">
                {Object.entries(DEVICE_TECHNOLOGY_TYPE).map(([key, value]) => (
                  <Option key={key} value={key.toLocaleLowerCase()}>
                    {value}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Energy source"
              name="energy_source"
            >
              <Select placeholder="Select energy source (optional)">
                {Object.entries(ENERGY_SOURCE).map(([key, value]) => (
                  <Option key={key} value={key.toLocaleLowerCase()}>
                    {value}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Capacity (kW)"
              name="capacity"
            >
              <Input type="number" min={0} step={0.1} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Peak Demand (kW)"
              name="peak_demand"
            >
              <Input type="number" min={0} step={0.1} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Operational Date"
              name="operational_date"
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Is Storage Device"
              name="is_storage"
              valuePropName="checked"
            >
              <Checkbox />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Latitude"
              name={["location", "latitude"]}
              rules={[{ required: true, message: "Please input latitude" }]}
            >
              <Input type="number" step="any" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Longitude"
              name={["location", "longitude"]}
              rules={[{ required: true, message: "Please input longitude" }]}
            >
              <Input type="number" step="any" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={24}>
            <h4 style={{ marginBottom: 16 }}>EAC Registry Integration (Optional)</h4>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="EAC Registry Name"
              name="eac_registry_name"
              help="e.g., PJM-GATS, M-RETS, WREGIS"
            >
              <Input placeholder="e.g., PJM-GATS" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="EAC Registry Device ID"
              name="eac_registry_device_id"
              help="Device identifier in the registry"
            >
              <Input placeholder="e.g., NON604366" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="EAC Registry Meter ID"
              name="eac_registry_meter_id"
              help="Meter identifier in the registry"
            >
              <Input placeholder="e.g., H475393" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
});

export default DeviceRegisterDialog;

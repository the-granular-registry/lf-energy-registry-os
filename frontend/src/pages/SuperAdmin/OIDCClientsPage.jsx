import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Select, Space, Table, Tag, message, Modal } from 'antd';
import {
  listOidcClientsAPI,
  createOidcClientAPI,
  rotateOidcClientSecretAPI,
  disableOidcClientAPI,
} from '@api/superAdminAPI';

const { Option } = Select;

const OIDCClientsPage = () => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await listOidcClientsAPI();
      setClients(res?.data || []);
    } catch (err) {
      message.error('Failed to load OIDC clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const payload = {
        client_name: values.client_name,
        redirect_uris: values.redirect_uris.split(/\s*,\s*/).filter(Boolean),
        client_type: values.client_type,
        allowed_scopes: values.allowed_scopes,
        is_active: true,
      };
      const res = await createOidcClientAPI(payload);
      const secret = res?.data?.client_secret;
      message.success('OIDC client created');
      setCreateOpen(false);
      createForm.resetFields();
      await fetchClients();
      if (secret) {
        Modal.success({
          title: 'Client Secret (copy now - shown once)',
          content: (
            <div>
              <Input.TextArea value={secret} readOnly rows={3} />
            </div>
          ),
          width: 600,
        });
      }
    } catch (err) {
      if (err?.errorFields) return; // validation errors
      message.error(err?.response?.data?.detail || 'Failed to create client');
    }
  };

  const handleRotate = async (record) => {
    try {
      const res = await rotateOidcClientSecretAPI(record.id);
      const newSecret = res?.data?.client_secret;
      message.success('Client secret rotated');
      if (newSecret) {
        Modal.success({
          title: 'New Client Secret (copy now - shown once)',
          content: <Input.TextArea value={newSecret} readOnly rows={3} />,
          width: 600,
        });
      }
    } catch (err) {
      message.error(err?.response?.data?.detail || 'Failed to rotate secret');
    }
  };

  const handleDisable = async (record) => {
    Modal.confirm({
      title: 'Disable client?',
      content: 'This will prevent further authorization for this client.',
      okType: 'danger',
      onOk: async () => {
        try {
          await disableOidcClientAPI(record.id);
          message.success('Client disabled');
          fetchClients();
        } catch (err) {
          message.error('Failed to disable client');
        }
      },
    });
  };

  const columns = [
    { title: 'Name', dataIndex: 'client_name', key: 'client_name' },
    { title: 'Client ID', dataIndex: 'client_id', key: 'client_id', render: (v) => <Input value={v} readOnly /> },
    { title: 'Redirect URIs', dataIndex: 'redirect_uris', key: 'redirect_uris', render: (v) => (v || []).map((u) => <div key={u}>{u}</div>) },
    { title: 'Scopes', dataIndex: 'allowed_scopes', key: 'allowed_scopes' },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', render: (v) => (v ? <Tag color="green">Active</Tag> : <Tag>Disabled</Tag>) },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button onClick={() => handleRotate(record)} disabled={false}>Rotate Secret</Button>
          <Button danger onClick={() => handleDisable(record)}>Disable</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => setCreateOpen(true)}>Create Client</Button>
        <Button onClick={fetchClients} loading={loading}>Refresh</Button>
      </Space>

      <Card>
        <Table
          rowKey={(r) => r.id}
          loading={loading}
          columns={columns}
          dataSource={clients}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Create OIDC Client"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        okText="Create"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item label="Client Name" name="client_name" rules={[{ required: true }]}>
            <Input placeholder="Partner App" />
          </Form.Item>
          <Form.Item label="Redirect URIs (comma separated)" name="redirect_uris" rules={[{ required: true }]}>
            <Input placeholder="https://partner.com/auth/callback, https://partner.com/cb" />
          </Form.Item>
          <Form.Item label="Client Type" name="client_type" initialValue="confidential">
            <Select>
              <Option value="confidential">Confidential (server-side)</Option>
              <Option value="public">Public (SPA/mobile)</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Allowed Scopes" name="allowed_scopes" initialValue="openid profile email roles">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OIDCClientsPage;




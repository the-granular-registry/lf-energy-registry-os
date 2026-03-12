import React, { useState, useEffect } from 'react';
import { Select, Space, Typography, Avatar, Spin } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useUser } from '../../context/UserContext';
import { getOrganizationsAPI } from '../../api/organizationAPI';
import { setSelectedOrganization } from '../../store/superAdmin/superAdminSlice';
import { logger } from '../../utils';

const { Option } = Select;
const { Text } = Typography;

const OrganizationSelector = ({ 
  value, 
  onChange, 
  style = {},
  placeholder = "Select Organization",
  showAvatar = true,
  size = "default"
}) => {
  const dispatch = useDispatch();
  const { userData } = useUser();
  const currentUser = userData?.userInfo;
  const { selectedOrganization } = useSelector(state => state.superAdmin);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 5) {
      fetchOrganizations();
    }
  }, [currentUser]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await getOrganizationsAPI();
      setOrganizations(response.data || []);
      
      // Auto-select first organization if none selected
      if (!selectedOrganization && response.data?.length > 0) {
        const firstOrg = response.data[0];
        dispatch(setSelectedOrganization(firstOrg));
        onChange?.(firstOrg.id, firstOrg);
      }
    } catch (error) {
      logger.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationChange = (organizationId, option) => {
    const selectedOrg = organizations.find(org => org.id === organizationId);
    dispatch(setSelectedOrganization(selectedOrg));
    onChange?.(organizationId, selectedOrg);
  };

  // Don't show selector for non-super-admin users
  if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 5) {
    return null;
  }

  return (
    <div style={{ marginBottom: 16, ...style }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          Organization Context
        </Text>
        <Select
          style={{ width: '100%', minWidth: 280 }}
          placeholder={placeholder}
          size={size}
          value={value || selectedOrganization?.id}
          onChange={handleOrganizationChange}
          loading={loading}
          optionLabelProp="label"
          showSearch
          filterOption={(input, option) =>
            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
        >
          {organizations.map(org => (
            <Option 
              key={org.id} 
              value={org.id}
              label={org.name}
            >
              <Space>
                {showAvatar && (
                  <Avatar 
                    size="small" 
                    icon={<BankOutlined />}
                    style={{ 
                      backgroundColor: org.status === 'ACTIVE' ? '#52c41a' : '#faad14' 
                    }}
                  />
                )}
                <div>
                  <div style={{ fontWeight: 500 }}>{org.name}</div>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {org.organization_type?.replace('_', ' ')} • {org.status}
                  </Text>
                </div>
              </Space>
            </Option>
          ))}
        </Select>
      </Space>
    </div>
  );
};

export default OrganizationSelector; 
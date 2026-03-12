import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Button, Space, Tag, Select } from 'antd';
import { TeamOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

// EIA Utility Data from CSV - first 40 records
const eiaUtilityData = [
  { eia_number: '55', utility_name: 'City of Aberdeen - (MS)', rto_iso_region: 'SERC' },
  { eia_number: '84', utility_name: 'A & N Electric Coop', rto_iso_region: 'PJM' },
  { eia_number: '108', utility_name: 'Adams-Columbia Electric Coop', rto_iso_region: 'MISO' },
  { eia_number: '113', utility_name: 'Agway Energy Services, LLC', rto_iso_region: 'PJM' },
  { eia_number: '123', utility_name: 'City of Adel- (GA)', rto_iso_region: 'SERC' },
  { eia_number: '155', utility_name: 'Agralite Electric Coop', rto_iso_region: 'MISO' },
  { eia_number: '162', utility_name: 'Aiken Electric Coop Inc', rto_iso_region: 'Other' },
  { eia_number: '176', utility_name: 'Ajo Improvement Co', rto_iso_region: 'WECC' },
  { eia_number: '189', utility_name: 'PowerSouth Energy Cooperative', rto_iso_region: 'Other' },
  { eia_number: '195', utility_name: 'Alabama Power Co', rto_iso_region: 'SERC' },
  { eia_number: '207', utility_name: 'Alameda Municipal Power', rto_iso_region: 'CAISO' },
  { eia_number: '213', utility_name: 'Alaska Electric Light & Power Co.', rto_iso_region: 'AK' },
  { eia_number: '219', utility_name: 'Alaska Power and Telephone Co', rto_iso_region: 'AK' },
  { eia_number: '221', utility_name: 'Alaska Village Elec Coop, Inc', rto_iso_region: 'Other' },
  { eia_number: '230', utility_name: 'Albany Utility Board', rto_iso_region: 'Other' },
  { eia_number: '232', utility_name: 'City of Albemarle - (NC)', rto_iso_region: 'Other' },
  { eia_number: '240', utility_name: 'Albemarle Electric Member Corp', rto_iso_region: 'SERC' },
  { eia_number: '241', utility_name: 'Albertville Municipal Utilities Board', rto_iso_region: 'SERC' },
  { eia_number: '261', utility_name: 'AGC Division of APGI Inc', rto_iso_region: 'MISO' },
  { eia_number: '276', utility_name: 'Alcorn County Elec Power Assn', rto_iso_region: 'SERC' },
  { eia_number: '295', utility_name: 'City of Alexandria - (MN)', rto_iso_region: 'MISO' },
  { eia_number: '296', utility_name: 'Alfalfa Electric Coop, Inc', rto_iso_region: 'SPP' },
  { eia_number: '298', utility_name: 'City of Alexandria - (LA)', rto_iso_region: 'MISO' },
  { eia_number: '305', utility_name: 'Alger-Delta Coop Electric Assn', rto_iso_region: 'MISO' },
  { eia_number: '307', utility_name: 'Algoma Utility Comm', rto_iso_region: 'MISO' },
  { eia_number: '332', utility_name: 'Allegheny Electric Coop Inc', rto_iso_region: 'PJM' },
  { eia_number: '343', utility_name: 'AEP Generating Company', rto_iso_region: 'RFC' },
  { eia_number: '392', utility_name: 'Alpena Power Co', rto_iso_region: 'RFC' },
  { eia_number: '407', utility_name: 'Altamaha Electric Member Corp', rto_iso_region: 'Other' },
  { eia_number: '416', utility_name: 'City of Altus - (OK)', rto_iso_region: 'SPP' },
  { eia_number: '471', utility_name: 'Amana Society Service Co', rto_iso_region: 'MISO' },
  { eia_number: '540', utility_name: 'BP Energy Company', rto_iso_region: 'ERCOT' },
  { eia_number: '554', utility_name: 'City of Ames - (IA)', rto_iso_region: 'MISO' },
  { eia_number: '562', utility_name: 'Amicalola Electric Member Corp', rto_iso_region: 'SERC' },
  { eia_number: '571', utility_name: 'City of Amory', rto_iso_region: 'SERC' },
  { eia_number: '577', utility_name: 'City of Alcoa Utilities', rto_iso_region: 'SERC' },
  { eia_number: '590', utility_name: 'City of Anaheim - (CA)', rto_iso_region: 'CAISO' },
  { eia_number: '604', utility_name: 'City of Andalusia', rto_iso_region: 'SERC' },
  { eia_number: '636', utility_name: 'City of Anderson - (IN)', rto_iso_region: 'PJM' },
  { eia_number: '659', utility_name: 'American Transmission Co', rto_iso_region: 'MISO' },
  { eia_number: '689', utility_name: 'Connexus Energy', rto_iso_region: 'MRO' },
  { eia_number: '690', utility_name: 'City of Bardstown - (KY)', rto_iso_region: 'RFC' },
  { eia_number: '691', utility_name: 'City of Anoka', rto_iso_region: 'MISO' },
  { eia_number: '712', utility_name: 'Arkansas River Power Authority', rto_iso_region: 'Other' },
  { eia_number: '719', utility_name: 'Town of Apex- (NC)', rto_iso_region: 'Other' },
  { eia_number: '727', utility_name: 'Appalachian Electric Coop', rto_iso_region: 'SERC' },
  { eia_number: '733', utility_name: 'Appalachian Power Co', rto_iso_region: 'PJM' },
  { eia_number: '750', utility_name: 'Arab Electric Coop Inc', rto_iso_region: 'SERC' },
  { eia_number: '796', utility_name: 'Arizona Electric Pwr Coop Inc', rto_iso_region: 'Other' },
  { eia_number: '798', utility_name: 'Arizona Power Authority', rto_iso_region: 'Other' },
  { eia_number: '803', utility_name: 'Arizona Public Service Co', rto_iso_region: 'WECC' },
  { eia_number: '807', utility_name: 'Arkansas Electric Coop Corp', rto_iso_region: 'SPP' },
  { eia_number: '814', utility_name: 'Entergy Arkansas LLC', rto_iso_region: 'MISO' },
  { eia_number: '817', utility_name: 'Arkansas Valley Elec Coop Corp', rto_iso_region: 'Other' },
  { eia_number: '924', utility_name: 'Associated Electric Coop, Inc', rto_iso_region: 'Other' },
  { eia_number: '944', utility_name: 'City of Athens - (AL)', rto_iso_region: 'SERC' },
  { eia_number: '947', utility_name: 'Athens Utility Board', rto_iso_region: 'SERC' },
  { eia_number: '963', utility_name: 'Atlantic City Electric Co', rto_iso_region: 'PJM' },
  { eia_number: '970', utility_name: 'Homefield Energy', rto_iso_region: 'PJM' },
  { eia_number: '994', utility_name: 'City of Auburn - (IN)', rto_iso_region: 'PJM' },
  { eia_number: '1009', utility_name: 'City of Austin - (MN)', rto_iso_region: 'MISO' },
  { eia_number: '1015', utility_name: 'Austin Energy', rto_iso_region: 'ERCOT' },
  { eia_number: '1050', utility_name: 'City of Azusa', rto_iso_region: 'CAISO' },
];

// Helper function to extract state from utility name
const extractStateFromUtilityName = (utilityName) => {
  const stateMatch = utilityName.match(/\(([A-Z]{2})\)/);
  if (stateMatch) {
    return stateMatch[1];
  }
  
  // Map RTO/ISO regions to common states for utilities without explicit state
  const regionStateMap = {
    'CAISO': 'California',
    'ERCOT': 'Texas',
    'PJM': 'Pennsylvania',
    'NYISO': 'New York',
    'MISO': 'Illinois',
    'SPP': 'Kansas',
    'SERC': 'North Carolina',
    'WECC': 'Washington',
    'ISONE': 'Massachusetts',
    'RFC': 'Ohio',
    'MRO': 'Minnesota',
    'AK': 'Alaska',
    'HI': 'Hawaii',
    'Other': 'Various'
  };
  
  return regionStateMap[utilityName] || 'Various';
};

// Helper function to generate realistic renewable percentage based on RTO/ISO
const generateRenewablePercentage = (rtoIso) => {
  const renewableRanges = {
    'CAISO': [25, 45], // California has high renewable penetration
    'ERCOT': [15, 35], // Texas has good wind but also coal
    'PJM': [10, 25],   // PJM has mixed generation
    'NYISO': [20, 40], // New York has good renewable programs
    'MISO': [15, 30],  // Midwest has wind but also coal
    'SPP': [20, 40],   // SPP has good wind resources
    'SERC': [10, 25],  // Southeast has lower renewable penetration
    'WECC': [20, 45],  // Western states have good renewables
    'ISONE': [15, 35], // New England has mixed generation
    'RFC': [10, 25],   // RFC has traditional generation mix
    'MRO': [15, 30],   // MRO has some wind
    'AK': [20, 40],    // Alaska has hydro
    'HI': [25, 45],    // Hawaii has good renewable potential
    'Other': [10, 30]  // Default range
  };
  
  const [min, max] = renewableRanges[rtoIso] || renewableRanges['Other'];
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
};

// Helper function to generate emissions factor based on renewable percentage
const generateEmissionsFactor = (renewablePercentage) => {
  // Higher renewable percentage = lower emissions factor
  const baseEmissions = 0.5; // kg CO2e/kWh for fossil fuels
  const renewableEmissions = 0.05; // kg CO2e/kWh for renewables
  
  const emissionsFactor = (renewablePercentage / 100) * renewableEmissions + 
                         ((100 - renewablePercentage) / 100) * baseEmissions;
  
  return Math.round(emissionsFactor * 1000) / 1000;
};

// Generate supplier data from EIA utility data
const generateSupplierData = () => {
  return eiaUtilityData.map((utility, index) => {
    const state = extractStateFromUtilityName(utility.utility_name);
    const renewablePercentage = generateRenewablePercentage(utility.rto_iso_region);
    const emissionsFactor = generateEmissionsFactor(renewablePercentage);
    
    return {
      key: index + 1,
      supplier_id: `EIA-${utility.eia_number}`,
      state: state,
      supplier: utility.utility_name,
      rto: utility.rto_iso_region,
      renewable: renewablePercentage,
      emissions: emissionsFactor,
      claimed: false,
      status: Math.random() > 0.7 ? 'Verified' : 'Estimated',
      rps: Math.random() > 0.4 ? 'Yes' : 'No',
    };
  });
};

const allStates = [...new Set(generateSupplierData().map(d => d.state))];
const allRTOs = [...new Set(generateSupplierData().map(d => d.rto))];

const SSSOverview = () => {
  const [stateFilter, setStateFilter] = useState(undefined);
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [rtoFilter, setRtoFilter] = useState(undefined);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [data, setData] = useState(generateSupplierData());
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimingSupplier, setClaimingSupplier] = useState(null);

  const navigate = useNavigate();

  // Mock utility user
  const isUtilityUser = true; // Replace with actual check from props or context

  const handleClaim = (record) => {
    setClaimingSupplier(record);
    setShowClaimModal(true);
  };

  const confirmClaim = () => {
    setData(data.map(item => 
      item.key === claimingSupplier.key ? { ...item, claimed: true, status: 'Claimed' } : item
    ));
    setShowClaimModal(false);
    // Modal.success({
    //   title: 'Supplier Claimed',
    //   content: `You have successfully claimed ${claimingSupplier.supplier}. Proceed to Utility Portal for verification.`,
    //   onOk: () => setView('utility'),
    // });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setStateFilter(undefined);
    setStatusFilter(undefined);
    setRtoFilter(undefined);
  };

  // Filtering
  const filteredData = data.filter(row => {
    return (
      (!stateFilter || row.state === stateFilter) &&
      (!statusFilter || row.status === statusFilter) &&
      (!rtoFilter || row.rto === rtoFilter)
    );
  });

  const columns = [
    {
      title: 'State',
      dataIndex: 'state',
      key: 'state',
      filters: allStates.map(s => ({ text: s, value: s })),
      filteredValue: stateFilter ? [stateFilter] : null,
      onFilter: (value, record) => record.state === value,
    },
    {
      title: 'Supplier ID',
      dataIndex: 'supplier_id',
      key: 'supplier_id',
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier',
      key: 'supplier',
    },
    {
      title: 'RTO/ISO',
      dataIndex: 'rto',
      key: 'rto',
      filters: allRTOs.map(r => ({ text: r, value: r })),
      filteredValue: rtoFilter ? [rtoFilter] : null,
      onFilter: (value, record) => record.rto === value,
    },
    {
      title: '% Carbon Free Energy',
      dataIndex: 'renewable',
      key: 'renewable',
      render: (val) => <Text>{val}%</Text>,
    },
    {
      title: 'Supplier Emissions Factor (kg CO₂e/MWh)',
      dataIndex: 'emissions',
      key: 'emissions',
      render: (val) => <Text>{val}</Text>,
    },
    {
      title: 'RPS Present',
      dataIndex: 'rps',
      key: 'rps',
      filters: [
        { text: 'Yes', value: 'Yes' },
        { text: 'No', value: 'No' },
      ],
      onFilter: (value, record) => record.rps === value,
      render: (val) => val === 'Yes' ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'Verified', value: 'Verified' },
        { text: 'Estimated', value: 'Estimated' },
      ],
      filteredValue: statusFilter ? [statusFilter] : null,
      onFilter: (value, record) => record.status === value,
      render: (val) => val === 'Verified' ? <Tag color="blue">Verified</Tag> : <Tag color="orange">Estimated</Tag>,
    },
    // Action column removed
  ];

  return (
    <Card>
      <Title level={2}>Standard Supply Service (SSS) Overview</Title>
      <Paragraph>
        <Text strong>Standard Supply Service (SSS)</Text> is a mechanism that allows utilities and retail suppliers to provide renewable energy and emissions data to their customers. SSS is critical for <Text strong>Scope 2 accounting</Text> and enables end users to claim Renewable Energy Certificates (RECs) retired by their utility for Renewable Portfolio Standards (RPS) and other renewable energy programs.
      </Paragraph>
      <Paragraph>
        This page provides an overview of SSS suppliers and their estimated renewable energy mix and emissions factors. All users can view this information to understand the environmental impact of their electricity supply and the role of SSS in credible renewable energy claims.
      </Paragraph>
      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <Space>
          <Button icon={<TeamOutlined />} type="primary" onClick={() => navigate('/sss/utility-onboarding')}>
            Utility Portal
          </Button>
          <Button icon={<UserOutlined />} type="primary" onClick={() => navigate('/sss/enduser-onboarding')}>
            End User Portal
          </Button>
        </Space>
      </div>
      <Space style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Filter by State"
          style={{ width: 180 }}
          value={stateFilter}
          onChange={setStateFilter}
        >
          {allStates.map(s => <Option key={s} value={s}>{s}</Option>)}
        </Select>
        <Select
          allowClear
          placeholder="Filter by RTO/ISO"
          style={{ width: 180 }}
          value={rtoFilter}
          onChange={setRtoFilter}
        >
          {allRTOs.map(r => <Option key={r} value={r}>{r}</Option>)}
        </Select>
        <Select
          allowClear
          placeholder="Filter by Status"
          style={{ width: 180 }}
          value={statusFilter}
          onChange={setStatusFilter}
        >
          <Option value="Verified">Verified</Option>
          <Option value="Estimated">Estimated</Option>
        </Select>
        <Button 
          onClick={clearAllFilters}
          disabled={!stateFilter && !statusFilter && !rtoFilter}
        >
          Clear Filters
        </Button>
      </Space>
      <Table
        columns={columns}
        dataSource={filteredData}
        pagination={{
          ...pagination,
          total: filteredData.length,
          onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} suppliers`,
        }}
        bordered
        style={{ marginTop: 24 }}
        title={() => 'U.S. States and SSS Suppliers'}
      />
      {/* Claim modal removed */}
    </Card>
  );
};

export default SSSOverview; 
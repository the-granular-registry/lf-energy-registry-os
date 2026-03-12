// Mock data for SSS components
export const mockSSSProviders = [
  {
    id: 1,
    provider_name: "Pacific Gas & Electric",
    provider_code: "PGE-001",
    regions_served: ["CA", "NV"],
    compliance_contact_email: "sss@pge.com",
    compliance_contact_phone: "(415) 555-0123",
    status: "ACTIVE",
    factor_count: 12,
    resource_count: 85,
    customer_count: 1245,
    created_at: "2024-01-15T10:30:00Z",
    approved_at: "2024-01-20T14:15:00Z",
    approved_by: 1
  },
  {
    id: 2,
    provider_name: "Southern California Edison",
    provider_code: "SCE-002",
    regions_served: ["CA"],
    compliance_contact_email: "sss@sce.com",
    compliance_contact_phone: "(213) 555-0456",
    status: "ACTIVE",
    factor_count: 8,
    resource_count: 62,
    customer_count: 987,
    created_at: "2024-01-18T09:45:00Z",
    approved_at: "2024-01-22T11:30:00Z",
    approved_by: 1
  },
  {
    id: 3,
    provider_name: "ConEd Clean Energy",
    provider_code: "CONED-003",
    regions_served: ["NY", "NJ"],
    compliance_contact_email: "sss@coned.com",
    compliance_contact_phone: "(212) 555-0789",
    status: "PENDING",
    factor_count: 0,
    resource_count: 0,
    customer_count: 0,
    created_at: "2024-02-01T16:20:00Z",
    approved_at: null,
    approved_by: null
  },
  {
    id: 4,
    provider_name: "Austin Energy",
    provider_code: "AE-004",
    regions_served: ["TX"],
    compliance_contact_email: "sss@austinenergy.com",
    compliance_contact_phone: "(512) 555-0321",
    status: "ACTIVE",
    factor_count: 6,
    resource_count: 34,
    customer_count: 567,
    created_at: "2024-01-25T13:10:00Z",
    approved_at: "2024-02-02T08:45:00Z",
    approved_by: 1
  },
  {
    id: 5,
    provider_name: "Duke Energy Renewables",
    provider_code: "DUKE-005",
    regions_served: ["NC", "SC", "FL"],
    compliance_contact_email: "sss@duke-energy.com",
    compliance_contact_phone: "(704) 555-0654",
    status: "SUSPENDED",
    factor_count: 10,
    resource_count: 45,
    customer_count: 789,
    created_at: "2024-01-10T11:30:00Z",
    approved_at: "2024-01-15T14:20:00Z",
    approved_by: 1
  }
];

export const mockSSSFactors = [
  {
    id: 1,
    provider_id: 1,
    provider_name: "Pacific Gas & Electric",
    state: "CA",
    year: 2024,
    month: null,
    renewable_percentage: 45.2,
    emissions_factor: 0.234,
    technology_breakdown: {
      solar: 35.5,
      wind: 25.8,
      hydro: 15.2,
      biomass: 8.7,
      geothermal: 14.8
    },
    data_source: "supplier-verified",
    source_url: "https://pge.com/sss-data/2024-annual",
    status: "APPROVED",
    version: 1,
    created_at: "2024-01-15T10:30:00Z",
    approved_at: "2024-01-20T14:15:00Z",
    approved_by: 1
  },
  {
    id: 2,
    provider_id: 1,
    provider_name: "Pacific Gas & Electric",
    state: "CA",
    year: 2024,
    month: 1,
    renewable_percentage: 52.8,
    emissions_factor: 0.198,
    technology_breakdown: {
      solar: 42.3,
      wind: 28.5,
      hydro: 18.2,
      biomass: 6.8,
      geothermal: 4.2
    },
    data_source: "supplier-verified",
    source_url: "https://pge.com/sss-data/2024-january",
    status: "APPROVED",
    version: 1,
    created_at: "2024-02-01T09:15:00Z",
    approved_at: "2024-02-03T11:30:00Z",
    approved_by: 1
  },
  {
    id: 3,
    provider_id: 2,
    provider_name: "Southern California Edison",
    state: "CA",
    year: 2024,
    month: null,
    renewable_percentage: 38.7,
    emissions_factor: 0.287,
    technology_breakdown: {
      solar: 45.2,
      wind: 22.1,
      hydro: 12.8,
      biomass: 19.9
    },
    data_source: "supplier-verified",
    source_url: "https://sce.com/sss-data/2024-annual",
    status: "APPROVED",
    version: 1,
    created_at: "2024-01-18T14:20:00Z",
    approved_at: "2024-01-22T16:45:00Z",
    approved_by: 1
  },
  {
    id: 4,
    provider_id: 4,
    provider_name: "Austin Energy",
    state: "TX",
    year: 2024,
    month: null,
    renewable_percentage: 55.3,
    emissions_factor: 0.156,
    technology_breakdown: {
      solar: 32.4,
      wind: 67.6
    },
    data_source: "supplier-verified",
    source_url: "https://austinenergy.com/sss-data/2024-annual",
    status: "APPROVED",
    version: 1,
    created_at: "2024-01-25T11:10:00Z",
    approved_at: "2024-02-02T13:25:00Z",
    approved_by: 1
  },
  {
    id: 5,
    provider_id: 2,
    provider_name: "Southern California Edison",
    state: "CA",
    year: 2024,
    month: 2,
    renewable_percentage: 41.2,
    emissions_factor: 0.267,
    technology_breakdown: {
      solar: 48.7,
      wind: 19.8,
      hydro: 15.3,
      biomass: 16.2
    },
    data_source: "third-party-estimate",
    source_url: null,
    status: "PENDING_APPROVAL",
    version: 1,
    created_at: "2024-02-15T10:45:00Z",
    approved_at: null,
    approved_by: null
  }
];

export const mockSSSResources = [
  {
    id: 1,
    provider_id: 1,
    provider_name: "Pacific Gas & Electric",
    device_id: 101,
    device_name: "Topaz Solar Farm",
    resource_name: "Topaz Solar Farm - PGE Contract",
    energy_source: "SOLAR",
    capacity_mw: 550.0,
    is_sss_eligible: true,
    rec_contract_status: "OWNED",
    status: "ACTIVE",
    location: "San Luis Obispo County, CA",
    created_at: "2024-01-15T10:30:00Z"
  },
  {
    id: 2,
    provider_id: 1,
    provider_name: "Pacific Gas & Electric",
    device_id: 102,
    device_name: "Altamont Wind Farm",
    resource_name: "Altamont Wind Farm - PGE Contract",
    energy_source: "WIND",
    capacity_mw: 320.5,
    is_sss_eligible: true,
    rec_contract_status: "PURCHASED",
    status: "ACTIVE",
    location: "Alameda County, CA",
    created_at: "2024-01-16T14:20:00Z"
  },
  {
    id: 3,
    provider_id: 2,
    provider_name: "Southern California Edison",
    device_id: 103,
    device_name: "Ivanpah Solar Power Facility",
    resource_name: "Ivanpah Solar Power Facility - SCE Contract",
    energy_source: "SOLAR",
    capacity_mw: 392.0,
    is_sss_eligible: true,
    rec_contract_status: "OWNED",
    status: "ACTIVE",
    location: "San Bernardino County, CA",
    created_at: "2024-01-18T09:45:00Z"
  },
  {
    id: 4,
    provider_id: 4,
    provider_name: "Austin Energy",
    device_id: 104,
    device_name: "Hackberry Wind Farm",
    resource_name: "Hackberry Wind Farm - AE Contract",
    energy_source: "WIND",
    capacity_mw: 165.5,
    is_sss_eligible: true,
    rec_contract_status: "OWNED",
    status: "ACTIVE",
    location: "Shackelford County, TX",
    created_at: "2024-01-25T13:10:00Z"
  },
  {
    id: 5,
    provider_id: 1,
    provider_name: "Pacific Gas & Electric",
    device_id: 105,
    device_name: "Diablo Canyon Power Plant",
    resource_name: "Diablo Canyon Power Plant - PGE Contract",
    energy_source: "NUCLEAR",
    capacity_mw: 2256.0,
    is_sss_eligible: true,
    rec_contract_status: "OWNED",
    status: "ACTIVE",
    location: "San Luis Obispo County, CA",
    created_at: "2024-01-20T11:30:00Z"
  },
  {
    id: 6,
    provider_id: 2,
    provider_name: "Southern California Edison",
    device_id: 106,
    device_name: "Tehachapi Wind Farm",
    resource_name: "Tehachapi Wind Farm - SCE Contract",
    energy_source: "WIND",
    capacity_mw: 275.2,
    is_sss_eligible: false,
    rec_contract_status: "SOLD",
    status: "SUSPENDED",
    location: "Kern County, CA",
    created_at: "2024-01-22T16:45:00Z"
  }
];

export const mockSSSAllocations = [
  {
    id: 1,
    provider_id: 1,
    provider_name: "Pacific Gas & Electric",
    customer_account_id: 1001,
    customer_name: "Green Energy Corp",
    meter_id: "PGE-MTR-001-ABC",
    allocation_period_start: "2024-01-01T00:00:00Z",
    allocation_period_end: "2024-01-31T23:59:59Z",
    load_ratio_share: 0.15,
    allocated_mwh: 1250.75,
    status: "COMPLETED",
    created_at: "2024-01-15T10:30:00Z"
  },
  {
    id: 2,
    provider_id: 1,
    provider_name: "Pacific Gas & Electric",
    customer_account_id: 1002,
    customer_name: "Sustainable Solutions LLC",
    meter_id: "PGE-MTR-002-DEF",
    allocation_period_start: "2024-02-01T00:00:00Z",
    allocation_period_end: "2024-02-29T23:59:59Z",
    load_ratio_share: 0.08,
    allocated_mwh: 892.33,
    status: "ACTIVE",
    created_at: "2024-02-01T09:15:00Z"
  },
  {
    id: 3,
    provider_id: 2,
    provider_name: "Southern California Edison",
    customer_account_id: 1003,
    customer_name: "Clean Tech Industries",
    meter_id: "SCE-MTR-003-GHI",
    allocation_period_start: "2024-01-01T00:00:00Z",
    allocation_period_end: "2024-12-31T23:59:59Z",
    load_ratio_share: 0.25,
    allocated_mwh: 5678.90,
    status: "ACTIVE",
    created_at: "2024-01-18T14:20:00Z"
  },
  {
    id: 4,
    provider_id: 4,
    provider_name: "Austin Energy",
    customer_account_id: 1004,
    customer_name: "EcoFriendly Manufacturing",
    meter_id: "AE-MTR-004-JKL",
    allocation_period_start: "2024-03-01T00:00:00Z",
    allocation_period_end: "2024-03-31T23:59:59Z",
    load_ratio_share: 0.12,
    allocated_mwh: 743.21,
    status: "PENDING",
    created_at: "2024-02-25T11:45:00Z"
  },
  {
    id: 5,
    provider_id: 1,
    provider_name: "Pacific Gas & Electric",
    customer_account_id: 1005,
    customer_name: "Renewable Energy Partners",
    meter_id: "PGE-MTR-005-MNO",
    allocation_period_start: "2024-01-15T00:00:00Z",
    allocation_period_end: "2024-02-14T23:59:59Z",
    load_ratio_share: 0.18,
    allocated_mwh: 1456.82,
    status: "CANCELLED",
    created_at: "2024-01-10T13:30:00Z"
  }
];

export const mockSSSCustomerLinks = [
  {
    link_id: 1,
    provider_id: 1,
    provider_name: "Pacific Gas & Electric",
    customer_account_id: 1001,
    sss_account_id: "PGE-SSS-001-ABC",
    ownership_token: "TOKEN-ABC-123",
    status: "ACTIVE",
    allocated_gcs: 145,
    linked_at: "2024-01-20T14:15:00Z",
    created_at: "2024-01-15T10:30:00Z"
  },
  {
    link_id: 2,
    provider_id: 2,
    provider_name: "Southern California Edison",
    customer_account_id: 1001,
    sss_account_id: "SCE-SSS-002-DEF",
    ownership_token: "TOKEN-DEF-456",
    status: "ACTIVE",
    allocated_gcs: 89,
    linked_at: "2024-01-22T16:45:00Z",
    created_at: "2024-01-18T09:45:00Z"
  },
  {
    link_id: 3,
    provider_id: 4,
    provider_name: "Austin Energy",
    customer_account_id: 1001,
    sss_account_id: "AE-SSS-003-GHI",
    ownership_token: null,
    status: "PENDING",
    allocated_gcs: 0,
    linked_at: null,
    created_at: "2024-02-01T12:20:00Z"
  },
  {
    link_id: 4,
    provider_id: 1,
    provider_name: "Pacific Gas & Electric",
    customer_account_id: 1002,
    sss_account_id: "PGE-SSS-004-JKL",
    ownership_token: "TOKEN-JKL-789",
    status: "REVOKED",
    allocated_gcs: 23,
    linked_at: "2024-01-25T11:30:00Z",
    created_at: "2024-01-20T15:45:00Z"
  }
];

export const mockSSSUploadHistory = [
  {
    id: 1,
    provider_id: 1,
    provider_name: "Pacific Gas & Electric",
    upload_type: "factors",
    upload_date: "2024-01-15T10:30:00Z",
    data_period_start: "2024-01-01T00:00:00Z",
    data_period_end: "2024-12-31T23:59:59Z",
    status: "COMPLETED",
    records_processed: 12,
    records_valid: 12,
    records_invalid: 0,
    errors: [],
    description: "2024 Annual Emissions Factors"
  },
  {
    id: 2,
    provider_id: 1,
    provider_name: "Pacific Gas & Electric",
    upload_type: "resources",
    upload_date: "2024-01-16T14:20:00Z",
    data_period_start: "2024-01-01T00:00:00Z",
    data_period_end: "2024-12-31T23:59:59Z",
    status: "COMPLETED",
    records_processed: 85,
    records_valid: 83,
    records_invalid: 2,
    errors: [
      "Record 45: Invalid capacity value",
      "Record 67: Missing device ID"
    ],
    description: "SSS Resource Portfolio Update"
  },
  {
    id: 3,
    provider_id: 2,
    provider_name: "Southern California Edison",
    upload_type: "allocations",
    upload_date: "2024-01-18T09:45:00Z",
    data_period_start: "2024-01-01T00:00:00Z",
    data_period_end: "2024-01-31T23:59:59Z",
    status: "FAILED",
    records_processed: 150,
    records_valid: 0,
    records_invalid: 150,
    errors: [
      "Invalid file format",
      "Missing required columns: meter_id, allocation_period_start"
    ],
    description: "January Customer Allocations"
  },
  {
    id: 4,
    provider_id: 4,
    provider_name: "Austin Energy",
    upload_type: "factors",
    upload_date: "2024-02-01T11:10:00Z",
    data_period_start: "2024-02-01T00:00:00Z",
    data_period_end: "2024-02-29T23:59:59Z",
    status: "PROCESSING",
    records_processed: 6,
    records_valid: 6,
    records_invalid: 0,
    errors: [],
    description: "February Monthly Factors"
  },
  {
    id: 5,
    provider_id: 1,
    provider_name: "Pacific Gas & Electric",
    upload_type: "retirements",
    upload_date: "2024-02-05T16:30:00Z",
    data_period_start: "2024-01-01T00:00:00Z",
    data_period_end: "2024-01-31T23:59:59Z",
    status: "COMPLETED",
    records_processed: 1245,
    records_valid: 1245,
    records_invalid: 0,
    errors: [],
    description: "January Automatic Certificate Retirements"
  }
];

export const mockCustomers = [
  {
    id: 1001,
    name: "Green Energy Corp",
    email: "admin@greenenergycorp.com",
    account_type: "COMMERCIAL",
    status: "ACTIVE"
  },
  {
    id: 1002,
    name: "Sustainable Solutions LLC",
    email: "contact@sustainsolutions.com",
    account_type: "COMMERCIAL",
    status: "ACTIVE"
  },
  {
    id: 1003,
    name: "Clean Tech Industries",
    email: "info@cleantechind.com",
    account_type: "INDUSTRIAL",
    status: "ACTIVE"
  },
  {
    id: 1004,
    name: "EcoFriendly Manufacturing",
    email: "support@ecofriendly.com",
    account_type: "INDUSTRIAL",
    status: "ACTIVE"
  },
  {
    id: 1005,
    name: "Renewable Energy Partners",
    email: "partnerships@renewableep.com",
    account_type: "COMMERCIAL",
    status: "ACTIVE"
  }
];

export const mockDevices = [
  {
    id: 101,
    name: "Topaz Solar Farm",
    device_type: "SOLAR",
    capacity_mw: 550.0,
    location: "San Luis Obispo County, CA",
    status: "ACTIVE"
  },
  {
    id: 102,
    name: "Altamont Wind Farm",
    device_type: "WIND",
    capacity_mw: 320.5,
    location: "Alameda County, CA",
    status: "ACTIVE"
  },
  {
    id: 103,
    name: "Ivanpah Solar Power Facility",
    device_type: "SOLAR",
    capacity_mw: 392.0,
    location: "San Bernardino County, CA",
    status: "ACTIVE"
  },
  {
    id: 104,
    name: "Hackberry Wind Farm",
    device_type: "WIND",
    capacity_mw: 165.5,
    location: "Shackelford County, TX",
    status: "ACTIVE"
  },
  {
    id: 105,
    name: "Diablo Canyon Power Plant",
    device_type: "NUCLEAR",
    capacity_mw: 2256.0,
    location: "San Luis Obispo County, CA",
    status: "ACTIVE"
  },
  {
    id: 106,
    name: "Tehachapi Wind Farm",
    device_type: "WIND",
    capacity_mw: 275.2,
    location: "Kern County, CA",
    status: "ACTIVE"
  }
];

export const usStates = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }
]; 
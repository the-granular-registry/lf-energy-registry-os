// Test script to check frontend API response
// Run this in the browser console

console.log('🔍 Testing frontend API response...');

// Mock the API call to see what's happening
const testAPIResponse = async () => {
  try {
    // Get the current user's token
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('access_token='))
      ?.split('=')[1];
    
    console.log('🔑 Token found:', token ? 'Yes' : 'No');
    
    // Get CSRF token
    const csrfResponse = await fetch('/csrf-token', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!csrfResponse.ok) {
      console.log('❌ Failed to get CSRF token:', csrfResponse.status);
      return;
    }
    
    const csrfData = await csrfResponse.json();
    console.log('🛡️ CSRF token:', csrfData.csrf_token ? 'Yes' : 'No');
    
    // Make the certificate query
    const response = await fetch('/certificates/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrfData.csrf_token
      },
      credentials: 'include',
      body: JSON.stringify({
        user_id: 1,
        source_id: 1,
        device_id: null,
        certificate_bundle_status: null,
        certificate_period_start: null,
        certificate_period_end: null,
        localise_time: true
      })
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok || response.status === 202) {
      const data = await response.json();
      console.log('📊 Response data:', data);
      
      if (data.granular_certificate_bundles) {
        console.log('📋 Total certificates:', data.granular_certificate_bundles.length);
        
        if (data.granular_certificate_bundles.length > 0) {
          console.log('🔍 First 3 certificates:');
          data.granular_certificate_bundles.slice(0, 3).forEach((cert, index) => {
            console.log(`  Certificate ${index + 1}:`, {
              id: cert.id,
              eac_id: cert.eac_id,
              carbon_impact: cert.carbon_impact,
              face_value: cert.face_value
            });
          });
        }
      }
    } else {
      console.log('❌ Response error:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('❌ Error details:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Error:', error);
  }
};

// Run the test
testAPIResponse(); 
// Test utility to verify JWT refresh token functionality
// This file can be removed after testing

export const testTokenRefresh = async () => {
  console.log('🔄 Testing JWT refresh token functionality...');
  
  // Check if tokens exist
  const accessToken = sessionStorage.getItem('auth_token');
  const refreshToken = sessionStorage.getItem('refresh_token');
  
  if (!accessToken || !refreshToken) {
    console.log('❌ No tokens found. Please login first.');
    return false;
  }
  
  console.log('✅ Tokens found in storage');
  
  // Decode and check token expiration
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const exp = payload.exp * 1000;
    const now = Date.now();
    const timeLeft = exp - now;
    
    console.log(`⏰ Access token expires in: ${Math.round(timeLeft / 1000 / 60)} minutes`);
    
    if (timeLeft < 5 * 60 * 1000) { // Less than 5 minutes
      console.log('⚠️ Token expires soon, testing refresh...');
      
      // Test refresh endpoint
      const response = await fetch('/api/employees/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Token refresh successful');
        sessionStorage.setItem('auth_token', data.access_token);
        sessionStorage.setItem('refresh_token', data.refresh_token);
        return true;
      } else {
        console.log('❌ Token refresh failed:', response.statusText);
        return false;
      }
    } else {
      console.log('✅ Token is still valid');
      return true;
    }
  } catch (error) {
    console.log('❌ Error testing token refresh:', error);
    return false;
  }
};

// Test automatic refresh in API calls
export const testApiWithRefresh = async () => {
  console.log('🔄 Testing API calls with automatic refresh...');
  
  try {
    // Make a test API call that requires authentication
    const response = await fetch('/api/employees/profile', {
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}`,
      },
    });
    
    console.log(`📡 API call status: ${response.status}`);
    
    if (response.status === 401) {
      console.log('🔄 Got 401, automatic refresh should trigger...');
    } else if (response.ok) {
      console.log('✅ API call successful');
    }
    
    return response.ok;
  } catch (error) {
    console.log('❌ Error in API test:', error);
    return false;
  }
};

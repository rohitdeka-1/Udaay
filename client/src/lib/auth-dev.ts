import axios from 'axios';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Log prototype mode warning
console.log('%c⚠️ PROTOTYPE MODE ⚠️', 'color: orange; font-size: 16px; font-weight: bold;');
console.log('%cThis application is using backend OTP authentication.', 'color: orange;');
console.log('%cOTPs are logged in the server console for testing purposes.', 'color: orange;');
console.log('%c⚠️ NOT FOR PRODUCTION USE ⚠️', 'color: orange; font-size: 16px; font-weight: bold;');

/**
 * Initialize reCAPTCHA (dummy function for compatibility)
 */
export const initializeRecaptcha = (elementId: string) => {
  console.log('📱 Prototype Mode: No reCAPTCHA needed');
  return null;
};

/**
 * Send OTP to phone number via backend
 */
export const sendOTP = async (phoneNumber: string) => {
  try {
    // Test user bypass
    if (phoneNumber === '+919876543210') {
      console.log('🧪 TEST USER MODE: Using test phone number');
      console.log('✅ Test OTP: 123456');
      localStorage.setItem('tempPhone', phoneNumber);
      localStorage.setItem('testUserMode', 'true');
      return { success: true, message: 'Test OTP is 123456' };
    }

    console.log(`📱 Sending OTP to ${phoneNumber}...`);
    console.log('⚠️ PROTOTYPE: Check server terminal/logs for OTP');
    
    const response = await api.post('/auth/send-otp', {
      phone: phoneNumber
    });

    console.log('✅ OTP sent successfully!');
    console.log('🔍 Check your server console/terminal for the OTP code');
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Send OTP error:', error);
    throw new Error(error.response?.data?.message || 'Failed to send OTP');
  }
};

/**
 * Verify OTP and login
 */
export const verifyOTP = async (otp: string) => {
  try {
    const phone = localStorage.getItem('tempPhone');
    if (!phone) {
      throw new Error('Phone number not found. Please request OTP again.');
    }

    // Test user bypass
    const isTestUser = localStorage.getItem('testUserMode') === 'true';
    if (isTestUser && phone === '+919876543210') {
      if (otp === '123456') {
        console.log('🧪 TEST USER MODE: Login successful');
        
        // Create test user data
        const testUserData = {
          success: true,
          data: {
            token: 'test_token_' + Date.now(),
            user: {
              _id: 'test_user_id',
              userId: 'test_user_id',
              name: 'Test User',
              phone: phone,
              email: 'testuser@example.com',
              role: 'citizen'
            }
          }
        };

        // Store test user data
        localStorage.setItem('token', testUserData.data.token);
        localStorage.setItem('user', JSON.stringify(testUserData.data.user));
        localStorage.removeItem('tempPhone');
        localStorage.removeItem('testUserMode');

        console.log('✅ Test user logged in successfully!');
        return testUserData;
      } else {
        throw new Error('Invalid test OTP. Use 123456');
      }
    }

    console.log(`🔐 Verifying OTP for ${phone}...`);
    
    const response = await api.post('/auth/verify-otp', {
      phone,
      otp
    });

    // Store JWT token
    localStorage.setItem('token', response.data.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.data.user));
    localStorage.removeItem('tempPhone');

    console.log('✅ Login successful!');
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Verify OTP error:', error);
    throw new Error(error.response?.data?.message || 'Invalid OTP');
  }
};

/**
 * DEV MODE: Direct login without Firebase (for testing)
 * Use this when Firebase is not configured
 */
export const loginDev = async (phoneNumber: string, name?: string) => {
  try {
    // Store phone temporarily for OTP verification
    localStorage.setItem('tempPhone', phoneNumber);
    
    const response = await api.post('/auth/login', {
      phone: phoneNumber,
      name: name || 'Test User',
      email: `${phoneNumber}@dev.com`
    });

    // Store JWT token
    localStorage.setItem('token', response.data.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.data.user));
    localStorage.removeItem('tempPhone');

    return response.data;
  } catch (error: any) {
    console.error('Login failed:', error);
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

/**
 * Get current user from backend
 */
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (data: { name?: string; phone?: string }) => {
  try {
    const response = await api.put('/auth/profile', data);
    localStorage.setItem('user', JSON.stringify(response.data.data.user));
    return response.data;
  } catch (error: any) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

/**
 * Logout user
 */
export const logout = async () => {
  try {
    await api.post('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch (error: any) {
    console.error('Error logging out:', error);
    // Clear local storage even if API call fails
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

/**
 * Get stored user data
 */
export const getStoredUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export default api;

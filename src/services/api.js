import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Alert} from 'react-native';

const API_URL = 'http://192.168.1.8:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track auth state
let isRefreshingAuth = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({resolve, reject}) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor with better token handling
api.interceptors.request.use(
  async config => {
    try {
      // Always get fresh token from storage
      const token = await AsyncStorage.getItem('token');
      const user = await AsyncStorage.getItem('user');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('API: Adding fresh auth token to request');
      } else {
        console.log('API: No token found in storage');
      }

      // Add user context for debugging
      if (user) {
        const userData = JSON.parse(user);
        console.log(
          `API: Request by user ${userData.id} (${userData.user_type})`,
        );
      }
    } catch (error) {
      console.error('Error setting auth token:', error);
    }
    return config;
  },
  error => Promise.reject(error),
);

// Response interceptor with retry logic
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshingAuth) {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({resolve, reject});
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshingAuth = true;

      try {
        console.log('API: Got 401, attempting to refresh auth...');

        // Check if we have valid stored credentials
        const token = await AsyncStorage.getItem('token');
        const userString = await AsyncStorage.getItem('user');

        if (token && userString) {
          // Try to validate the token
          const validateResponse = await fetch(
            `${API_URL}/auth/validate-token`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            },
          );

          if (validateResponse.status === 200) {
            console.log('API: Token still valid, retrying request');
            processQueue(null, token);
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          }
        }

        // Token is invalid - clear auth and redirect to login
        console.log('API: Token invalid, clearing auth state');
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('userType');

        processQueue(new Error('Authentication failed'), null);

        // Show alert to user
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [{text: 'OK'}],
        );

        return Promise.reject(error);
      } catch (refreshError) {
        processQueue(refreshError, null);
        console.error('API: Error during auth refresh:', refreshError);
        return Promise.reject(error);
      } finally {
        isRefreshingAuth = false;
      }
    }

    return Promise.reject(error);
  },
);

// Export the enhanced api instance
export default api;

// Auth services
export const authService = {
  login: async (email, password, userType) => {
    try {
      const response = await api.post('/auth/login', {
        email: email.toLowerCase(),
        password,
        userType,
      });

      if (response.data.success && response.data.token) {
        await AsyncStorage.setItem('token', response.data.token);
        // Store user data if available
        if (response.data.user) {
          await AsyncStorage.setItem(
            'user',
            JSON.stringify(response.data.user),
          );
        }
      }
      return response.data;
    } catch (error) {
      throw error.response
        ? error.response.data
        : {success: false, message: 'Network error'};
    }
  },

  register: async (userData, userType) => {
    try {
      const sanitizedData = Object.fromEntries(
        Object.entries(userData).map(([key, value]) =>
          typeof value === 'string' ? [key, value.trim()] : [key, value],
        ),
      );

      if (sanitizedData.email) {
        sanitizedData.email = sanitizedData.email.toLowerCase();
      }

      const endpoint =
        userType === 'doctor' ? '/auth/doctor-signup' : '/auth/signup';

      console.log('Sending registration data:', endpoint, sanitizedData);
      const response = await api.post(endpoint, sanitizedData);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);

      if (error.response && error.response.data) {
        throw error.response.data;
      } else if (error.message && error.message.includes('Network Error')) {
        throw {
          success: false,
          message:
            'Cannot connect to server. Please check your internet connection.',
        };
      } else {
        throw {
          success: false,
          message: error.message || 'Unknown error occurred',
        };
      }
    }
  },

  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      // Clear stored data
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      return response.data;
    } catch (error) {
      // Even if API call fails, clear local storage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      throw error.response
        ? error.response.data
        : {success: false, message: 'Network error'};
    }
  },

  resetPassword: async email => {
    try {
      const response = await api.post('/auth/reset-password', {
        email: email.toLowerCase(),
      });
      return response.data;
    } catch (error) {
      throw error.response
        ? error.response.data
        : {success: false, message: 'Network error'};
    }
  },

  updateUserLocation: async (userId, location) => {
    try {
      const locationData = {
        userId: userId,
        latitude: location.latitude,
        longitude: location.longitude,
        last_location_update:
          location.last_location_update || new Date().toISOString(),
      };

      const response = await api.post('/auth/update-location', locationData);
      return response.data;
    } catch (error) {
      console.error('API Error updating location:', error);
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  getUserProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  updateUserProfile: async profileData => {
    try {
      const response = await api.put('/auth/profile', profileData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  // Add a method to check auth status
  checkAuthStatus: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        return {isAuthenticated: false};
      }

      const response = await api.get('/auth/validate-token');
      return {
        isAuthenticated: response.data.success,
        user: response.data.user,
      };
    } catch (error) {
      return {isAuthenticated: false};
    }
  },
};

// Doctors services
export const doctorService = {
  getAllDoctors: async () => {
    try {
      const response = await api.get('/doctors');
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  getDoctorById: async id => {
    try {
      const response = await api.get(`/doctors/${id}`);
      console.log('Doctor data retrieved:', response.data.doctor);
      return response.data;
    } catch (error) {
      console.error('Error fetching doctor details:', error);
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  updateDoctorProfile: async data => {
    try {
      const response = await api.put('/doctors/profile', data);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  updateAvailability: async data => {
    try {
      const response = await api.put('/doctors/availability', data);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  checkOnboardingStatus: async doctorId => {
    try {
      // Fixed: Accept doctorId as parameter instead of using undefined 'user'
      if (!doctorId) {
        // Get doctor ID from AsyncStorage if not provided
        const userString = await AsyncStorage.getItem('user');
        if (!userString) {
          throw new Error('User not authenticated');
        }
        const userData = JSON.parse(userString);
        doctorId = userData.id;
      }

      const response = await api.get(`/doctors/onboarding-status/${doctorId}`);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  completeOnboarding: async onboardingData => {
    try {
      const response = await api.post(
        '/doctors/complete-onboarding',
        onboardingData,
      );
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error('Network error');
    }
  },
};

// Appointments services
export const appointmentService = {
  getDoctorAppointments: async (doctorId = null) => {
    try {
      let finalDoctorId = doctorId;

      // If no doctorId provided, get from AsyncStorage
      if (!finalDoctorId) {
        const userString = await AsyncStorage.getItem('user');
        if (!userString) {
          throw new Error('User not authenticated');
        }

        const userData = JSON.parse(userString);
        if (!userData || !userData.id) {
          throw new Error('User ID not found');
        }
        finalDoctorId = userData.id;
      }

      console.log('Fetching appointments for doctor ID:', finalDoctorId);

      const response = await api.get(
        `/appointments/doctor?doctor_id=${finalDoctorId}`,
      );

      console.log('Response status:', response.status);
      console.log(
        'Appointments found:',
        response.data?.appointments?.length || 0,
      );

      return response.data;
    } catch (error) {
      console.error('Error in getDoctorAppointments:', error);
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  getPatientAppointments: async () => {
    try {
      const userString = await AsyncStorage.getItem('user');
      if (!userString) {
        throw new Error('User not authenticated');
      }

      const userData = JSON.parse(userString);
      if (!userData || !userData.id) {
        throw new Error('User ID not found');
      }

      // Add debugging information
      console.log('Fetching appointments for patient ID:', userData.id);

      // Ensure token is included
      const token = await AsyncStorage.getItem('token');
      console.log('Token status:', token ? 'Present' : 'Missing');

      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Make the API call - Don't send the user_id in query, rely on auth header
      const response = await api.get(`/appointments/patient`);

      console.log(
        `Received ${
          response.data?.appointments?.length || 0
        } appointments from server`,
      );
      return response.data;
    } catch (error) {
      console.error('Error in getPatientAppointments:', error);
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  bookAppointment: async appointmentData => {
    try {
      const response = await api.post('/appointments', appointmentData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  updateAppointmentStatus: async (id, status) => {
    try {
      const response = await api.put(`/appointments/${id}/status`, {status});
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  cancelAppointment: async id => {
    try {
      const response = await api.put(`/appointments/${id}/cancel`);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  getAppointmentById: async appointmentId => {
    try {
      const response = await api.get(`/appointments/${appointmentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching appointment details:', error);
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  getAvailableSlots: async (doctorId, date) => {
    try {
      // Ensure we have auth before making the call
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const formattedDate = date.toISOString().split('T')[0];
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      console.log('API: Fetching available slots for:', {
        doctorId,
        date: formattedDate,
        timezone: userTimezone,
      });

      // Add cache-busting parameter to ensure fresh data
      const cacheBuster = Date.now();

      const response = await api.get(
        `/appointments/available-slots/${doctorId}?date=${formattedDate}&timezone=${userTimezone}&_=${cacheBuster}`,
      );

      console.log('API: Got booked slots response:', {
        bookedSlots: response.data.bookedSlots,
        totalBookings: response.data.totalBookings,
        requestedBy: response.data.requestedBy,
        timestamp: response.data.timestamp,
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching available slots:', error);
      if (error.message === 'Not authenticated') {
        throw new Error('Please log in again to continue');
      }
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  approveAppointment: async (
    appointmentId,
    approved,
    rejectionReason = null,
  ) => {
    try {
      console.log(
        `${approved ? 'Approving' : 'Rejecting'} appointment ${appointmentId}`,
      );

      const response = await api.put(`/appointments/${appointmentId}/approve`, {
        approved,
        notes: rejectionReason,
      });

      console.log('Approval response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error approving/rejecting appointment:', error);
      throw error.response ? error.response.data : new Error('Network error');
    }
  },
};

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://careconnect-server-teal.vercel.app/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  async config => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token && token.length > 10) {
        console.log('API: Adding auth token to request');
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.log('API: No valid token found');
        // Try to refresh the session if no valid token
        await refreshSession();
      }
    } catch (error) {
      console.error('API: Error getting token', error);
    }
    return config;
  },
  error => Promise.reject(error),
);

// Add this new function to check and refresh the session
const refreshSession = async () => {
  try {
    console.log('Attempting to refresh session...');
    const userString = await AsyncStorage.getItem('user');

    // If we have user data but no valid token, try to refresh
    if (userString) {
      const userData = JSON.parse(userString);
      const userTypeData = await AsyncStorage.getItem('userType');

      if (userData && userData.email && userTypeData) {
        console.log('Found stored user data, refreshing session...');
        // We can't actually refresh the token without the password,
        // but we can at least log this information for debugging
        console.log(
          `User would need to re-authenticate: ${userData.email} (${userTypeData})`,
        );
      }
    }
  } catch (error) {
    console.error('Error refreshing session:', error);
  }
};

// Add API interceptors for better error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  },
);

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
      return response.data;
    } catch (error) {
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
      console.log(
        'Token status:',
        (await AsyncStorage.getItem('token')) ? 'Present' : 'Missing',
      );

      const response = await api.get(
        `/appointments/patient?user_id=${userData.id}`,
      );

      // Add more detailed logging
      console.log(
        `Received ${
          response.data?.appointments?.length || 0
        } appointments from server`,
      );
      if (response.data?.appointments?.length > 0) {
        console.log('First appointment:', {
          id: response.data.appointments[0].id,
          date: response.data.appointments[0].appointment_date,
          status: response.data.appointments[0].status,
        });
      }

      return response.data;
    } catch (error) {
      console.error('Error in getPatientAppointments:', error);
      console.error(
        'Network status:',
        error.response ? `HTTP ${error.response.status}` : 'No response',
      );
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
      const formattedDate = date.toISOString().split('T')[0];
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const response = await api.get(
        `/appointments/available-slots/${doctorId}?date=${formattedDate}&timezone=${userTimezone}`,
      );

      console.log(
        'API: Got booked slots from server:',
        response.data.bookedSlots,
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching available slots:', error);
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  approveAppointment: async (appointmentId, approved, rejectionReason = null) => {
    try {
      console.log(`${approved ? 'Approving' : 'Rejecting'} appointment ${appointmentId}`);
      
      const response = await api.put(`/appointments/${appointmentId}/approve`, {
        approved,
        notes: rejectionReason
      });
      
      console.log('Approval response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error approving/rejecting appointment:', error);
      throw error.response ? error.response.data : new Error('Network error');
    }
  },
};

export default api;

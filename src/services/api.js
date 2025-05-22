import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.8:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // Increased timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Update the request interceptor:

// Add request interceptor to add auth token
api.interceptors.request.use(
  async config => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token && token.length > 10) {
        // Basic validation that it's a real token
        console.log('API: Adding auth token to request');
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.log('API: No valid token found');
      }
    } catch (error) {
      console.error('API: Error getting token', error);
    }
    return config;
  },
  error => Promise.reject(error),
);

// Add API interceptors for better error handling
api.interceptors.response.use(
  response => response,
  error => {
    // Log the error for debugging
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  },
);

// Auth services
export const authService = {
  login: async (email, password, userType) => {
    try {
      const response = await api.post('/auth/login', {
        email: email.toLowerCase(), // Always lowercase email for consistency
        password,
        userType,
      });

      if (response.data.success && response.data.token) {
        await AsyncStorage.setItem('token', response.data.token);
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
      // Clean and sanitize data
      const sanitizedData = Object.fromEntries(
        Object.entries(userData).map(([key, value]) =>
          typeof value === 'string' ? [key, value.trim()] : [key, value],
        ),
      );

      // Convert email to lowercase
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
      return response.data;
    } catch (error) {
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
      // Make sure we're sending the userId with the correct parameter name
      const locationData = {
        userId: userId, // This needs to match what the server expects
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

  checkOnboardingStatus: async () => {
    try {
      const response = await api.get(`/doctors/onboarding-status/${user.id}`);
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
      // Get the user data from AsyncStorage if doctorId is not provided
      if (!doctorId) {
        const userString = await AsyncStorage.getItem('user');
        if (!userString) {
          throw new Error('User not authenticated');
        }

        const userData = JSON.parse(userString);
        if (!userData || !userData.id) {
          throw new Error('Doctor ID not found');
        }
        doctorId = userData.id;
      }

      const response = await api.get(
        `/appointments/doctor?doctor_id=${doctorId}`,
      );
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  getPatientAppointments: async () => {
    try {
      // Get the user data from AsyncStorage
      const userString = await AsyncStorage.getItem('user');
      if (!userString) {
        throw new Error('User not authenticated');
      }

      const userData = JSON.parse(userString);
      if (!userData || !userData.id) {
        throw new Error('User ID not found');
      }

      // Explicitly add the user_id as a query parameter
      const response = await api.get(
        `/appointments/patient?user_id=${userData.id}`,
      );
      console.log('Fetching appointments for user:', userData.id);
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
      // Format date as YYYY-MM-DD
      const formattedDate = date.toISOString().split('T')[0];

      // Include timezone info in the request
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
};

export default api;

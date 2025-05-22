import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.8:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

// Auth services
export const authService = {
  login: async (email, password, userType) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
        userType,
      });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  register: async (userData, userType) => {
    try {
      const endpoint =
        userType === 'doctor' ? '/auth/doctor-signup' : '/auth/signup';
      const response = await api.post(endpoint, userData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  resetPassword: async email => {
    try {
      const response = await api.post('/auth/reset-password', {email});
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
};

// Appointments services
export const appointmentService = {
  getDoctorAppointments: async () => {
    try {
      const response = await api.get('/appointments/doctor');
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error('Network error');
    }
  },

  getPatientAppointments: async () => {
    try {
      const response = await api.get('/appointments/patient');
      return response.data;
    } catch (error) {
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
};

export default api;

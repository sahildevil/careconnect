import React, {createContext, useState, useContext, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {authService} from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null); // 'patient' or 'doctor'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is logged in on app start
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const tokenData = await AsyncStorage.getItem('token');
      const userTypeData = await AsyncStorage.getItem('userType');

      if (userData && tokenData) {
        setUser(JSON.parse(userData));
        setUserType(userTypeData);
      }
    } catch (error) {
      console.error('Error loading user data', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, type) => {
    try {
      setError(null);
      setLoading(true);

      const response = await authService.login(email, password, type);

      if (response.success) {
        const userData = response.user;
        const token = response.session.access_token;

        // Store user data and token
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('userType', type);

        setUser(userData);
        setUserType(type);
        return true;
      }
    } catch (error) {
      setError(error.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (userData, type) => {
    try {
      setError(null);
      setLoading(true);

      const response = await authService.register(userData, type);

      if (response.success) {
        return true;
      }
    } catch (error) {
      setError(error.message || 'Registration failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);

      // Call logout API
      await authService.logout();

      // Clear storage
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userType');

      setUser(null);
      setUserType(null);
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async email => {
    try {
      setError(null);
      setLoading(true);

      // Call reset password API
      const response = await authService.resetPassword(email);

      if (response.success) {
        return true;
      }
    } catch (error) {
      setError(error.message || 'Reset password failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    userType,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    signUp,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

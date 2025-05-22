import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {authService, doctorService} from '../services/api';

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

  // Update the checkDoctorOnboarding function
  const checkDoctorOnboarding = useCallback(async userData => {
    if (userData?.user_type === 'doctor') {
      try {
        // Check if the profile data exists and if onboarding_complete is false
        // This handles both cases: no profile data or profile with onboarding_complete=false
        if (
          !userData.profile ||
          userData.profile.onboarding_complete === false
        ) {
          return true; // Needs onboarding
        }
        return false; // Doesn't need onboarding
      } catch (error) {
        console.error('Error checking doctor onboarding status:', error);
        return false;
      }
    }
    return false;
  }, []);

  // Update the login function
  const login = async (email, password, userType) => {
    try {
      setLoading(true);
      const response = await authService.login(email, password, userType);

      if (response.success) {
        const userData = response.user;

        // Check if doctor needs onboarding before setting user state
        if (userData.user_type === 'doctor') {
          const needsOnboarding = await checkDoctorOnboarding(userData);

          // Still set user data in state, but return special flag for navigation
          setUser(userData);
          setUserType(userData.user_type);

          if (needsOnboarding) {
            AsyncStorage.setItem('user', JSON.stringify(userData));
            AsyncStorage.setItem('userType', userData.user_type);
            setLoading(false);
            return {success: true, needsOnboarding: true};
          }
        }

        // For patients or doctors who don't need onboarding
        setUser(userData);
        setUserType(userData.user_type);
        AsyncStorage.setItem('user', JSON.stringify(userData));
        AsyncStorage.setItem('userType', userData.user_type);
      }

      setLoading(false);
      return response;
    } catch (error) {
      setLoading(false);
      throw error;
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

  // Add a function to update the user data
  const updateUser = userData => {
    setUser(userData);
    AsyncStorage.setItem('user', JSON.stringify(userData));
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
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

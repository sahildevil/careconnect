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
  const API_URL = 'http://192.168.1.8:3000/api';
  useEffect(() => {
    // Check if user is logged in on app start
    loadUserFromStorage();
  }, []);

  // Update the loadUserFromStorage function
  const loadUserFromStorage = async () => {
    try {
      console.log('Loading user data from storage...');
      const userData = await AsyncStorage.getItem('user');
      const userTypeData = await AsyncStorage.getItem('userType');
      const tokenData = await AsyncStorage.getItem('token');

      console.log('User data from storage:', userData ? 'exists' : 'missing');
      console.log('User type from storage:', userTypeData);
      console.log('Token from storage:', tokenData ? 'exists' : 'missing');

      // Check if we have all required data
      if (userData && userTypeData && tokenData) {
        const parsedUserData = JSON.parse(userData);

        // Validate the token by making a test API call
        try {
          const isValid = await validateToken(tokenData);
          if (isValid) {
            setUser(parsedUserData); // This should trigger isAuthenticated to become true
            setUserType(userTypeData);
            console.log(
              'User session restored successfully:',
              parsedUserData.id,
            );

            // Force isAuthenticated to update immediately
            return true;
          } else {
            // If token validation fails, clear stored data
            console.log('Stored token is invalid, clearing session data');
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('userType');
          }
        } catch (error) {
          console.error('Error validating token:', error);
        }
      } else {
        console.log('Missing required session data');
      }
      return false;
    } catch (error) {
      console.error('Error loading user data:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Replace the validateToken function
  const validateToken = async token => {
    try {
      console.log('Validating token...');

      if (!token || token.length < 10) {
        console.log('Invalid token format');
        return false;
      }

      // Get the user data we already have
      const userString = await AsyncStorage.getItem('user');
      if (!userString) {
        console.log('No user data found for validation');
        return false;
      }

      const userData = JSON.parse(userString);

      // Try fetching user profile with ID as a validation test
      const response = await fetch(`${API_URL}/auth/profile/${userData.id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        console.log('Token valid, profile retrieved successfully');

        // Ensure user data is up to date with latest from server
        if (data.success && data.user) {
          // Update local storage with latest user data
          await AsyncStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
        } else {
          // Use existing user data if the API doesn't return updated user info
          setUser(userData);
        }
        return true;
      }

      // Fallback validation - try a simpler endpoint
      try {
        const fallbackResponse = await fetch(`${API_URL}/auth/validate-token`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (fallbackResponse.status === 200) {
          console.log('Token validated using fallback endpoint');
          setUser(userData);
          return true;
        }
      } catch (fallbackError) {
        console.log('Fallback validation also failed');
      }

      console.log('Token validation failed with status:', response.status);
      return false;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  // Update the checkDoctorOnboarding function
  const checkDoctorOnboarding = useCallback(async userData => {
    if (userData?.user_type === 'doctor') {
      try {
        // Check if the profile data exists and if onboarding_complete is false
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

        // Store the token securely
        if (response.token) {
          await AsyncStorage.setItem('token', response.token);
        }

        // Save user data to AsyncStorage
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await AsyncStorage.setItem('userType', userData.user_type);

        console.log('User data saved to storage after login:', userData.id);

        // Check if doctor needs onboarding before setting user state
        if (userData.user_type === 'doctor') {
          const needsOnboarding = await checkDoctorOnboarding(userData);

          // Set user data in state
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

      console.log('User data cleared from storage after logout');

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
    console.log('Updated user data in storage:', userData.id);
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

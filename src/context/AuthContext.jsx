import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {authService, doctorService} from '../services/api';
import {notificationService} from '../services/notifications';
import {AppState} from 'react-native';

const AuthContext = createContext();

export const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const API_URL = 'http://192.168.1.5:3000/api';

  useEffect(() => {
    // Initial load
    loadUserFromStorage();

    // Listen for app state changes
    const handleAppStateChange = nextAppState => {
      console.log('AppState changed to:', nextAppState);

      if (nextAppState === 'active' && isInitialized) {
        // App became active - refresh auth state
        console.log('App became active, refreshing auth state...');
        refreshAuthState();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription?.remove();
    };
  }, [isInitialized]);

  // Add a function to refresh auth state when app becomes active
  const refreshAuthState = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const tokenData = await AsyncStorage.getItem('token');
      const userTypeData = await AsyncStorage.getItem('userType');

      console.log('Refreshing auth state:', {
        hasUser: !!userData,
        hasToken: !!tokenData,
        hasUserType: !!userTypeData,
      });

      if (userData && tokenData && userTypeData) {
        const parsedUserData = JSON.parse(userData);

        // Validate token is still good
        const isValid = await validateToken(tokenData);

        if (isValid) {
          console.log('Auth state refreshed successfully');
          // Ensure state is properly set
          if (!user || user.id !== parsedUserData.id) {
            setUser(parsedUserData);
            setUserType(userTypeData);
            console.log('User state updated after refresh');
          }
        } else {
          console.log('Token validation failed during refresh');
          await handleAuthFailure();
        }
      } else {
        console.log('Missing auth data during refresh');
        await handleAuthFailure();
      }
    } catch (error) {
      console.error('Error refreshing auth state:', error);
    }
  };

  // Handle authentication failure
  const handleAuthFailure = async () => {
    console.log('Handling auth failure - clearing state');
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('userType');
    setUser(null);
    setUserType(null);
  };

  // Update loadUserFromStorage with better error handling
  const loadUserFromStorage = async () => {
    try {
      setLoading(true);
      console.log('Loading user data from storage...');

      const userData = await AsyncStorage.getItem('user');
      const userTypeData = await AsyncStorage.getItem('userType');
      const tokenData = await AsyncStorage.getItem('token');

      console.log('Storage check:', {
        hasUser: !!userData,
        hasUserType: !!userTypeData,
        hasToken: !!tokenData,
      });

      if (userData && userTypeData && tokenData) {
        const parsedUserData = JSON.parse(userData);

        // Validate the token
        const isValid = await validateToken(tokenData);

        if (isValid) {
          setUser(parsedUserData);
          setUserType(userTypeData);
          console.log('User session restored successfully:', parsedUserData.id);

          // Register device for notifications
          try {
            await notificationService.onUserAuthenticated();
          } catch (notifError) {
            console.error('Notification registration failed:', notifError);
          }

          setIsInitialized(true);
          return true;
        } else {
          console.log('Token validation failed - clearing stored data');
          await handleAuthFailure();
        }
      } else {
        console.log('Incomplete stored session data');
      }

      setIsInitialized(true);
      return false;
    } catch (error) {
      console.error('Error loading user from storage:', error);
      setIsInitialized(true);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Improved token validation with retry logic
  const validateToken = async (token, retryCount = 0) => {
    try {
      console.log(`Validating token (attempt ${retryCount + 1})...`);

      if (!token || token.length < 10) {
        console.log('Invalid token format');
        return false;
      }

      // Try main validation endpoint
      const response = await fetch(`${API_URL}/auth/validate-token`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      if (response.status === 200) {
        const data = await response.json();
        console.log('Token validation successful');

        // Update user data if provided by server
        if (data.success && data.user) {
          const currentUserString = await AsyncStorage.getItem('user');
          const currentUser = currentUserString
            ? JSON.parse(currentUserString)
            : null;

          // Only update if user data has changed
          if (!currentUser || currentUser.id !== data.user.id) {
            console.log('Updating user data from server');
            await AsyncStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
          }
        }

        return true;
      } else if (response.status === 401) {
        console.log('Token is invalid or expired (401)');
        return false;
      } else {
        console.log(`Token validation failed with status: ${response.status}`);

        // Retry once for network issues
        if (retryCount === 0) {
          console.log('Retrying token validation...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return await validateToken(token, 1);
        }

        return false;
      }
    } catch (error) {
      console.error('Token validation error:', error);

      // Retry once for network errors
      if (
        retryCount === 0 &&
        (error.message.includes('network') || error.message.includes('timeout'))
      ) {
        console.log('Network error, retrying validation...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await validateToken(token, 1);
      }

      return false;
    }
  };

  // Update login function
  const login = async (email, password, userType) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.login(email, password, userType);

      if (response.success) {
        const userData = response.user;

        // Store everything before setting state
        if (response.token) {
          await AsyncStorage.setItem('token', response.token);
        }
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await AsyncStorage.setItem('userType', userData.user_type);

        console.log('User data saved after login:', userData.id);

        // Set state
        setUser(userData);
        setUserType(userData.user_type);

        // Handle doctor onboarding
        if (userData.user_type === 'doctor') {
          const needsOnboarding = await checkDoctorOnboarding(userData);

          if (needsOnboarding) {
            setLoading(false);
            return {success: true, needsOnboarding: true};
          }
        }

        // Register for notifications
        try {
          await notificationService.onUserAuthenticated();
        } catch (notifError) {
          console.error('Notification registration failed:', notifError);
        }
      }

      setLoading(false);
      return response;
    } catch (error) {
      setLoading(false);
      setError(error.message || 'Login failed');
      throw error;
    }
  };

  // Update logout function
  const logout = async () => {
    try {
      setLoading(true);

      // Notify notification service
      try {
        await notificationService.onUserLoggedOut();
      } catch (notifError) {
        console.error('Notification logout failed:', notifError);
      }

      // Call logout API
      try {
        await authService.logout();
      } catch (apiError) {
        console.error('API logout failed:', apiError);
      }

      // Clear everything
      await handleAuthFailure();

      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkDoctorOnboarding = useCallback(async userData => {
    if (userData?.user_type === 'doctor') {
      try {
        if (
          !userData.profile ||
          userData.profile.onboarding_complete === false
        ) {
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error checking doctor onboarding status:', error);
        return false;
      }
    }
    return false;
  }, []);

  const signUp = async (userData, type) => {
    try {
      setError(null);
      setLoading(true);

      const response = await authService.register(userData, type);
      return response.success;
    } catch (error) {
      setError(error.message || 'Registration failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async email => {
    try {
      setError(null);
      setLoading(true);

      const response = await authService.resetPassword(email);
      return response.success;
    } catch (error) {
      setError(error.message || 'Reset password failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = userData => {
    setUser(userData);
    AsyncStorage.setItem('user', JSON.stringify(userData));
    console.log('User data updated:', userData.id);
  };

  const value = {
    user,
    userType,
    loading,
    error,
    isAuthenticated: !!user && !!userType,
    isInitialized,
    login,
    signUp,
    logout,
    resetPassword,
    updateUser,
    refreshAuthState, // Expose this for manual refresh
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

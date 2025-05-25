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
  //const API_URL = 'http://192.168.1.8:3000/api'; // Using teammate's IP
  const API_URL = 'https://careconnect-server-teal.vercel.app/api'; // Using Vercel deployment
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

  // Handle authentication failure - Enhanced with FCM token cleanup
  const handleAuthFailure = async () => {
    console.log('Handling auth failure - clearing state');
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userType');
      await AsyncStorage.removeItem('fcmToken'); // Clear FCM token
    } catch (error) {
      console.error('Error clearing storage during auth failure:', error);
    }
    
    setUser(null);
    setUserType(null);
    setError(null);
  };

  // Update loadUserFromStorage with better error handling and doctor data fetching
  const loadUserFromStorage = async () => {
    try {
      setLoading(true);
      console.log('Loading user data from storage...');

      const [userData, tokenData, userTypeData] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('userType'),
      ]);

      console.log('Storage check:', {
        hasUser: !!userData,
        hasUserType: !!userTypeData,
        hasToken: !!tokenData,
      });

      if (userData && userTypeData && tokenData) {
        let parsedUserData = JSON.parse(userData);

        // Validate the token
        const isValid = await validateToken(tokenData);

        if (isValid) {
          // If user is a doctor, refresh doctor data to get latest avatar_url
          if (userTypeData === 'doctor' && parsedUserData.id) {
            try {
              const doctorResponse = await doctorService.getDoctorById(parsedUserData.id);
              if (doctorResponse.success && doctorResponse.doctor) {
                // Update with latest doctor data including avatar_url
                parsedUserData = {
                  ...parsedUserData,
                  ...doctorResponse.doctor,
                  user_type: userTypeData
                };
                
                // Update stored data with latest info
                await AsyncStorage.setItem('user', JSON.stringify(parsedUserData));
              }
            } catch (doctorError) {
              console.log('Could not refresh doctor data:', doctorError);
            }
          }

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
      await handleAuthFailure();
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

      // Add request ID for tracking
      const requestId = Math.random().toString(36).substr(2, 9);

      // Try main validation endpoint with unique request ID
      const response = await fetch(`${API_URL}/auth/validate-token`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
        timeout: 10000,
      });

      console.log(
        `Token validation response status: ${response.status} (Request: ${requestId})`,
      );

      if (response.status === 200) {
        const data = await response.json();
        console.log(
          `Token validation successful (Request: ${
            data.requestId || requestId
          })`,
        );

        // Update user data if provided by server
        if (data.success && data.user) {
          const currentUserString = await AsyncStorage.getItem('user');
          const currentUser = currentUserString
            ? JSON.parse(currentUserString)
            : null;

          // Only update if user data has changed or doesn't exist
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
      } else if (response.status === 404) {
        console.log(
          'User profile not found on server (404) - this usually means the user was deleted or session expired',
        );
        return false;
      } else {
        console.log(`Token validation failed with status: ${response.status}`);

        // Only retry for network-related errors, not auth errors
        if (
          retryCount === 0 &&
          (response.status >= 500 || response.status === 0)
        ) {
          console.log('Server error, retrying token validation...');
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
        (error.message.includes('network') ||
          error.message.includes('timeout') ||
          error.message.includes('fetch'))
      ) {
        console.log('Network error, retrying validation...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await validateToken(token, 1);
      }

      return false;
    }
  };

  // Enhanced login function with doctor data fetching and notification registration
  const login = async (email, password, selectedUserType) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.login(email, password, selectedUserType);

      if (response.success) {
        let userData = response.user;
        
        // If user is a doctor, fetch additional doctor data including avatar_url
        if (selectedUserType === 'doctor' && userData.id) {
          try {
            const doctorResponse = await doctorService.getDoctorById(userData.id);
            if (doctorResponse.success && doctorResponse.doctor) {
              // Merge doctor data with user data, prioritizing doctor table data
              userData = {
                ...userData,
                ...doctorResponse.doctor,
                user_type: selectedUserType // Ensure user_type is preserved
              };
            }
          } catch (doctorError) {
            console.log('Could not fetch doctor data:', doctorError);
            // Continue with basic user data if doctor fetch fails
          }
        }

        // Store everything before setting state
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await AsyncStorage.setItem('token', response.token);
        await AsyncStorage.setItem('userType', selectedUserType);

        console.log('User data saved after login:', userData.id);

        // Set state
        setUser(userData);
        setUserType(selectedUserType);

        // Handle doctor onboarding
        if (userData.user_type === 'doctor') {
          const needsOnboarding = await checkDoctorOnboarding(userData);

          if (needsOnboarding) {
            setLoading(false);
            return {success: true, needsOnboarding: true};
          }
        }

        // Register for notifications after successful login
        try {
          console.log(`Registering notifications for user: ${userData.name} (${userData.id})`);
          await notificationService.onUserAuthenticated();
          console.log('Notification registration completed');
        } catch (notificationError) {
          console.error('Failed to register for notifications:', notificationError);
          // Don't fail login if notification registration fails
        }

        return { success: true, user: userData };
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error.message || 'Login failed. Please try again.';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Enhanced logout function with notification cleanup
  const logout = async () => {
    try {
      setLoading(true);

      // Get current user info for logging
      const currentUser = await AsyncStorage.getItem('user');
      const userName = currentUser ? JSON.parse(currentUser).name : 'Unknown';
      
      console.log(`Logging out user: ${userName}`);

      // Unregister device from notifications BEFORE clearing storage
      try {
        await notificationService.onUserLoggedOut();
        console.log('Notification cleanup completed');
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

      console.log(`User ${userName} logged out successfully`);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Profile picture upload function from teammate's code
  const uploadProfilePicture = async (imageUri) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user || user.user_type !== 'doctor') {
        throw new Error('Only doctors can upload profile pictures');
      }
      
      // Create a form data object to send the image
      const formData = new FormData();
      
      // Get file extension from URI
      const uriParts = imageUri.split('.');
      const fileExtension = uriParts[uriParts.length - 1];
      
      // Create a unique filename using the doctor's ID
      const fileName = `doctor_${user.id}_${Date.now()}.${fileExtension}`;
      
      // Add the image to form data
      formData.append('profilePicture', {
        uri: imageUri,
        name: fileName,
        type: `image/${fileExtension}`,
      });
      
      // Upload the image using doctorService
      const response = await doctorService.uploadProfilePicture(formData);
      
      if (response.success) {
        // Update user object with new avatar URL
        const updatedUser = {
          ...user,
          avatar_url: response.avatar_url
        };
        
        // Update local state and storage immediately
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        return {
          success: true,
          message: 'Profile picture updated successfully',
          avatar_url: response.avatar_url
        };
      } else {
        throw new Error(response.message || 'Failed to upload profile picture');
      }
      
    } catch (error) {
      setError(error.message || 'Failed to upload profile picture');
      return {
        success: false,
        message: error.message || 'Failed to upload profile picture'
      };
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
    uploadProfilePicture, // Add the new function to the context
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

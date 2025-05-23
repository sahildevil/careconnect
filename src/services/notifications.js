import messaging from '@react-native-firebase/messaging';
import notifee, {AndroidImportance} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import axios from 'axios';

const API_URL = 'http://192.168.1.5:3000/api';

const notificationApi = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
notificationApi.interceptors.request.use(
  async config => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error setting auth token:', error);
    }
    return config;
  },
  error => Promise.reject(error),
);

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.fcmToken = null;
  }

  // Initialize the service - but don't register token until authenticated
  async init() {
    try {
      // Only for Android
      if (Platform.OS !== 'android') {
        return false;
      }

      // Request permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('User has rejected notification permissions');
        return false;
      }

      // Get FCM token but don't register with server yet
      const token = await messaging().getToken();
      console.log('FCM token:', token);
      this.fcmToken = token;
      
      // Store token locally
      await AsyncStorage.setItem('fcmToken', token);

      // Register handlers
      this.registerMessageHandlers();
      
      this.isInitialized = true;
      console.log('Notification service initialized (token registration pending authentication)');

      return true;
    } catch (error) {
      console.error('Notification initialization failed:', error);
      return false;
    }
  }

  // Register FCM token with server - call this after user authentication
  async registerDeviceToken() {
    try {
      // Check if user is authenticated
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No auth token found, skipping device registration');
        return false;
      }

      // Use stored FCM token or get a new one
      let fcmToken = this.fcmToken || await messaging().getToken();
      
      if (!fcmToken) {
        console.error('No FCM token available for registration');
        return false;
      }

      console.log('Registering device token with server...');

      // Listen for token refresh
      return messaging().onTokenRefresh(async newToken => {
        console.log('FCM token refreshed:', newToken);
        await AsyncStorage.setItem('fcmToken', newToken);
        
        // Try to register the new token if user is authenticated
        await this.registerDeviceTokenIfAuthenticated();
      });
    } catch (error) {
      console.error('Failed to get FCM token:', error);
    }
  }

  // Register device token only if user is authenticated
  async registerDeviceTokenIfAuthenticated() {
    try {
      // Check if user is authenticated
      const authToken = await AsyncStorage.getItem('token');
      if (!authToken) {
        console.log('User not authenticated, skipping device registration');
        return;
      }

      // Get stored FCM token
      const fcmToken = await AsyncStorage.getItem('fcmToken');
      if (!fcmToken) {
        console.log('No FCM token available');
        return;
      }

      // Register with server
      const response = await notificationApi.post(
        '/notifications/register-device',
        {
          token: fcmToken,
          device_type: Platform.OS,
        },
      );

      console.log('Device registered for notifications:', response.data);

      // Listen for token refresh
      const unsubscribe = messaging().onTokenRefresh(async newToken => {
        console.log('FCM token refreshed:', newToken);
        this.fcmToken = newToken;
        await AsyncStorage.setItem('fcmToken', newToken);
        
        // Only re-register if user is still authenticated
        const authToken = await AsyncStorage.getItem('token');
        if (authToken) {
          await notificationApi.post('/notifications/register-device', {
            token: newToken,
            device_type: Platform.OS,
          });
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('Failed to register device token:', error);
      
      // If it's an authentication error, don't throw - just log
      if (error.response && error.response.status === 401) {
        console.log('Authentication required for device registration - will retry after login');
        return false;
      }
      
      throw error;
    }
  }

  // Call this method after successful login
  async onUserAuthenticated() {
    try {
      if (this.isInitialized) {
        console.log('User authenticated, registering device token...');
        await this.registerDeviceToken();
      } else {
        console.log('Notification service not initialized, initializing now...');
        await this.init();
        await this.registerDeviceToken();
      }
    } catch (error) {
      console.error('Error during post-authentication notification setup:', error);
    }
  }

  // Call this method during logout
  async onUserLoggedOut() {
    try {
      console.log('User logged out, clearing notification registration');
      this.fcmToken = null;
      // Note: We keep the FCM token in AsyncStorage for next login
    } catch (error) {
      console.error('Error during logout notification cleanup:', error);
    }
  }

  // Register message handlers for different app states
  registerMessageHandlers() {
    // Handle background/quit state messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Background message received:', remoteMessage);
      await this.displayNotification(remoteMessage);
    });

    // Handle foreground messages
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('Foreground message received:', remoteMessage);
      await this.displayNotification(remoteMessage);
    });

    return unsubscribe;
  }

  // Display a local notification from FCM message (Android optimized)
  async displayNotification(remoteMessage) {
    try {
      // Only for Android
      if (Platform.OS !== 'android') {
        return;
      }

      // Create a notification channel for Android
      const channelId = await notifee.createChannel({
        id: 'careconnect_default',
        name: 'CareConnect Notifications',
        importance: AndroidImportance.HIGH,
      });

      // Extract notification data
      const {title, body} = remoteMessage.notification || {};
      const {type, relatedId} = remoteMessage.data || {};

      // Display the notification
      await notifee.displayNotification({
        title: title || 'CareConnect',
        body: body || 'You have a new notification',
        android: {
          channelId,
          pressAction: {
            id: 'default',
          },
          importance: AndroidImportance.HIGH,
          smallIcon: 'ic_launcher', // Make sure you have this icon
        },
        data: {
          type,
          relatedId,
        },
      });
    } catch (error) {
      console.error('Failed to display notification:', error);
    }
  }

  // Handle notification taps
  async onNotificationOpen(remoteMessage) {
    try {
      const {type, relatedId} = remoteMessage.data || {};

      switch (type) {
        case 'appointment_confirmed':
        case 'appointment_rejected':
          if (relatedId) {
            return {
              screen: 'AppointmentDetail',
              params: {appointmentId: relatedId}
            };
          }
          break;
          
        case 'appointment_reminder':
          if (relatedId) {
            return {
              screen: 'AppointmentDetail',
              params: {
                appointmentId: relatedId,
                fromReminder: true
              }
            };
          }
          break;

        default:
          return {
            screen: 'Notifications',
            params: {}
          };
      }
    } catch (error) {
      console.error('Error handling notification open:', error);
    }

    return null;
  }

  // API methods for notifications
  async getNotifications() {
    try {
      console.log('Fetching notifications...');
      const response = await notificationApi.get('/notifications');
      console.log('Notifications response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error.response?.data || new Error('Network error');
    }
  }

  async markAsRead(notificationId) {
    try {
      const response = await notificationApi.put(
        `/notifications/${notificationId}/read`,
      );
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error.response?.data || new Error('Network error');
    }
  }

  async markAllAsRead() {
    try {
      const response = await notificationApi.put(
        `/notifications/mark-all-read`,
      );
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error.response?.data || new Error('Network error');
    }
  }
}

export const notificationService = new NotificationService();

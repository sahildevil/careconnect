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
  // Initialize the service (Android only)
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
        console.log('User has rejected permissions');
        return false;
      }

      // Register handlers
      this.registerMessageHandlers();

      // Get and store FCM token but don't register with server yet
      await this.getFCMToken();

      return true;
    } catch (error) {
      console.error('Notification initialization failed:', error);
      return false;
    }
  }

  // Get FCM token and store locally (don't register with server yet)
  async getFCMToken() {
    try {
      const token = await messaging().getToken();
      console.log('FCM token obtained:', token);
      
      // Store this token locally
      await AsyncStorage.setItem('fcmToken', token);

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
          device_type: 'android',
        },
      );

      console.log('Device registered for notifications:', response.data);
    } catch (error) {
      console.error('Failed to register device token:', error);
      // Don't throw error, just log it
    }
  }

  // Call this method after successful login
  async registerDeviceAfterLogin() {
    try {
      console.log('Registering device after login...');
      await this.registerDeviceTokenIfAuthenticated();
    } catch (error) {
      console.error('Failed to register device after login:', error);
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
              params: {appointmentId: relatedId},
            };
          }
          break;

        default:
          return {
            screen: 'Notifications',
            params: {},
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

import messaging from '@react-native-firebase/messaging';
import notifee, {AndroidImportance} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import axios from 'axios'; // Import axios directly

// Import the API base URL from your environment or config
const API_URL = 'http://192.168.1.8:3000/api'; // Replace with your actual server URL

// Create an API instance specifically for notifications
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
  // Initialize the service
  async init() {
    try {
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

      // Register the device token with the server
      await this.registerDeviceToken();

      return true;
    } catch (error) {
      console.error('Notification initialization failed:', error);
      return false;
    }
  }

  // Register FCM token with our server
  async registerDeviceToken() {
    try {
      // Get the token
      const token = await messaging().getToken();
      console.log('FCM token:', token);

      // Store this token locally
      await AsyncStorage.setItem('fcmToken', token);

      // Register with our server
      const response = await notificationApi.post(
        '/notifications/register-device',
        {
          token,
          device_type: Platform.OS, // 'ios' or 'android'
        },
      );

      console.log('Device registered for notifications:', response.data);

      // Listen for token refresh
      return messaging().onTokenRefresh(async newToken => {
        await AsyncStorage.setItem('fcmToken', newToken);
        await notificationApi.post('/notifications/register-device', {
          token: newToken,
          device_type: Platform.OS,
        });
      });
    } catch (error) {
      console.error('Failed to register device token:', error);
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

    // Return unsubscribe function for cleanup
    return unsubscribe;
  }

  // Display a local notification from FCM message
  async displayNotification(remoteMessage) {
    try {
      // Create a notification channel for Android
      const channelId = await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
      });

      // Extract notification data
      const {title, body} = remoteMessage.notification || {};
      const {type, relatedId} = remoteMessage.data || {};

      // Display the notification
      await notifee.displayNotification({
        title: title || 'New Notification',
        body: body || 'You have a new notification',
        android: {
          channelId,
          pressAction: {
            id: 'default',
          },
          importance: AndroidImportance.HIGH,
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

      // Based on notification type, navigate to appropriate screen
      switch (type) {
        case 'appointment_confirmed':
        case 'appointment_rejected':
          if (relatedId) {
            // Navigate to the appointment detail screen
            return {
              screen: 'AppointmentDetail',
              params: {appointmentId: relatedId},
            };
          }
          break;

        default:
          // Default behavior
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

import messaging from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform, Alert, Linking} from 'react-native';
import axios from 'axios';
import {PermissionsAndroid} from 'react-native';
const API_URL = 'http://192.168.1.8:3000/api';

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
    this.initializationPromise = null;
  }

  // Initialize the service and request permissions
  async init() {
    // Prevent multiple simultaneous initialization attempts
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInit();
    return this.initializationPromise;
  }

  async _performInit() {
    try {
      console.log('Starting notification service initialization...');

      // Wait a bit to ensure the React Native bridge is ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 1: Request Android system notification permission (API 33+)
      const androidPermissionGranted =
        await this.requestAndroidNotificationPermission();

      if (!androidPermissionGranted) {
        console.log('Android notification permission denied');
        return false;
      }

      // Step 2: Request FCM permission
      const fcmPermissionGranted = await this.requestFCMPermissions();

      if (!fcmPermissionGranted) {
        console.log('FCM permissions denied');
        return false;
      }

      // Step 3: Request Notifee permissions for local notifications
      const notifeePermissionGranted = await this.requestNotifeePermissions();

      if (!notifeePermissionGranted) {
        console.log('Local notification permissions denied');
        // FCM might still work for background notifications
      }

      // Step 4: Get FCM token
      try {
        const token = await messaging().getToken();
        console.log('FCM token obtained:', token);
        this.fcmToken = token;

        // Store token locally
        await AsyncStorage.setItem('fcmToken', token);
      } catch (tokenError) {
        console.error('Error getting FCM token:', tokenError);
        return false;
      }

      // Step 5: Register message handlers
      this.registerMessageHandlers();

      this.isInitialized = true;
      console.log('Notification service initialized successfully');

      return true;
    } catch (error) {
      console.error('Notification initialization failed:', error);
      return false;
    } finally {
      this.initializationPromise = null;
    }
  }

  async requestAndroidNotificationPermission() {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      // Check Android version
      const androidVersion = Platform.Version;
      console.log('Android version:', androidVersion);

      // Android 13+ (API 33+) requires explicit permission request
      if (androidVersion >= 33) {
        console.log('Requesting POST_NOTIFICATIONS permission for Android 13+');

        // Add multiple safety checks
        try {
          // First, check if permission is already granted
          const alreadyGranted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );

          if (alreadyGranted) {
            console.log('POST_NOTIFICATIONS permission already granted');
            return true;
          }

          // Wait a bit more to ensure Activity is ready
          await new Promise(resolve => setTimeout(resolve, 500));

          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message:
                'CareConnect needs permission to send you notifications about appointments and health updates.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );

          console.log('POST_NOTIFICATIONS permission result:', granted);
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (permissionError) {
          console.error(
            'Error requesting POST_NOTIFICATIONS permission:',
            permissionError,
          );

          // Show manual permission guidance if automated request fails
          setTimeout(() => {
            Alert.alert(
              'Permission Required',
              'Please enable notifications for CareConnect in your device settings to receive appointment reminders.',
              [
                {text: 'Later', style: 'cancel'},
                {
                  text: 'Open Settings',
                  onPress: () => Linking.openSettings(),
                },
              ],
            );
          }, 1000);

          return false;
        }
      } else {
        // For Android versions below 13, notifications are enabled by default
        console.log(
          'Android version below 13, notifications enabled by default',
        );
        return true;
      }
    } catch (error) {
      console.error('Error in requestAndroidNotificationPermission:', error);
      return false;
    }
  }

  // Request FCM permissions
  async requestFCMPermissions() {
    try {
      console.log('Requesting FCM permissions...');

      // Wait a bit to ensure messaging is ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check current permission status
      const authStatus = await messaging().requestPermission();

      console.log('FCM permission status:', authStatus);

      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('FCM permissions granted:', authStatus);
        return true;
      } else {
        console.log('FCM permissions denied:', authStatus);

        // Show a more detailed explanation if permissions are denied
        if (authStatus === messaging.AuthorizationStatus.DENIED) {
          setTimeout(() => {
            this.showPermissionExplanation();
          }, 1000);
        }

        return false;
      }
    } catch (error) {
      console.error('Error requesting FCM permissions:', error);
      return false;
    }
  }

  // Request Notifee permissions for local notifications
  async requestNotifeePermissions() {
    try {
      console.log('Requesting Notifee permissions...');

      // Wait a bit to ensure notifee is ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check current permission status
      const settings = await notifee.getNotificationSettings();
      console.log(
        'Current Notifee permission status:',
        settings.authorizationStatus,
      );

      if (settings.authorizationStatus === AuthorizationStatus.AUTHORIZED) {
        console.log('Notifee permissions already granted');
        return true;
      }

      if (settings.authorizationStatus === AuthorizationStatus.DENIED) {
        console.log('Notifee permissions denied');
        setTimeout(() => {
          this.showLocalNotificationExplanation();
        }, 1000);
        return false;
      }

      // Request permission
      const newSettings = await notifee.requestPermission();
      console.log(
        'New Notifee permission status:',
        newSettings.authorizationStatus,
      );

      const granted =
        newSettings.authorizationStatus === AuthorizationStatus.AUTHORIZED;

      if (granted) {
        console.log('Notifee permissions granted');

        // Create default notification channel for Android
        if (Platform.OS === 'android') {
          await this.createNotificationChannel();
        }
      } else {
        console.log('Notifee permissions denied');
      }

      return granted;
    } catch (error) {
      console.error('Error requesting Notifee permissions:', error);
      return false;
    }
  }

  // Create notification channel for Android
  async createNotificationChannel() {
    try {
      await notifee.createChannel({
        id: 'default',
        name: 'Default',
        description: 'Default notification channel for CareConnect',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });

      await notifee.createChannel({
        id: 'appointment_reminders',
        name: 'Appointment Reminders',
        description: 'Notifications for upcoming appointments',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });

      console.log('Notification channels created');
    } catch (error) {
      console.error('Error creating notification channels:', error);
    }
  }

  // Show explanation for why permissions are needed
  showPermissionExplanation() {
    Alert.alert(
      'Enable Notifications',
      'CareConnect needs notification permissions to:\n\n• Send appointment reminders\n• Notify about appointment confirmations\n• Share important health updates\n\nYou can enable this in your device settings.',
      [
        {text: 'Later', style: 'cancel'},
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ],
    );
  }

  // Show explanation for local notification permissions
  showLocalNotificationExplanation() {
    Alert.alert(
      'Local Notifications',
      'Local notifications help ensure you receive appointment reminders even when the app is closed. You can enable this in your device settings if needed.',
      [{text: 'OK'}],
    );
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
      let fcmToken = this.fcmToken || (await AsyncStorage.getItem('fcmToken'));

      if (!fcmToken) {
        console.log('No FCM token available, trying to get new one...');
        try {
          fcmToken = await messaging().getToken();
          this.fcmToken = fcmToken;
          await AsyncStorage.setItem('fcmToken', fcmToken);
        } catch (error) {
          console.error('Failed to get FCM token:', error);
          return false;
        }
      }

      console.log('Registering device token with server...');

      // Register with our server
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
        console.log(
          'Authentication required for device registration - will retry after login',
        );
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
        console.log(
          'Notification service not initialized, initializing now...',
        );
        const initialized = await this.init();
        if (initialized) {
          await this.registerDeviceToken();
        }
      }
    } catch (error) {
      console.error(
        'Error during post-authentication notification setup:',
        error,
      );
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

  // Display a local notification from FCM message
  async displayNotification(remoteMessage) {
    try {
      // Extract notification data
      const {title, body} = remoteMessage.notification || {};
      const {type, relatedId} = remoteMessage.data || {};

      // Determine which channel to use
      let channelId = 'default';
      if (type === 'appointment_reminder') {
        channelId = 'appointment_reminders';
      }

      // Display the notification using Notifee
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
        ios: {
          sound: 'default',
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

  // Check if permissions are granted
  async hasPermissions() {
    try {
      // Check Android system permission for API 33+
      let androidSystemPermission = true;
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        androidSystemPermission = granted;
        console.log('Android POST_NOTIFICATIONS permission:', granted);
      }

      // Check FCM permissions
      const fcmStatus = await messaging().hasPermission();
      const fcmGranted =
        fcmStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        fcmStatus === messaging.AuthorizationStatus.PROVISIONAL;

      // Check Notifee permissions
      const notifeeSettings = await notifee.getNotificationSettings();
      const notifeeGranted =
        notifeeSettings.authorizationStatus === AuthorizationStatus.AUTHORIZED;

      const overallGranted = androidSystemPermission && fcmGranted;

      console.log('Permission status:', {
        androidSystem: androidSystemPermission,
        fcm: fcmGranted,
        notifee: notifeeGranted,
        overall: overallGranted,
      });

      return {
        androidSystem: androidSystemPermission,
        fcm: fcmGranted,
        local: notifeeGranted,
        overall: overallGranted,
      };
    } catch (error) {
      console.error('Error checking permissions:', error);
      return {androidSystem: false, fcm: false, local: false, overall: false};
    }
  }

  // ... rest of your existing methods (getNotifications, markAsRead, etc.)
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

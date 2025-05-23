import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {format, isToday, isYesterday} from 'date-fns';
import {notificationService} from '../../services/notifications';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const {user, userType} = useAuth();

  useEffect(() => {
    fetchNotifications();

    // Refresh notifications when the screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      fetchNotifications();
    });

    return unsubscribe;
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      // Add debug logging
      console.log('About to call notificationService.getNotifications()');

      // Check if notificationService exists
      if (
        !notificationService ||
        typeof notificationService.getNotifications !== 'function'
      ) {
        console.error('notificationService is not properly initialized');
        setNotifications([]);
        return;
      }

      const response = await notificationService.getNotifications();

      console.log('Notification response received:', response);

      if (response && response.success) {
        setNotifications(response.notifications || []);
      } else {
        console.error(
          'Failed to fetch notifications:',
          response?.message || 'Unknown error',
        );
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async notificationId => {
    try {
      const response = await notificationService.markAsRead(notificationId);

      if (response.success) {
        // Update local state to mark this notification as read
        setNotifications(
          notifications.map(notification =>
            notification.id === notificationId
              ? {...notification, is_read: true}
              : notification,
          ),
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await notificationService.markAllAsRead();

      if (response.success) {
        // Update all notifications to read in local state
        setNotifications(
          notifications.map(notification => ({...notification, is_read: true})),
        );
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationPress = notification => {
    // Mark notification as read
    markAsRead(notification.id);

    // Navigate based on notification type
    if (
      notification.notification_type === 'appointment_confirmed' ||
      notification.notification_type === 'appointment_rejected'
    ) {
      if (notification.related_id) {
        navigation.navigate('AppointmentDetail', {
          appointmentId: notification.related_id,
        });
      }
    }
    // Add more navigation logic for different notification types
  };

  const formatNotificationDate = dateString => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM dd, yyyy');
    }
  };

  const getNotificationIcon = type => {
    switch (type) {
      case 'appointment_confirmed':
      case 'appointment_rejected':
        return 'calendar';
      case 'message':
        return 'chatbubble';
      case 'payment':
        return 'cash';
      default:
        return 'notifications';
    }
  };

  const renderNotificationItem = ({item}) => {
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          item.is_read ? styles.readNotification : styles.unreadNotification,
        ]}
        onPress={() => handleNotificationPress(item)}>
        <View style={styles.notificationIcon}>
          <Icon
            name={getNotificationIcon(item.notification_type)}
            size={24}
            color="#0CB69B"
          />
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationMessage}>{item.message}</Text>
          <Text style={styles.notificationTime}>
            {formatNotificationDate(item.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0CB69B" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.markReadButton} onPress={markAllAsRead}>
          <Text style={styles.markReadText}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0CB69B" />
        </View>
      ) : notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.notificationList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="notifications-off" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubText}>
            You'll see notifications about your appointments, messages, and more
            here.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  markAllRead: {
    fontSize: 14,
    color: '#0CB69B',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationList: {
    padding: 10,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: '#F8FFFE',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0CB69B',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 5,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default NotificationsScreen;

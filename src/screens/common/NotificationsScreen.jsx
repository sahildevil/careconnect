import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';

// This would come from your backend in a real app
const DUMMY_NOTIFICATIONS = [
  {
    id: '1',
    title: 'Appointment Confirmed',
    message: 'Your appointment with Dr. Vivek has been confirmed for tomorrow at 2:00 PM.',
    date: new Date(new Date().setHours(new Date().getHours() - 2)),
    isRead: false,
    type: 'appointment',
    data: { appointmentId: '123' },
  },
  {
    id: '2',
    title: 'Appointment Reminder',
    message: 'Don\'t forget your appointment with Dr. Nancy tomorrow.',
    date: new Date(new Date().setHours(new Date().getHours() - 4)),
    isRead: true,
    type: 'reminder',
    data: { appointmentId: '456' },
  },
  {
    id: '3',
    title: 'Prescription Updated',
    message: 'Dr. Sahil has updated your prescription. Check it now.',
    date: new Date(new Date().setDate(new Date().getDate() - 1)),
    isRead: false,
    type: 'prescription',
    data: { prescriptionId: '789' },
  },
  {
    id: '4',
    title: 'Payment Successful',
    message: 'Your payment for appointment with Dr. Aman was successful.',
    date: new Date(new Date().setDate(new Date().getDate() - 2)),
    isRead: true,
    type: 'payment',
    data: { transactionId: '101112' },
  },
  {
    id: '5',
    title: 'Profile Update',
    message: 'Your profile information has been updated successfully.',
    date: new Date(new Date().setDate(new Date().getDate() - 3)),
    isRead: true,
    type: 'profile',
    data: {},
  },
];

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const { user, userType } = useAuth();

  useEffect(() => {
    // In a real app, fetch notifications from your API
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // Simulating API call with a timeout
      setTimeout(() => {
        setNotifications(DUMMY_NOTIFICATIONS);
        setLoading(false);
      }, 800);

      // In a real app, you would do:
      // const response = await notificationService.getNotifications(user.id);
      // if (response.success) {
      //   setNotifications(response.notifications);
      // }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    // Update the local state
    setNotifications(
      notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      )
    );

    // In a real app, update in database
    // await notificationService.markAsRead(notificationId);
  };

  const handleNotificationPress = (notification) => {
    // Mark notification as read
    markAsRead(notification.id);

    // Navigate based on notification type
    switch (notification.type) {
      case 'appointment':
        navigation.navigate('AppointmentDetail', { appointmentId: notification.data.appointmentId });
        break;
      case 'prescription':
        navigation.navigate('PrescriptionDetail', { prescriptionId: notification.data.prescriptionId });
        break;
      case 'payment':
        navigation.navigate('PaymentHistory');
        break;
      case 'profile':
        navigation.navigate('Profile');
        break;
      default:
        // Just mark as read without navigation
        break;
    }
  };

  const markAllAsRead = async () => {
    setNotifications(
      notifications.map(notification => ({ ...notification, isRead: true }))
    );
    // In a real app, update all in database
    // await notificationService.markAllAsRead(user.id);
  };

  const formatNotificationDate = (date) => {
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM dd, yyyy');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment':
        return 'calendar';
      case 'reminder':
        return 'alarm';
      case 'prescription':
        return 'document-text';
      case 'payment':
        return 'cash';
      case 'profile':
        return 'person';
      default:
        return 'notifications';
    }
  };

  const getIconBackground = (type) => {
    switch (type) {
      case 'appointment':
        return '#E6F8F6'; // Light green
      case 'reminder':
        return '#FFF4E5'; // Light orange
      case 'prescription':
        return '#E5F1FF'; // Light blue
      case 'payment':
        return '#E7F9E7'; // Light green
      case 'profile':
        return '#F0E5FF'; // Light purple
      default:
        return '#F5F5F5'; // Light gray
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case 'appointment':
        return '#0CB69B'; // Green
      case 'reminder':
        return '#FF9500'; // Orange
      case 'prescription':
        return '#007AFF'; // Blue
      case 'payment':
        return '#34C759'; // Green
      case 'profile':
        return '#AF52DE'; // Purple
      default:
        return '#8E8E93'; // Gray
    }
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.isRead && styles.unreadNotification,
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View 
        style={[
          styles.notificationIcon, 
          { backgroundColor: getIconBackground(item.type) }
        ]}
      >
        <Icon 
          name={getNotificationIcon(item.type)} 
          size={20} 
          color={getIconColor(item.type)} 
        />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.notificationTime}>
          {formatNotificationDate(item.date)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markAllRead}>Mark all as read</Text>
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
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.notificationList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="notifications-off-outline" size={60} color="#CCCCCC" />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>
            We'll notify you when something important happens
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
    shadowOffset: { width: 0, height: 1 },
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
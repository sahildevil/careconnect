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
  RefreshControl,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {format, isToday, isYesterday} from 'date-fns';
import {notificationService} from '../../services/notifications';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const navigation = useNavigation();
  const {user, userType} = useAuth();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    fetchNotifications();

    // Refresh notifications when the screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      fetchNotifications();
    });

    return unsubscribe;
  }, []);

  const fetchNotifications = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);

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
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  const markAsRead = async notificationId => {
    try {
      const response = await notificationService.markAsRead(notificationId);

      if (response.success) {
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
      notification.notification_type === 'appointment_rejected' ||
      notification.notification_type === 'appointment_reminder'
    ) {
      if (notification.related_id) {
        console.log(
          `Navigating to AppointmentDetail for ${userType} user with ID: ${notification.related_id}`,
        );

        // Determine which flow to use based on user type
        if (userType === 'doctor') {
          // For doctor users - navigate to DoctorFlow stack
          navigation.navigate('DoctorFlow', {
            screen: 'AppointmentDetail',
            params: {
              appointmentId: notification.related_id,
              fromReminder:
                notification.notification_type === 'appointment_reminder',
            },
          });
        } else {
          // For patient users - navigate to PatientFlow stack
          navigation.navigate('PatientFlow', {
            screen: 'AppointmentDetail',
            params: {
              appointmentId: notification.related_id,
              fromReminder:
                notification.notification_type === 'appointment_reminder',
            },
          });
        }
      }
    }
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
        return 'checkmark-circle';
      case 'appointment_rejected':
        return 'close-circle';
      case 'appointment_reminder':
        return 'alarm';
      case 'message':
        return 'chatbubble-ellipses';
      case 'payment':
        return 'card';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = type => {
    switch (type) {
      case 'appointment_confirmed':
        return '#4CAF50';
      case 'appointment_rejected':
        return '#F44336';
      case 'appointment_reminder':
        return '#FF9800';
      case 'message':
        return '#2196F3';
      case 'payment':
        return '#FF9800';
      default:
        return '#0CB69B';
    }
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.is_read);
      case 'read':
        return notifications.filter(n => n.is_read);
      default:
        return notifications;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderFilterButton = (filterType, label) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.activeFilterButton,
      ]}
      onPress={() => setFilter(filterType)}>
      <Text
        style={[
          styles.filterButtonText,
          filter === filterType && styles.activeFilterButtonText,
        ]}>
        {label}
      </Text>
      {filterType === 'unread' && unreadCount > 0 && (
        <View style={styles.filterBadge}>
          <Text style={styles.filterBadgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderNotificationItem = ({item, index}) => {
    const iconColor = getNotificationColor(item.notification_type);

    return (
      <Animated.View style={[styles.notificationWrapper]}>
        <TouchableOpacity
          style={[
            styles.notificationItem,
            item.is_read ? styles.readNotification : styles.unreadNotification,
          ]}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}>
          {/* Unread indicator */}
          {!item.is_read && <View style={styles.unreadIndicator} />}

          <View
            style={[
              styles.notificationIconContainer,
              {backgroundColor: iconColor + '15'},
            ]}>
            <Icon
              name={getNotificationIcon(item.notification_type)}
              size={24}
              color={iconColor}
            />
          </View>

          <View style={styles.notificationContent}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.notificationTime}>
                {formatNotificationDate(item.created_at)}
              </Text>
            </View>

            <Text style={styles.notificationMessage} numberOfLines={2}>
              {item.message}
            </Text>

            {/* Notification type badge */}
            <View
              style={[styles.typeBadge, {backgroundColor: iconColor + '20'}]}>
              <Text style={[styles.typeBadgeText, {color: iconColor}]}>
                {item.notification_type.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => markAsRead(item.id)}>
            <Icon name="ellipsis-horizontal" size={20} color="#999" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const filteredNotifications = getFilteredNotifications();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#000000" barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top}]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </Text>
          </View>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}>
            <Icon name="checkmark-done" size={20} color="#0CB69B" />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All')}
        {renderFilterButton('unread', 'Unread')}
        {renderFilterButton('read', 'Read')}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0CB69B" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : filteredNotifications.length > 0 ? (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.notificationList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0CB69B']}
              tintColor="#0CB69B"
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Icon name="notifications-off" size={80} color="#E0E0E0" />
          </View>
          <Text style={styles.emptyText}>
            {filter === 'unread'
              ? 'No unread notifications'
              : filter === 'read'
              ? 'No read notifications'
              : 'No notifications yet'}
          </Text>
          <Text style={styles.emptySubText}>
            {filter === 'all'
              ? "You'll see notifications about your appointments, messages, and more here."
              : 'Try switching to a different filter.'}
          </Text>

          {filter === 'all' && (
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Icon name="refresh" size={20} color="#0CB69B" />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 15,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  markAllText: {
    fontSize: 12,
    color: '#0CB69B',
    fontWeight: '600',
    marginLeft: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  activeFilterButton: {
    backgroundColor: '#0CB69B',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#FF4757',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  notificationList: {
    padding: 15,
  },
  notificationWrapper: {
    marginBottom: 10,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#0CB69B',
  },
  readNotification: {
    opacity: 0.8,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0CB69B',
  },
  notificationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  moreButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#0CB69B',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default NotificationsScreen;

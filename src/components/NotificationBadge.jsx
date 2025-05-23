import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {notificationService} from '../services/notifications';

const NotificationBadge = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigation = useNavigation();

  useEffect(() => {
    fetchUnreadCount();

    const unsubscribe = navigation.addListener('focus', fetchUnreadCount);
    return unsubscribe;
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationService.getNotifications();
      if (response.success) {
        const count = response.notifications.filter(n => !n.is_read).length;
        setUnreadCount(count);
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigation.navigate('Notifications')}>
      <Icon name="notifications" size={24} color="#fff" />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF4757',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default NotificationBadge;

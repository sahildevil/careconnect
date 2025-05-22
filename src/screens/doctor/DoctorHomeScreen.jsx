import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {appointmentService} from '../../services/api';
import {useAuth} from '../../context/AuthContext';

const DoctorHomeScreen = () => {
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [stats, setStats] = useState({
    today: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const {user} = useAuth();

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentService.getDoctorAppointments();

      if (response.success) {
        const appointments = response.appointments;

        // Get today's date at midnight for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get tomorrow's date at midnight
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Filter appointments for today
        const todayAppts = appointments.filter(app => {
          const appDate = new Date(app.appointment_date);
          return appDate >= today && appDate < tomorrow;
        });

        // Filter upcoming appointments (future dates, not today)
        const upcomingAppts = appointments.filter(app => {
          const appDate = new Date(app.appointment_date);
          return appDate >= tomorrow;
        });

        // Count completed and cancelled appointments
        const completedCount = appointments.filter(
          app => app.status === 'completed',
        ).length;
        const cancelledCount = appointments.filter(
          app => app.status === 'cancelled',
        ).length;

        setTodayAppointments(todayAppts);
        setUpcomingAppointments(upcomingAppts);
        setStats({
          today: todayAppts.length,
          upcoming: upcomingAppts.length,
          completed: completedCount,
          cancelled: cancelledCount,
        });
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderAppointmentItem = ({item}) => {
    const appointmentTime = new Date(item.appointment_date).toLocaleTimeString(
      [],
      {hour: '2-digit', minute: '2-digit'},
    );

    return (
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() =>
          navigation.navigate('AppointmentDetail', {appointment: item})
        }>
        <View style={styles.appointmentHeader}>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>
              {item.patient?.name || 'Patient'}
            </Text>
            <Text style={styles.appointmentType}>
              {item.appointment_type || 'Consultation'}
            </Text>
          </View>
          <View style={styles.timeSlot}>
            <Icon name="time-outline" size={16} color="#0CB69B" />
            <Text style={styles.timeText}>{appointmentTime}</Text>
          </View>
        </View>

        <View style={styles.appointmentFooter}>
          <Text style={styles.reasonText} numberOfLines={1}>
            {item.reason || 'General checkup'}
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={() =>
                navigation.navigate('VideoCall', {appointment: item})
              }>
              <Icon name="videocam" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rescheduleButton]}
              onPress={() =>
                navigation.navigate('RescheduleAppointment', {
                  appointment: item,
                })
              }>
              <Icon name="calendar-outline" size={16} color="#0CB69B" />
              <Text style={[styles.actionButtonText, styles.rescheduleText]}>
                Reschedule
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0CB69B" />

      <View style={styles.headerBackground}>
        <SafeAreaView>
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <View>
                <Text style={styles.greeting}>
                  Hello, Dr. {user?.name || 'Doctor'}
                </Text>
                <Text style={styles.subText}>{new Date().toDateString()}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}>
              <Icon name="notifications-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0CB69B" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.contentContainer}>
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={[styles.statsCard, {backgroundColor: '#E6F8F6'}]}>
                <Icon name="calendar" size={24} color="#0CB69B" />
                <Text style={styles.statsNumber}>{stats.today}</Text>
                <Text style={styles.statsLabel}>Today</Text>
              </View>
              <View style={[styles.statsCard, {backgroundColor: '#FFE6E6'}]}>
                <Icon name="time" size={24} color="#FF6B6B" />
                <Text style={styles.statsNumber}>{stats.upcoming}</Text>
                <Text style={styles.statsLabel}>Upcoming</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={[styles.statsCard, {backgroundColor: '#E6F0FF'}]}>
                <Icon name="checkmark-circle" size={24} color="#4D79FF" />
                <Text style={styles.statsNumber}>{stats.completed}</Text>
                <Text style={styles.statsLabel}>Completed</Text>
              </View>
              <View style={[styles.statsCard, {backgroundColor: '#FFF0E6'}]}>
                <Icon name="close-circle" size={24} color="#FF9F40" />
                <Text style={styles.statsNumber}>{stats.cancelled}</Text>
                <Text style={styles.statsLabel}>Cancelled</Text>
              </View>
            </View>
          </View>

          {/* Today's Appointments */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Appointments</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Appointments')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {todayAppointments.length > 0 ? (
            todayAppointments.map((appointment, index) => (
              <React.Fragment key={appointment.id || index}>
                {renderAppointmentItem({item: appointment})}
              </React.Fragment>
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                No appointments scheduled for today
              </Text>
            </View>
          )}

          {/* Upcoming Appointments */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Appointments')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {upcomingAppointments.length > 0 ? (
            upcomingAppointments
              .slice(0, 3)
              .map((appointment, index) => (
                <React.Fragment key={appointment.id || index}>
                  {renderAppointmentItem({item: appointment})}
                </React.Fragment>
              ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                No upcoming appointments
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  headerBackground: {
    backgroundColor: '#0CB69B',
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  contentContainer: {
    flex: 1,
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statsCard: {
    width: '48%',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  statsLabel: {
    fontSize: 14,
    color: '#666',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAll: {
    fontSize: 14,
    color: '#0CB69B',
    fontWeight: '500',
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  appointmentType: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F8F6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  timeText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#0CB69B',
    fontWeight: '500',
  },
  appointmentFooter: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
    width: '40%',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginLeft: 8,
  },
  startButton: {
    backgroundColor: '#0CB69B',
  },
  rescheduleButton: {
    backgroundColor: '#E6F8F6',
    borderWidth: 1,
    borderColor: '#0CB69B',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    marginLeft: 4,
  },
  rescheduleText: {
    color: '#0CB69B',
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 15,
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
  },
});

export default DoctorHomeScreen;

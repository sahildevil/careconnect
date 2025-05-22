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
import {CustomButton} from '../../components';

const DoctorHomeScreen = () => {
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [stats, setStats] = useState({
    today: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const {user} = useAuth();

  useEffect(() => {
    fetchAppointments();

    // Add a refresh listener when the screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAppointments();
    });

    return unsubscribe;
  }, []);

  // Helper function to get date in YYYY-MM-DD format
  const getDateString = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to check if a date is today
  const isToday = (dateString) => {
    const today = getDateString(new Date());
    const appointmentDate = getDateString(dateString);
    return today === appointmentDate;
  };

  // Helper function to check if a date is in the future (not today)
  const isFuture = (dateString) => {
    const today = new Date();
    const appointmentDate = new Date(dateString);
    
    // Set time to start of day for fair comparison
    today.setHours(0, 0, 0, 0);
    appointmentDate.setHours(0, 0, 0, 0);
    
    return appointmentDate > today;
  };

  // Improved fetchAppointments function with better date handling
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      console.log('Attempting to fetch doctor appointments...');
      const response = await appointmentService.getDoctorAppointments();
      console.log('Appointments response:', response);

      if (response.success && Array.isArray(response.appointments)) {
        const appointments = response.appointments;
        console.log(`Received ${appointments.length} appointments from server`);

        // Get today's date string for comparison
        const todayString = getDateString(new Date());
        console.log('Today\'s date string:', todayString);

        // Filter appointments for today with improved date comparison
        const todayAppts = appointments.filter(app => {
          const appointmentDateString = getDateString(app.appointment_date);
          const isTodayAppointment = appointmentDateString === todayString;
          const isActiveStatus = app.status !== 'canceled' && app.status !== 'completed';
          
          console.log(`Appointment ${app.id}: Date=${appointmentDateString}, IsToday=${isTodayAppointment}, Status=${app.status}, IsActive=${isActiveStatus}`);
          
          return isTodayAppointment && isActiveStatus;
        });

        // Filter upcoming appointments (future dates, not today)
        const upcomingAppts = appointments.filter(app => {
          const isFutureAppointment = isFuture(app.appointment_date);
          const isActiveStatus = app.status !== 'canceled' && app.status !== 'completed';
          
          return isFutureAppointment && isActiveStatus;
        });

        // Filter pending appointments
        const pendingAppts = appointments.filter(
          app => app.status === 'pending',
        );
        setPendingAppointments(pendingAppts);

        // Count completed and cancelled appointments
        const completedCount = appointments.filter(
          app => app.status === 'completed',
        ).length;
        const cancelledCount = appointments.filter(
          app => app.status === 'canceled',
        ).length;

        console.log(
          `Filtered appointments: ${todayAppts.length} today, ${upcomingAppts.length} upcoming`,
        );
        
        // Log today's appointments for debugging
        console.log('Today\'s appointments:', todayAppts.map(app => ({
          id: app.id,
          date: app.appointment_date,
          patient: app.patients?.name || 'Unknown',
          status: app.status
        })));

        setTodayAppointments(todayAppts);
        setUpcomingAppointments(upcomingAppts);
        setStats({
          today: todayAppts.length,
          upcoming: upcomingAppts.length,
          completed: completedCount,
          cancelled: cancelledCount,
          pending: pendingCount, // Add this new stat
        });
      } else {
        console.error('Invalid response format or no appointments found');
        // Set empty arrays if no valid data
        setTodayAppointments([]);
        setUpcomingAppointments([]);
        setStats({
          today: 0,
          upcoming: 0,
          completed: 0,
          cancelled: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      // Set empty arrays on error
      setTodayAppointments([]);
      setUpcomingAppointments([]);
      setStats({
        today: 0,
        upcoming: 0,
        completed: 0,
        cancelled: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // Improved renderAppointmentItem function with better error handling
  const renderAppointmentItem = ({item}) => {
    try {
      const appointmentDate = new Date(item.appointment_date);
      const appointmentTime = appointmentDate.toLocaleTimeString([], {
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });

      // Log the appointment to debug
      console.log('Rendering appointment:', {
        id: item.id,
        date: item.appointment_date,
        patientInfo: item.patients || 'No patient info',
        status: item.status
      });

      // Get patient name with fallback
      const patientName = item.patients?.name || item.patient?.name || 'Patient';
      const patientInitial = patientName.charAt(0).toUpperCase();

      return (
        <View style={styles.appointmentCard}>
          <View style={styles.patientInfo}>
            <View style={styles.patientAvatar}>
              <Text style={styles.avatarText}>{patientInitial}</Text>
            </View>
            <View style={styles.patientDetails}>
              <Text style={styles.patientName}>{patientName}</Text>
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
              <CustomButton
                title="Start"
                onPress={() =>
                  navigation.navigate('VideoCall', {appointment: item})
                }
                style={[styles.actionButton, styles.startButton]}
                textStyle={styles.actionButtonText}
                icon={<Icon name="videocam" size={16} color="#fff" />}
              />

              <CustomButton
                title="Reschedule"
                onPress={() =>
                  navigation.navigate('RescheduleAppointment', {
                    appointmentId: item.id,
                  })
                }
                style={[styles.actionButton, styles.rescheduleButton]}
                textStyle={[styles.actionButtonText, styles.rescheduleText]}
              />
            </View>
          </View>
        </View>
      );
    } catch (error) {
      console.error('Error rendering appointment item:', error);
      return (
        <View style={styles.appointmentCard}>
          <Text style={styles.errorText}>Error displaying appointment</Text>
        </View>
      );
    }
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
          <Text style={styles.loadingText}>Loading appointments...</Text>
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
              <View style={[styles.statsCard, {backgroundColor: '#FFF8E1'}]}>
                <Icon name="time-outline" size={24} color="#FFC107" />
                <Text style={styles.statsNumber}>{stats.pending}</Text>
                <Text style={styles.statsLabel}>Pending</Text>
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
              <React.Fragment key={appointment.id || `today-${index}`}>
                {renderAppointmentItem({item: appointment})}
              </React.Fragment>
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <Icon name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>
                No appointments scheduled for today
              </Text>
              <Text style={styles.emptyStateSubText}>
                Your schedule is clear for today
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
                <React.Fragment key={appointment.id || `upcoming-${index}`}>
                  {renderAppointmentItem({item: appointment})}
                </React.Fragment>
              ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <Icon name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>
                No upcoming appointments
              </Text>
              <Text style={styles.emptyStateSubText}>
                New appointments will appear here
              </Text>
            </View>
          )}

          {/* Pending Appointments */}
          {stats.pending > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pending Approval</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Appointments')}>
                  <Text style={styles.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>

              {pendingAppointments.slice(0, 3).map((appointment, index) => (
                <React.Fragment key={appointment.id || index}>
                  {renderAppointmentItem({item: appointment})}
                </React.Fragment>
              ))}
            </>
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F8F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0CB69B',
  },
  patientDetails: {
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
    padding: 30,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 15,
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    fontWeight: '500',
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    padding: 10,
  },
});

export default DoctorHomeScreen;
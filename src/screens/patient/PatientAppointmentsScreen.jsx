import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {appointmentService} from '../../services/api';
import {useAuth} from '../../context/AuthContext';
import {useNetInfo} from '@react-native-community/netinfo';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppointments} from '../../context/AppointmentContext';

const PatientAppointmentsScreen = () => {
  const {user} = useAuth();
  const {
    appointments,
    loading: appointmentsLoading,
    fetchAppointments,
    cancelAppointment: contextCancelAppointment,
  } = useAppointments();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const netInfo = useNetInfo();
  const insets = useSafeAreaInsets();

  // Use useFocusEffect instead of useEffect for navigation focus
  useFocusEffect(
    React.useCallback(() => {
      console.log(`PatientAppointmentsScreen focused for user: ${user?.id}`);

      // Check network connectivity
      if (!netInfo.isConnected && netInfo.isInternetReachable === false) {
        Alert.alert(
          'No Internet Connection',
          'Please check your internet connection and try again.',
        );
      } else if (user?.id) {
        // Only fetch if we have a valid user
        fetchAppointments();
      }
    }, [netInfo.isConnected, fetchAppointments, user?.id]),
  );

  const cancelAppointment = async appointmentId => {
    try {
      Alert.alert(
        'Cancel Appointment',
        'Are you sure you want to cancel this appointment?',
        [
          {
            text: 'No',
            style: 'cancel',
          },
          {
            text: 'Yes',
            onPress: async () => {
              setLoading(true);
              const response = await appointmentService.cancelAppointment(
                appointmentId,
              );

              if (response.success) {
                // Update the appointment status in context instead of local state
                contextCancelAppointment(appointmentId);
                Alert.alert('Success', 'Appointment cancelled successfully');
              } else {
                Alert.alert('Error', 'Failed to cancel appointment');
              }
              setLoading(false);
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      Alert.alert('Error', 'Failed to cancel appointment');
    }
  };

  // Modify the getFilteredAppointments function to group appointments by date
  const getFilteredAppointments = () => {
    const now = new Date();

    let filteredAppointments = [];

    if (activeTab === 'upcoming') {
      filteredAppointments = appointments.filter(app => {
        const appDate = new Date(app.appointment_date);
        return (
          appDate >= now &&
          (app.status === 'confirmed' || app.status === 'pending')
        );
      });
    } else if (activeTab === 'completed') {
      filteredAppointments = appointments.filter(
        app => app.status === 'completed',
      );
    } else if (activeTab === 'cancelled') {
      // Handle both spellings for backwards compatibility
      filteredAppointments = appointments.filter(
        app => app.status === 'canceled' || app.status === 'cancelled',
      );
    } else {
      filteredAppointments = [...appointments];
    }

    // Sort appointments by appointment date (soonest first)
    const sortedAppointments = filteredAppointments.sort((a, b) => {
      const dateA = new Date(a.appointment_date);
      const dateB = new Date(b.appointment_date);
      return dateA - dateB; // Ascending order (soonest first)
    });

    // Now add date separators to the sorted appointments
    const appointmentsWithSeparators = [];
    let currentDate = null;

    sortedAppointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.appointment_date);
      const appointmentDateString = appointmentDate.toDateString();

      // If this appointment is on a different day than the previous one, add a separator
      if (currentDate !== appointmentDateString) {
        currentDate = appointmentDateString;

        // Format the date nicely
        const formattedDate = appointmentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        appointmentsWithSeparators.push({
          id: `separator-${appointmentDateString}`,
          type: 'separator',
          date: appointmentDate,
          formattedDate,
        });
      }

      // Then add the appointment with type 'appointment'
      appointmentsWithSeparators.push({
        ...appointment,
        type: 'appointment',
      });
    });

    return appointmentsWithSeparators;
  };

  // Add a renderItem function that can handle both appointments and separators
  const renderItem = ({item}) => {
    if (item.type === 'separator') {
      return (
        <View style={styles.dateSeparator}>
          <View style={styles.dateSeparatorLine} />
          <Text style={styles.dateSeparatorText}>{item.formattedDate}</Text>
          <View style={styles.dateSeparatorLine} />
        </View>
      );
    }

    // This is a regular appointment item
    return renderAppointmentItem({item});
  };

  // Update the appointment item to show pending status differently
  const renderAppointmentItem = ({item}) => {
    const appointmentDate = new Date(item.appointment_date);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = appointmentDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Get doctor data consistently
    const doctorData = item.doctor || item.doctors || {};

    return (
      <View style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formattedDate}</Text>
            <Text style={styles.timeText}>{formattedTime}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              item.status === 'completed'
                ? styles.completedBadge
                : item.status === 'cancelled' || item.status === 'canceled'
                ? styles.cancelledBadge
                : item.status === 'confirmed'
                ? styles.scheduledBadge
                : item.status === 'pending'
                ? styles.pendingBadge
                : styles.pendingBadge,
            ]}>
            <Text style={styles.statusText}>
              {item.status === 'pending'
                ? 'Awaiting Approval'
                : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.doctorInfo}>
          <View style={styles.doctorDetails}>
            <Text style={styles.doctorName}>
              Dr. {doctorData.name || 'Doctor'}
            </Text>
            <Text style={styles.specialtyText}>
              {doctorData.specialty || 'Specialist'}
            </Text>
          </View>
        </View>

        <View style={styles.appointmentFooter}>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() =>
              navigation.navigate('AppointmentDetail', {appointmentId: item.id})
            }>
            <Text style={styles.detailsText}>View Details</Text>
          </TouchableOpacity>

          {/* Only allow cancellation of pending or confirmed appointments */}
          {(item.status === 'pending' || item.status === 'confirmed') && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => cancelAppointment(item.id)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const onRefresh = React.useCallback(() => {
    if (user?.id) {
      setRefreshing(true);
      fetchAppointments().finally(() => setRefreshing(false));
    }
  }, [fetchAppointments, user?.id]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top}]}>
        <Text style={styles.headerTitle}>My Appointments</Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'upcoming' && styles.activeTabText,
            ]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'completed' && styles.activeTabText,
            ]}>
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cancelled' && styles.activeTab]}
          onPress={() => setActiveTab('cancelled')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'cancelled' && styles.activeTabText,
            ]}>
            Cancelled
          </Text>
        </TouchableOpacity>
      </View>

      {appointmentsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0CB69B" />
        </View>
      ) : (
        <FlatList
          data={getFilteredAppointments()}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0CB69B']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No appointments found</Text>
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => navigation.navigate('DoctorList')}>
                <Text style={styles.bookButtonText}>Book an Appointment</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    backgroundColor: '#0CB69B',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0CB69B',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#0CB69B',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
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
    alignItems: 'center',
    marginBottom: 15,
  },
  dateContainer: {
    flexDirection: 'column',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  scheduledBadge: {
    backgroundColor: '#e0f2f1',
  },
  completedBadge: {
    backgroundColor: '#e8f5e9',
  },
  cancelledBadge: {
    backgroundColor: '#ffebee',
  },
  pendingBadge: {
    backgroundColor: '#fff8e1',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  specialtyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  appointmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#0CB69B',
  },
  detailsText: {
    color: '#0CB69B',
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    backgroundColor: '#ffebee',
  },
  cancelText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '500',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    backgroundColor: '#0CB69B',
  },
  joinText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  bookButton: {
    backgroundColor: '#0CB69B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateSeparatorLine: {
    height: 1,
    width: '100%',
    backgroundColor: '#ddd',
  },
  dateSeparatorText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginVertical: 5,
  },
});

export default PatientAppointmentsScreen;

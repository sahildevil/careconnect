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
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {appointmentService} from '../../services/api';
import {CustomButton, HeaderComponent} from '../../components';

const DoctorAppointmentsScreen = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // Change default tab to pending
  const navigation = useNavigation();

  useEffect(() => {
    fetchAppointments();

    // Refresh appointments when the screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAppointments();
    });

    return unsubscribe;
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentService.getDoctorAppointments();

      if (response.success) {
        setAppointments(response.appointments);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId, status) => {
    try {
      const response = await appointmentService.updateAppointmentStatus(
        appointmentId,
        status,
      );

      if (response.success) {
        // Update the appointment status locally
        setAppointments(
          appointments.map(app => {
            if (app.id === appointmentId) {
              return {...app, status};
            }
            return app;
          }),
        );
        Alert.alert('Success', `Appointment marked as ${status}`);
      } else {
        Alert.alert('Error', 'Failed to update appointment status');
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      Alert.alert('Error', 'Failed to update appointment status');
    }
  };

  const getFilteredAppointments = () => {
    const now = new Date();

    if (activeTab === 'pending') {
      // Filter for pending appointments
      return appointments.filter(app => app.status === 'pending');
    } else if (activeTab === 'upcoming') {
      return appointments.filter(app => {
        const appDate = new Date(app.appointment_date);
        return (
          appDate >= now &&
          app.status === 'confirmed' && // Only confirmed appointments
          app.status !== 'canceled'
        );
      });
    } else if (activeTab === 'completed') {
      return appointments.filter(app => app.status === 'completed');
    } else if (activeTab === 'cancelled') {
      return appointments.filter(app => app.status === 'canceled');
    }

    return appointments;
  };

  // Replace your existing handleAppointmentApproval function with this improved version:
  const handleAppointmentApproval = async (appointmentId, approved, reason = '') => {
    try {
      setLoading(true);
      
      console.log(`Attempting to ${approved ? 'approve' : 'reject'} appointment ${appointmentId}`);
      
      const response = await appointmentService.approveAppointment(
        appointmentId,
        approved,
        approved ? null : reason
      );

      if (response.success) {
        // Find the appointment that was updated
        const updatedAppointment = appointments.find(app => app.id === appointmentId);
        
        if (updatedAppointment) {
          // Create updated version of the appointment
          const updatedAppointmentData = {
            ...updatedAppointment,
            status: approved ? 'confirmed' : 'canceled',
            notes: approved ? updatedAppointment.notes : reason
          };
          
          // Update the appointments list with the new status
          setAppointments(appointments.map(app => 
            app.id === appointmentId ? updatedAppointmentData : app
          ));
          
          // Show success message
          Alert.alert(
            'Success',
            approved 
              ? 'Appointment has been confirmed' 
              : 'Appointment has been rejected'
          );
          
          // Force tab change to see the appointment in its new section
          if (approved && activeTab === 'pending') {
            // Optional: automatically switch to confirmed tab to see the appointment
            setActiveTab('upcoming');
          }
        }
      } else {
        Alert.alert('Error', 'Failed to update appointment status');
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      Alert.alert('Error', 'Failed to update appointment status');
    } finally {
      setLoading(false);
    }
  };

  // Add this function to prompt for rejection reason
  const promptRejectReason = appointmentId => {
    // Alert.prompt is iOS-only, let's handle it differently for cross-platform
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Reject Appointment',
        'Please provide a reason for rejection:',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Submit',
            onPress: reason =>
              handleAppointmentApproval(appointmentId, false, reason || 'Rejected by doctor'),
          },
        ],
      );
    } else {
      // For Android, we can use a simple alert with predefined reasons
      Alert.alert(
        'Reject Appointment',
        'Please select a reason for rejection:',
        [
          {
            text: 'Doctor unavailable',
            onPress: () => handleAppointmentApproval(appointmentId, false, 'Doctor unavailable'),
          },
          {
            text: 'Schedule conflict',
            onPress: () => handleAppointmentApproval(appointmentId, false, 'Schedule conflict'),
          },
          {
            text: 'Need more information',
            onPress: () => handleAppointmentApproval(appointmentId, false, 'Need more information'),
          },
          {
            text: 'Other/Cancel',
            style: 'cancel',
          },
        ],
      );
    }
  };

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
                : item.status === 'cancelled'
                ? styles.cancelledBadge
                : styles.scheduledBadge,
            ]}>
            <Text style={styles.statusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.patientInfo}>
          <View style={styles.patientAvatar}>
            <Text style={styles.avatarText}>
              {item.patient?.name?.charAt(0) || 'P'}
            </Text>
          </View>
          <View style={styles.patientDetails}>
            <Text style={styles.patientName}>
              {item.patient?.name || 'Patient'}
            </Text>
            <Text style={styles.reasonText}>
              Reason: {item.reason || 'Consultation'}
            </Text>
          </View>
        </View>

        <View style={styles.appointmentFooter}>
          <CustomButton
            title="View Details"
            onPress={() =>
              navigation.navigate('AppointmentDetail', {appointmentId: item.id})
            }
            style={styles.detailsButton}
            textStyle={styles.detailsText} // Keep this existing style
          />

          {/* Show approve/reject buttons only for pending appointments */}
          {item.status === 'pending' && (
            <View style={styles.approvalButtons}>
              <CustomButton
                title={loading ? 'Processing...' : 'Approve'}
                onPress={() => handleAppointmentApproval(item.id, true)}
                style={[styles.approveButton, loading && styles.disabledButton]}
                textStyle={styles.approveText}
                disabled={loading}
              />

              <CustomButton
                title={loading ? 'Processing...' : 'Reject'}
                onPress={() => promptRejectReason(item.id)}
                style={[styles.rejectButton, loading && styles.disabledButton]}
                textStyle={styles.rejectText}
                disabled={loading}
              />
            </View>
          )}

          {/* Show other buttons for different statuses */}
          {activeTab === 'upcoming' && item.status === 'confirmed' && (
            <View style={styles.actionButtons}>
              <CustomButton
                title="Complete"
                onPress={() => updateAppointmentStatus(item.id, 'completed')}
                style={styles.completeButton}
                textStyle={styles.completeText}
              />

              <CustomButton
                title="Reschedule"
                onPress={() =>
                  navigation.navigate('RescheduleAppointment', {
                    appointmentId: item.id,
                  })
                }
                style={styles.rescheduleButton}
                textStyle={styles.rescheduleText}
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderComponent
        title="My Appointments"
        showLogo={false}
        style={styles.header}
        titleStyle={styles.headerTitleText} // Add this prop
      />

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'pending' && styles.activeTabText,
            ]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'upcoming' && styles.activeTabText,
            ]}>
            Confirmed
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
            Canceled
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0CB69B" />
        </View>
      ) : (
        <FlatList
          data={getFilteredAppointments()}
          renderItem={renderAppointmentItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No appointments found</Text>
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
  headerTitleText: {
    color: 'white',
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
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E6F8F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
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
    fontWeight: 'bold',
    color: '#333',
  },
  reasonText: {
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
    backgroundColor: '#E6F8F6', // Light green background
  },
  detailsText: {
    color: '#0CB69B',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  completeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    backgroundColor: '#0CB69B',
    marginRight: 8,
  },
  completeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  rescheduleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    backgroundColor: '#e6f7ff',
  },
  rescheduleText: {
    color: '#1890ff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  approvalButtons: {
    flexDirection: 'row',
  },
  approveButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    backgroundColor: '#4CAF50', // Green
    marginRight: 8,
  },
  approveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  rejectButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    backgroundColor: '#F44336', // Red
  },
  rejectText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledButton: {
  opacity: 0.6,
},
});

export default DoctorAppointmentsScreen;

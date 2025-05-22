import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {appointmentService} from '../../services/api';
import {useAuth} from '../../context/AuthContext';

const AppointmentDetailScreen = () => {
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const {userType} = useAuth();

  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    const {appointmentId} = route.params;
    fetchAppointmentDetails(appointmentId);
  }, [route.params]);

  const fetchAppointmentDetails = async appointmentId => {
    try {
      setLoading(true);
      const response = await appointmentService.getAppointmentById(
        appointmentId,
      );

      if (response.success) {
        setAppointment(response.appointment);
      } else {
        Alert.alert('Error', 'Failed to load appointment details');
      }
    } catch (error) {
      console.error('Error fetching appointment details:', error);
      Alert.alert('Error', 'Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async status => {
    try {
      setLoading(true);
      const response = await appointmentService.updateAppointmentStatus(
        appointment.id,
        status,
      );

      if (response.success) {
        setAppointment({
          ...appointment,
          status,
        });
        Alert.alert('Success', `Appointment marked as ${status}`);
      } else {
        Alert.alert('Error', 'Failed to update appointment status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update appointment status');
    } finally {
      setLoading(false);
    }
  };

  const handleStartVideoCall = () => {
    navigation.navigate('VideoCall', {appointmentId: appointment.id});
  };

  const getStatusColor = status => {
    switch (status) {
      case 'scheduled':
        return '#4CAF50';
      case 'completed':
        return '#2196F3';
      case 'cancelled':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0CB69B" />
      </View>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Appointment Details</Text>
          <View style={{width: 40}} />
        </View>

        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={60} color="#F44336" />
          <Text style={styles.errorText}>Appointment not found</Text>
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const appointmentDate = new Date(appointment.appointment_date);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = appointmentDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isUpcoming = new Date() < appointmentDate;
  const isDoctor = userType === 'doctor';
  const isScheduled = appointment.status === 'scheduled';
  const canStartCall =
    isScheduled && Math.abs(new Date() - appointmentDate) / (1000 * 60) <= 30; // within 30 minutes

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                {backgroundColor: `${getStatusColor(appointment.status)}20`},
              ]}>
              <Text
                style={[
                  styles.statusText,
                  {color: getStatusColor(appointment.status)},
                ]}>
                {appointment.status.charAt(0).toUpperCase() +
                  appointment.status.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.dateTimeContainer}>
            <View style={styles.dateContainer}>
              <Icon
                name="calendar-outline"
                size={20}
                color="#0CB69B"
                style={styles.icon}
              />
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
            <View style={styles.timeContainer}>
              <Icon
                name="time-outline"
                size={20}
                color="#0CB69B"
                style={styles.icon}
              />
              <Text style={styles.timeText}>{formattedTime}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.personContainer}>
            <Text style={styles.sectionTitle}>
              {isDoctor ? 'Patient Information' : 'Doctor Information'}
            </Text>

            <View style={styles.personInfo}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {isDoctor
                      ? appointment.patient?.name?.charAt(0) || 'P'
                      : appointment.doctor?.name?.charAt(0) || 'D'}
                  </Text>
                </View>
              </View>

              <View style={styles.personDetails}>
                <Text style={styles.personName}>
                  {isDoctor
                    ? appointment.patient?.name || 'Patient'
                    : `Dr. ${appointment.doctor?.name || 'Doctor'}`}
                </Text>
                {!isDoctor && (
                  <Text style={styles.specialtyText}>
                    {appointment.doctor?.specialty || 'Specialist'}
                  </Text>
                )}
                <Text style={styles.emailText}>
                  {isDoctor
                    ? appointment.patient?.email || 'patient@example.com'
                    : appointment.doctor?.email || 'doctor@example.com'}
                </Text>
              </View>
            </View>
          </View>

          {appointment.reason && (
            <>
              <View style={styles.divider} />
              <View style={styles.reasonContainer}>
                <Text style={styles.sectionTitle}>Reason for Visit</Text>
                <Text style={styles.reasonText}>{appointment.reason}</Text>
              </View>
            </>
          )}

          {appointment.notes && (
            <>
              <View style={styles.divider} />
              <View style={styles.notesContainer}>
                <Text style={styles.sectionTitle}>Doctor's Notes</Text>
                <Text style={styles.notesText}>{appointment.notes}</Text>
              </View>
            </>
          )}

          {canStartCall && (
            <TouchableOpacity
              style={styles.videoCallButton}
              onPress={handleStartVideoCall}>
              <Icon
                name="videocam"
                size={20}
                color="#fff"
                style={styles.videoIcon}
              />
              <Text style={styles.videoCallText}>Join Video Consultation</Text>
            </TouchableOpacity>
          )}
        </View>

        {isDoctor && isScheduled && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleUpdateStatus('completed')}>
              <Text style={styles.actionButtonText}>Mark as Completed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.rescheduleButton]}
              onPress={() =>
                navigation.navigate('RescheduleAppointment', {
                  appointmentId: appointment.id,
                })
              }>
              <Text style={styles.rescheduleButtonText}>Reschedule</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isDoctor && isUpcoming && isScheduled && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() =>
              Alert.alert(
                'Cancel Appointment',
                'Are you sure you want to cancel this appointment?',
                [
                  {text: 'No', style: 'cancel'},
                  {
                    text: 'Yes',
                    onPress: () => handleUpdateStatus('cancelled'),
                    style: 'destructive',
                  },
                ],
              )
            }>
            <Text style={styles.cancelButtonText}>Cancel Appointment</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    marginTop: 10,
    marginBottom: 20,
  },
  goBackButton: {
    backgroundColor: '#0CB69B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  goBackButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusContainer: {
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateTimeContainer: {
    marginBottom: 15,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 15,
  },
  personContainer: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F8F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0CB69B',
  },
  personDetails: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  specialtyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: '#666',
  },
  reasonContainer: {
    marginBottom: 15,
  },
  reasonText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  notesContainer: {
    marginBottom: 15,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  videoCallButton: {
    backgroundColor: '#0CB69B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  videoIcon: {
    marginRight: 8,
  },
  videoCallText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#0CB69B',
    marginRight: 10,
  },
  rescheduleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0CB69B',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rescheduleButtonText: {
    color: '#0CB69B',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#ffebee',
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AppointmentDetailScreen;

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
  Linking,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {appointmentService} from '../../services/api';
import {useAuth} from '../../context/AuthContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const AppointmentDetailScreen = () => {
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const {userType} = useAuth();
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    // Check if we have appointment object or just the ID
    if (route.params.appointment) {
      setAppointment(route.params.appointment);
      setLoading(false);
    } else if (route.params.appointmentId) {
      fetchAppointmentDetails(route.params.appointmentId);
    } else {
      setLoading(false);
      Alert.alert('Error', 'No appointment information provided');
    }

    // If coming from reminder, show directions option
    if (route.params.fromReminder && route.params.appointment) {
      setTimeout(() => {
        Alert.alert(
          'Appointment Reminder',
          'Your appointment is in 1 hour. Would you like directions to the clinic?',
          [
            {text: 'Later', style: 'cancel'},
            {text: 'Get Directions', onPress: handleGetDirections},
          ],
        );
      }, 500);
    }
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

  const handleGetDirections = async () => {
    try {
      setDirectionsLoading(true);

      // Use consistent doctor data access
      const doctorData = getDoctorData();

      // Check if doctor has location data
      if (!doctorData.latitude || !doctorData.longitude) {
        Alert.alert(
          'Location Unavailable',
          'Doctor location information is not available.',
        );
        return;
      }

      const destination = `${doctorData.latitude},${doctorData.longitude}`;
      const destinationName = encodeURIComponent(
        doctorData.location_link || `Dr. ${doctorData.name}'s clinic`,
      );
      let url;

      if (Platform.OS === 'android') {
        // Google Maps URI for Android
        url = `google.navigation:q=${destination}&mode=d`;
      } else {
        // Apple Maps or Google Maps URL for iOS
        url = `https://maps.google.com/maps?daddr=${destination}&dname=${destinationName}&dirflg=d`;
      }

      // Check if the URL can be opened
      const canOpen = await Linking.canOpenURL(url);

      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback to web URL if app link doesn't work
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${destinationName}&travelmode=driving`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      Alert.alert(
        'Navigation Error',
        'Could not open maps application. Please try again.',
      );
    } finally {
      setDirectionsLoading(false);
    }
  };

  // Function to determine status color:

  const getStatusColor = status => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      case 'scheduled':
        return '#0CB69B';
      case 'pending':
        return '#FFC107';
      default:
        return '#0CB69B';
    }
  };

  const getDoctorData = () => {
    return appointment.doctor || appointment.doctors || {};
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

  const renderDirectionsButton = () => {
    // Only show for patients and confirmed appointments
    if (userType === 'doctor' || appointment.status !== 'confirmed') {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.directionsButton}
        onPress={handleGetDirections}
        disabled={directionsLoading}>
        {directionsLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Icon
              name="navigate"
              size={20}
              color="#fff"
              style={styles.directionsIcon}
            />
            <Text style={styles.directionsText}>Get Directions</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  // Modify the part where you access doctor information
  const renderLocationInfo = () => {
    // Get doctor data properly from either structure
    const doctorData = appointment.doctor || appointment.doctors || {};

    if (!isDoctor) {
      if (appointment.status === 'confirmed' && doctorData.location_link) {
        return (
          <>
            <View style={styles.divider} />
            <View style={styles.locationContainer}>
              <Text style={styles.sectionTitle}>Clinic Location</Text>
              <View style={styles.locationRow}>
                <Icon
                  name="location"
                  size={20}
                  color="#0CB69B"
                  style={styles.locationIcon}
                />
                <Text style={styles.locationText}>
                  {doctorData.location_link}
                </Text>
              </View>
            </View>
          </>
        );
      } else if (appointment.status === 'pending') {
        // Add message for pending appointments
        return (
          <>
            <View style={styles.divider} />
            <View style={styles.infoContainer}>
              <Icon
                name="information-circle"
                size={24}
                color="#FFC107"
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>
                Location details and directions will be available once the
                appointment is confirmed by the doctor.
              </Text>
            </View>
          </>
        );
      }
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top}]}>
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
                      : getDoctorData().name?.charAt(0) || 'D'}
                  </Text>
                </View>
              </View>

              <View style={styles.personDetails}>
                <Text style={styles.personName}>
                  {isDoctor
                    ? appointment.patient?.name || 'Patient'
                    : `Dr. ${getDoctorData().name || 'Doctor'}`}
                </Text>
                {!isDoctor && (
                  <Text style={styles.specialtyText}>
                    {getDoctorData().specialty || 'Specialist'}
                  </Text>
                )}
                {/* <Text style={styles.emailText}>
                  {isDoctor
                    ? appointment.patient?.email || 'patient@example.com'
                    : getDoctorData().email || 'doctor@example.com'}
                </Text> */}
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

          {renderDirectionsButton()}
          {renderLocationInfo()}

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
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3897F0', // blue color for directions (different from video call)
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  directionsIcon: {
    marginRight: 8,
  },
  directionsText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  locationContainer: {
    marginTop: 10,
    padding: 15,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 8,
  },
  locationText: {
    flex: 1,
    color: '#555',
    fontSize: 15,
    lineHeight: 22,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  infoIcon: {
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    color: '#555',
    fontSize: 15,
    lineHeight: 22,
  },
});

export default AppointmentDetailScreen;

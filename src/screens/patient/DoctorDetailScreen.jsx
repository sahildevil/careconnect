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
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {doctorService} from '../../services/api';
import {BackButton, CustomButton} from '../../components';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const DoctorDetailScreen = () => {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const {doctor: doctorFromParams, doctorId} = route.params || {};
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (doctorFromParams) {
      // If we received the full doctor object, use it directly
      setDoctor(doctorFromParams);
      setLoading(false);
    } else if (doctorId) {
      // If we only received the ID, fetch the details
      fetchDoctorDetails(doctorId);
    } else {
      // No doctor data provided
      setError(true);
      setLoading(false);
    }
  }, [doctorId, doctorFromParams]);

  const fetchDoctorDetails = async id => {
    try {
      setLoading(true);
      // Add a check for valid ID before making the API call
      if (!id || id === 'undefined') {
        throw new Error('Invalid doctor ID');
      }

      const response = await doctorService.getDoctorById(id);

      if (response.success) {
        setDoctor(response.doctor);
      } else {
        setError(true);
      }
    } catch (error) {
      console.error('Error fetching doctor details:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0CB69B" />
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={60} color="#FF6B6B" />
          <Text style={styles.errorText}>Failed to load doctor details</Text>
          <CustomButton
            title="Go Back"
            onPress={() => navigation.goBack()}
            style={{backgroundColor: '#0CB69B'}}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!doctor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, {paddingTop: insets.top}]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Doctor Details</Text>
          <View style={{width: 40}} />
        </View>

        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={60} color="#FF6B6B" />
          <Text style={styles.errorText}>Doctor not found</Text>
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
        <View style={[styles.header, {paddingTop: insets.top}]}>
        <BackButton color="#fff" />
        <Text style={styles.headerTitle}>Doctor Details</Text>
        <TouchableOpacity style={styles.favoriteButton}>
          <Icon name="heart-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.doctorInfoCard}>
          <View style={styles.doctorBasicInfo}>
            <View style={styles.avatarContainer}>
              {doctor.avatar_url ? (
                <Image
                  source={{uri: doctor.avatar_url}}
                  style={styles.avatar}
                  defaultSource={require('../../assets/images/Doctor_icon.png')}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {doctor.name ? doctor.name.charAt(0).toUpperCase() : 'D'}
                  </Text>
                </View>
              )}
              <View style={styles.onlineIndicator} />
            </View>

            <View style={styles.doctorDetails}>
              <Text style={styles.doctorName}>Dr. {doctor.name}</Text>
              <Text style={styles.specialtyText}>{doctor.specialty}</Text>

              <View style={styles.ratingContainer}>
                <Icon name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{doctor.rating || '4.8'}</Text>
                <Text style={styles.reviewsText}>
                  ({doctor.reviews_count || '124'} Reviews)
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Icon name="people-outline" size={24} color="#0CB69B" />
              <View style={styles.statValueContainer}>
                <Text style={styles.statValue}>
                  {doctor.patients_count || '2.4k+'}
                </Text>
                <Text style={styles.statLabel}>Patients</Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Icon name="business-outline" size={24} color="#0CB69B" />
              <View style={styles.statValueContainer}>
                <Text style={styles.statValue}>
                  {doctor.experience || '8'} yrs+
                </Text>
                <Text style={styles.statLabel}>Experience</Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Icon name="star-outline" size={24} color="#0CB69B" />
              <View style={styles.statValueContainer}>
                <Text style={styles.statValue}>{doctor.rating || '4.8'}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>About Doctor</Text>
          <Text style={styles.aboutText}>
            {doctor.bio ||
              `Dr. ${doctor.name} is a highly skilled ${
                doctor.specialty
              } specialist with ${
                doctor.experience || '8'
              }+ years of experience. Specializing in the diagnosis and treatment of various conditions related to ${
                doctor.specialty
              }.`}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Working Hours</Text>
          <View style={styles.workingHoursContainer}>
            <View style={styles.workingHoursItem}>
              <Text style={styles.dayText}>Monday - Friday</Text>
              <Text style={styles.timeText}>
                {doctor.available_hours || '09:00 AM - 05:00 PM'}
              </Text>
            </View>
            <View style={styles.workingHoursItem}>
              <Text style={styles.dayText}>Saturday</Text>
              <Text style={styles.timeText}>
                {doctor.saturday_hours || '09:00 AM - 01:00 PM'}
              </Text>
            </View>
            <View style={styles.workingHoursItem}>
              <Text style={styles.dayText}>Sunday</Text>
              <Text style={styles.timeText}>Closed</Text>
            </View>
          </View>
        </View>

        <View style={styles.feeAndBookingCard}>
          <View style={styles.feeContainer}>
            <Text style={styles.feeLabel}>Consultation Fee</Text>
            <Text style={styles.feeAmount}>
              ₹{doctor.consultation_fee || '500'}
            </Text>
          </View>

          <CustomButton
            title="Book Appointment"
            onPress={() => navigation.navigate('BookAppointment', {doctor})}
            style={styles.bookAppointmentButton}
            textStyle={styles.bookAppointmentText}
          />
        </View>
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
  favoriteButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
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
  doctorInfoCard: {
    backgroundColor: '#fff',
    padding: 15,
    margin: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  doctorBasicInfo: {
    flexDirection: 'row',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F8F6',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F8F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#0CB69B',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  doctorDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  specialtyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#f0f0f0',
  },
  statValueContainer: {
    marginLeft: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  sectionCard: {
    backgroundColor: '#fff',
    padding: 15,
    margin: 15,
    marginTop: 0,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  workingHoursContainer: {
    marginTop: 5,
  },
  workingHoursItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayText: {
    fontSize: 14,
    color: '#333',
  },
  timeText: {
    fontSize: 14,
    color: '#0CB69B',
    fontWeight: '500',
  },
  feeAndBookingCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    margin: 15,
    marginTop: 0,
    marginBottom: 25,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  feeContainer: {},
  feeLabel: {
    fontSize: 12,
    color: '#666',
  },
  feeAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  bookAppointmentButton: {
    backgroundColor: '#0CB69B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  bookAppointmentText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default DoctorDetailScreen;

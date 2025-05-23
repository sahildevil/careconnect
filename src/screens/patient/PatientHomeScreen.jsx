import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  FlatList,
  ActivityIndicator,
  Platform,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {
  doctorService,
  appointmentService,
  authService,
} from '../../services/api';
import {useAuth} from '../../context/AuthContext';
import Geolocation from 'react-native-geolocation-service';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

// Updated specialties array with all categories
const specialties = [
  {id: 1, name: 'Cardiology', icon: 'heart'},
  {id: 2, name: 'Dermatology', icon: 'body'},
  {id: 3, name: 'Neurology', icon: 'git-branch-outline'},
  {id: 4, name: 'Orthopedics', icon: 'fitness'},
  {id: 5, name: 'Pediatrics', icon: 'people'},
  {id: 6, name: 'Psychiatry', icon: 'chatbubbles'},
  {id: 7, name: 'Gynecology', icon: 'female'},
  {id: 8, name: 'Eye', icon: 'eye'},
  {id: 9, name: 'Dentist', icon: 'medical'},
  {id: 10, name: 'General Medicine', icon: 'medkit'},
];

const PatientHomeScreen = () => {
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [popularDoctors, setPopularDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation();
  const {user} = useAuth();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    fetchData();
    // Request location permission after a short delay
    setTimeout(() => {
      requestLocationPermission();
    }, 1000);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch upcoming appointments
      const appointmentsResponse =
        await appointmentService.getPatientAppointments();
      if (appointmentsResponse.success) {
        setUpcomingAppointments(
          appointmentsResponse.appointments
            .filter(app => new Date(app.appointment_date) >= new Date())
            .slice(0, 5),
        );
      }

      // Fetch popular doctors
      const doctorsResponse = await doctorService.getAllDoctors();
      if (doctorsResponse.success) {
        setPopularDoctors(doctorsResponse.doctors.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Request location permission using the native dialog
  const requestLocationPermission = async () => {
    // Check if user is defined and has an ID
    if (!user || !user.id) {
      console.error('User not authenticated, cannot update location');
      Alert.alert(
        'Authentication Required',
        'Please log in to allow location sharing.',
        [{text: 'OK'}],
      );
      return;
    }

    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'CareConn Location Permission',
            message:
              'CareConn needs access to your location to find nearby doctors',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Location permission granted');
          getAndSaveLocation();
        } else {
          console.log('Location permission denied');
        }
      } else {
        getAndSaveLocation();
      }
    } catch (err) {
      console.warn('Error requesting location permission:', err);
    }
  };

  // Get location and save it to database
  const getAndSaveLocation = () => {
    console.log('Getting user location...');
    Geolocation.getCurrentPosition(
      async position => {
        console.log('Got position:', position);
        const {latitude, longitude} = position.coords;
        try {
          console.log(
            'Updating location for user ID:',
            user.id,
            'with latitude:',
            latitude,
            'longitude:',
            longitude,
          );
          const response = await authService.updateUserLocation(user.id, {
            latitude,
            longitude,
            last_location_update: new Date().toISOString(),
          });
          console.log('Location update response:', response);
          if (response.success) {
            console.log('Location updated successfully');
          } else {
            console.error('Failed to update location:', response.message);
          }
        } catch (error) {
          console.error('Error updating location:', error);
        }
      },
      error => {
        // More detailed error logging
        console.error(
          'Error getting current location - code:',
          error.code,
          'message:',
          error.message,
        );

        // Handle specific error codes
        let message = 'Failed to get your location. ';
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            message += 'Location permission was denied.';
            break;
          case 2: // POSITION_UNAVAILABLE
            message += 'Location information is unavailable.';
            break;
          case 3: // TIMEOUT
            message += 'The request to get user location timed out.';
            break;
          default:
            message += error.message;
        }

        Alert.alert('Location Error', message, [{text: 'OK'}]);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  };

  const renderAppointmentItem = ({item}) => {
    // Get doctor data consistently
    const doctorData = item.doctor || item.doctors || {};

    // Format date and time
    const appointmentDate = new Date(item.appointment_date);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Get status color
    const getStatusColor = status => {
      switch (status) {
        case 'confirmed':
        case 'scheduled':
          return '#0CB69B'; // green
        case 'pending':
          return '#FFC107'; // yellow/amber
        case 'completed':
          return '#4CAF50'; // green
        case 'cancelled':
        case 'canceled':
          return '#F44336'; // red
        default:
          return '#888888'; // gray
      }
    };

    return (
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() =>
          navigation.navigate('AppointmentDetail', {appointment: item})
        }>
        <View style={styles.appointmentType}>
          <Text style={styles.appointmentText}>
            {item.appointment_type
              ? item.appointment_type.charAt(0).toUpperCase() +
                item.appointment_type.slice(1)
              : 'Consultation'}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {backgroundColor: getStatusColor(item.status) + '20'}, // 20% opacity
            ]}>
            <Text
              style={[styles.statusText, {color: getStatusColor(item.status)}]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.dateTimeInfo}>
          <View style={styles.dateRow}>
            <Icon name="calendar-outline" size={14} color="#0CB69B" />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          <View style={styles.timeRow}>
            <Icon name="time-outline" size={14} color="#0CB69B" />
            <Text style={styles.timeText}>{formattedTime}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.doctorInfo}>
          <View style={styles.doctorAvatar}>
            <Text style={styles.doctorInitial}>
              {doctorData.name ? doctorData.name.charAt(0) : 'D'}
            </Text>
          </View>
          <View>
            <Text style={styles.doctorName}>
              Dr. {doctorData.name || 'Doctor'}
            </Text>
            <Text style={styles.doctorSpecialtyText}>
              {doctorData.specialty || 'Specialist'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDoctorItem = ({item}) => (
    <TouchableOpacity
      style={styles.doctorCard}
      onPress={() => navigation.navigate('DoctorDetail', {doctorId: item.id})}>
      <View style={styles.popularDoctorInfo}>
        <View>
          <View style={styles.doctorStatus}>
            <View style={styles.statusDot}></View>
            <Text style={styles.doctorName}>Dr. {item.name}</Text>
          </View>
          <Text style={styles.doctorSpecialty}>{item.specialty}</Text>
        </View>
        <View style={styles.ratingContainer}>
          <Icon name="star" size={14} color="#FFD700" />
          <Text style={styles.rating}>{item.rating || '4.5'}</Text>
        </View>
      </View>
      <View style={styles.appointmentDetails}>
        <TouchableOpacity
          style={styles.appointmentButton}
          onPress={() =>
            navigation.navigate('BookAppointment', {doctor: item})
          }>
          <Text style={styles.appointmentButtonText}>Appointment</Text>
        </TouchableOpacity>
        <View style={styles.timeContainer}>
          <Icon name="time-outline" size={16} color="#888" />
          <Text style={styles.timeText}>
            {item.available_hours || '09:00 AM - 05:00 PM'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Function to get different colors for specialty icons
  const getSpecialtyColor = specialty => {
    const colorMap = {
      Cardiology: '#FF6B6B',
      Dermatology: '#6BCB77',
      Neurology: '#4D96FF',
      Orthopedics: '#FFD93D',
      Pediatrics: '#FF9A8C',
      Psychiatry: '#7882A4',
      Gynecology: '#F78CAB',
      Eye: '#5FBDFF',
      Dentist: '#0CB69B',
      'General Medicine': '#5F7ADB',
      Other: '#8D8DAA',
    };

    return colorMap[specialty] || '#0CB69B';
  };

  const renderSpecialtyItem = ({item}) => (
    <TouchableOpacity
      style={styles.specialtyItem}
      onPress={() => navigation.navigate('DoctorList', {specialty: item.name})}>
      <View
        style={[
          styles.specialtyIcon,
          {backgroundColor: getSpecialtyColor(item.name)},
        ]}>
        <Icon name={item.icon} size={22} color="#FFFFFF" />
      </View>
      <Text style={styles.specialtyText}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container]}>
      <StatusBar barStyle="dark-content" backgroundColor="#0CB69B" />
      <View style={[styles.headerBackground, {paddingTop: insets.top}]}>
        <SafeAreaView>
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <View>
                <Text style={styles.greeting}>
                  Hi, {user?.name || 'there'}!
                </Text>
                <Text style={styles.subText}>How are you today?</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}>
              <Icon name="notifications-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Icon
              name="search"
              size={20}
              color="#888"
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Search doctor by name!"
              placeholderTextColor="#888"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() =>
                navigation.navigate('DoctorList', {searchQuery})
              }
            />
            <TouchableOpacity style={styles.micButton}>
              <Icon name="mic" size={20} color="#FFF" />
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
          {/* Today Appointments */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Appointments')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {upcomingAppointments.length > 0 ? (
            <FlatList
              data={upcomingAppointments}
              renderItem={renderAppointmentItem}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.appointmentsContainer}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                No upcoming appointments
              </Text>
              <TouchableOpacity
                style={styles.bookNowButton}
                onPress={() => navigation.navigate('DoctorList')}>
                <Text style={styles.bookNowText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Doctor Specialty */}
          <View style={[styles.sectionHeader, {marginTop: 10}]}>
            <Text style={styles.sectionTitle}>Doctor Specialty</Text>
            <TouchableOpacity onPress={() => navigation.navigate('DoctorList')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={specialties}
            renderItem={renderSpecialtyItem}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.specialtyContainer}
            initialNumToRender={7}
            maxToRenderPerBatch={10}
          />

          {/* Popular Doctors */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Doctors</Text>
            <TouchableOpacity onPress={() => navigation.navigate('DoctorList')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {popularDoctors.map((doctor, index) => (
            <TouchableOpacity
              key={doctor.id} // Use doctor.id as key
              style={styles.doctorCard}
              onPress={() => navigation.navigate('DoctorDetail', {doctor})}>
              <View style={styles.popularDoctorInfo}>
                <View>
                  <View style={styles.doctorStatus}>
                    <View style={styles.statusDot}></View>
                    <Text style={styles.doctorName}>Dr. {doctor.name}</Text>
                  </View>
                  <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                </View>
                <View style={styles.ratingContainer}>
                  <Icon name="star" size={14} color="#FFD700" />
                  <Text style={styles.rating}>{doctor.rating || '4.5'}</Text>
                </View>
              </View>
              <View style={styles.appointmentDetails}>
                <TouchableOpacity
                  style={styles.appointmentButton}
                  onPress={() =>
                    navigation.navigate('BookAppointment', {doctor: doctor})
                  }>
                  <Text style={styles.appointmentButtonText}>Appointment</Text>
                </TouchableOpacity>
                <View style={styles.timeContainer}>
                  <Icon name="time-outline" size={16} color="#888" />
                  <Text style={styles.timeText}>
                    {doctor.available_hours || '09:00 AM - 05:00 PM'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBackground: {
    backgroundColor: '#0CB69B', // #0CB69B
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#FFF',
    borderRadius: 30,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  micButton: {
    backgroundColor: '#0CB69B',
    borderRadius: 50,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
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
  appointmentsContainer: {
    paddingLeft: 20,
    paddingVertical: 10,
  },
  appointmentCard: {
    width: 250, // Make the card wider to fit more content
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginRight: 15,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentType: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appointmentText: {
    fontSize: 15,
    fontWeight: '500',
  },
  waitingText: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  appointmentTime: {
    fontSize: 12,
    color: '#888',
  },
  specialtyContainer: {
    paddingLeft: 15,
    paddingRight: 15,
    paddingVertical: 10,
  },
  specialtyItem: {
    alignItems: 'center',
    marginRight: 14,
    width: 70, // Fixed width for consistency
  },
  specialtyIcon: {
    width: 55,
    height: 55,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  specialtyText: {
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
    width: 80, // Increased width to fit longer words
    whiteSpace: 'nowrap', // Prevent line break
    overflow: 'hidden', // Hide overflow
    textOverflow: 'ellipsis', // Show ellipsis if text overflows
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    margin: 20,
    marginTop: 10,
    marginBottom: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  popularDoctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  doctorStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0CB69B',
    marginRight: 8,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: 3,
    fontSize: 14,
    color: '#333',
  },
  appointmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  appointmentButton: {
    backgroundColor: '#E6F8F6',
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  appointmentButtonText: {
    color: '#0CB69B',
    fontWeight: '500',
    fontSize: 14,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 5,
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  bookNowButton: {
    backgroundColor: '#0CB69B',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  bookNowText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  dateTimeInfo: {
    marginTop: 12,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
  doctorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F8F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  doctorInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0CB69B',
  },
  doctorSpecialtyText: {
    fontSize: 12,
    color: '#888',
  },
});

export default PatientHomeScreen;

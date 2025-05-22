import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TextInput,
  Image,
  TouchableOpacity,
  StatusBar,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {doctorService, appointmentService} from '../../services/api';
import {useAuth} from '../../context/AuthContext';

const specialties = [
  {id: 1, name: 'Dentist', icon: 'medical'},
  {id: 2, name: 'Cardiology', icon: 'heart'},
  {id: 3, name: 'Neurology', icon: 'brain'},
  {id: 4, name: 'Orthopedic', icon: 'body'},
  {id: 5, name: 'Kidney Sp.', icon: 'water'},
];

const PatientHomeScreen = () => {
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [popularDoctors, setPopularDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation();
  const {user} = useAuth();

  useEffect(() => {
    fetchData();
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

  const renderAppointmentItem = ({item}) => (
    <TouchableOpacity
      style={styles.appointmentCard}
      onPress={() =>
        navigation.navigate('AppointmentDetail', {appointment: item})
      }>
      <View style={styles.appointmentType}>
        <Text style={styles.appointmentText}>
          {item.appointment_type || 'Consultation'}
        </Text>
        <Icon name="videocam" size={18} color="#008080" />
      </View>
      <Text style={styles.waitingText}>
        {new Date(item.appointment_date) > new Date()
          ? 'Upcoming'
          : 'Waiting for call'}
      </Text>
      <View style={styles.doctorInfo}>
        <View>
          <Text style={styles.doctorName}>
            Dr. {item.doctor?.name || 'Doctor'}
          </Text>
          <Text style={styles.appointmentTime}>
            {new Date(item.appointment_date).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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

  const renderSpecialtyItem = ({item}) => (
    <TouchableOpacity
      style={styles.specialtyItem}
      onPress={() => navigation.navigate('DoctorList', {specialty: item.name})}>
      <View style={[styles.specialtyIcon, {backgroundColor: '#E6F8F6'}]}>
        <Icon name={item.icon} size={24} color="#008080" />
      </View>
      <Text style={styles.specialtyText}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#008080" />

      <View style={styles.headerBackground}>
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
              placeholder="Search doctor by name"
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
          <ActivityIndicator size="large" color="#008080" />
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Doctor Specialty</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Specialties')}>
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
          />

          {/* Popular Doctors */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Doctors</Text>
            <TouchableOpacity onPress={() => navigation.navigate('DoctorList')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {popularDoctors.map(doctor => renderDoctorItem({item: doctor}))}
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
    backgroundColor: '#008080', // #0CB69B
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
    backgroundColor: '#008080',
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
    marginTop: 25,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAll: {
    fontSize: 14,
    color: '#008080',
    fontWeight: '500',
  },
  appointmentsContainer: {
    paddingLeft: 20,
    paddingVertical: 15,
  },
  appointmentCard: {
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginRight: 15,
    marginVertical: 8,
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
    paddingLeft: 20,
  },
  specialtyItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  specialtyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialtyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#333',
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
    backgroundColor: '#008080',
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
    color: '#008080',
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
    backgroundColor: '#008080',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  bookNowText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default PatientHomeScreen;
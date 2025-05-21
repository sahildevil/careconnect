import React from 'react';
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
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const Homescreen = () => {
  return (
    <View style={styles.container}>
      {/* Status Bar */}
      <StatusBar barStyle="light-content" backgroundColor="#0CB69B" />
      
      {/* Teal Background Header Area */}
      <View style={styles.headerBackground}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.userInfo}>
              {/* <Image
                source={require('../assets/avatar.png')}
                style={styles.avatar}
              /> */}
              <View>
                <Text style={styles.greeting}>Hi, Smith Jack!</Text>
                <Text style={styles.subText}>How are you today?</Text>
              </View>
            </View>
            <TouchableOpacity>
              <Icon name="notifications-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#888" style={styles.searchIcon} />
            <TextInput
              placeholder="Search doctor by name"
              style={styles.searchInput}
            />
            <TouchableOpacity style={styles.micButton}>
              <Icon name="mic" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* Rest of the content in white background */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.contentContainer}>
        {/* Today Appointments */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today Appointments</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.appointmentsContainer}>
          {/* Appointment Card 1 */}
          <View style={styles.appointmentCard}>
            <View style={styles.appointmentType}>
              <Text style={styles.appointmentText}>Video Consultation</Text>
              <Icon name="videocam" size={18} color="#0CB69B" />
            </View>
            <Text style={styles.waitingText}>Waiting for call</Text>
            <View style={styles.doctorInfo}>
              {/* <Image
                source={require('../assets/doctor1.png')}
                style={styles.doctorImage}
              /> */}
              <View>
                <Text style={styles.doctorName}>Dr. Eleanor Shaw</Text>
                <Text style={styles.appointmentTime}>10:00 AM</Text>
              </View>
            </View>
          </View>

          {/* Appointment Card 2 */}
          <View style={styles.appointmentCard}>
            <View style={styles.appointmentType}>
              <Text style={styles.appointmentText}>Video Consultation</Text>
              <Icon name="videocam" size={18} color="#0CB69B" />
            </View>
            <Text style={styles.waitingText}>Waiting for call</Text>
            <View style={styles.doctorInfo}>
              {/* <Image
                source={require('../assets/doctor2.png')}
                style={styles.doctorImage}
              /> */}
              <View>
                <Text style={styles.doctorName}>Dr. Randy</Text>
                <Text style={styles.appointmentTime}>11:30 AM</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Doctor Specialty */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Doctor Specialty</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.specialtyContainer}>
          <TouchableOpacity style={styles.specialtyItem}>
            <View style={[styles.specialtyIcon, {backgroundColor: '#E6F8F6'}]}>
              <Icon name="medical" size={24} color="#0CB69B" />
            </View>
            <Text style={styles.specialtyText}>Dentist</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.specialtyItem}>
            <View style={[styles.specialtyIcon, {backgroundColor: '#E6F8F6'}]}>
              <Icon name="heart" size={24} color="#0CB69B" />
            </View>
            <Text style={styles.specialtyText}>Cardiology</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.specialtyItem}>
            <View style={[styles.specialtyIcon, {backgroundColor: '#E6F8F6'}]}>
              <Icon name="brain" size={24} color="#0CB69B" />
            </View>
            <Text style={styles.specialtyText}>Neurology</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.specialtyItem}>
            <View style={[styles.specialtyIcon, {backgroundColor: '#E6F8F6'}]}>
              <Icon name="body" size={24} color="#0CB69B" />
            </View>
            <Text style={styles.specialtyText}>Orthopedic</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.specialtyItem}>
            <View style={[styles.specialtyIcon, {backgroundColor: '#E6F8F6'}]}>
              <Icon name="water" size={24} color="#0CB69B" />
            </View>
            <Text style={styles.specialtyText}>Kidney Sp.</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Popular Doctors */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Doctors</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {/* Popular Doctor Card */}
        <View style={styles.doctorCard}>
          {/* <Image
            source={require('../assets/doctor3.png')}
            style={styles.popularDoctorImage}
          /> */}
          <View style={styles.popularDoctorInfo}>
            <View>
              <View style={styles.doctorStatus}>
                <View style={styles.statusDot}></View>
                <Text style={styles.doctorName}>Dr. Sunaki Sinha</Text>
              </View>
              <Text style={styles.doctorSpecialty}>Anesthesiology</Text>
            </View>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={14} color="#FFD700" />
              <Text style={styles.rating}>4.8</Text>
            </View>
          </View>
          <View style={styles.appointmentDetails}>
            <TouchableOpacity style={styles.appointmentButton}>
              <Text style={styles.appointmentButtonText}>Appointment</Text>
            </TouchableOpacity>
            <View style={styles.timeContainer}>
              <Icon name="time-outline" size={16} color="#888" />
              <Text style={styles.timeText}>10:30 AM - 2:00 PM</Text>
            </View>
          </View>
        </View>

        {/* Popular Doctor Card */}
        <View style={styles.doctorCard}>
          {/* <Image
            source={require('../assets/doctor4.png')}
            style={styles.popularDoctorImage}
          /> */}
          <View style={styles.popularDoctorInfo}>
            <View>
              <View style={styles.doctorStatus}>
                <View style={styles.statusDot}></View>
                <Text style={styles.doctorName}>Dr. Kamala Ragimova</Text>
              </View>
              <Text style={styles.doctorSpecialty}>General Practitioner</Text>
            </View>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={14} color="#FFD700" />
              <Text style={styles.rating}>4.8</Text>
            </View>
          </View>
          <View style={styles.appointmentDetails}>
            <TouchableOpacity style={styles.appointmentButton}>
              <Text style={styles.appointmentButtonText}>Appointment</Text>
            </TouchableOpacity>
            <View style={styles.timeContainer}>
              <Icon name="time-outline" size={16} color="#888" />
              <Text style={styles.timeText}>10:30 AM - 2:00 PM</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="home" size={24} color="#0CB69B" />
          <Text style={[styles.navText, styles.activeNavText]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="calendar-outline" size={24} color="#888" />
          <Text style={styles.navText}>Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="chatbubble-outline" size={24} color="#888" />
          <Text style={styles.navText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="person-outline" size={24} color="#888" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Homescreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Find this style definition in your styles object
headerBackground: {
  backgroundColor: '#0CB69B',
  paddingBottom: 20,
  borderBottomLeftRadius: 25,
  borderBottomRightRadius: 25,
},
  // safeArea: {
  //   paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  // },
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'white',
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
    color: '#0CB69B',
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
    shadowOffset: { width: 0, height: 2 },
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
  doctorImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  popularDoctorImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
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
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 10,
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    marginTop: 5,
    color: '#888',
  },
  activeNavText: {
    color: '#0CB69B',
    fontWeight: '500',
  },
});
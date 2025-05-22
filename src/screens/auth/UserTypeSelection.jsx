import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Image,
  StatusBar,
} from 'react-native';

const UserTypeSelection = ({navigation}) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      <View style={styles.headerContainer}>
        <Text style={styles.logoText}>CareConnect</Text>
        <Text style={styles.welcomeText}>Welcome to CareConnect</Text>
        <Text style={styles.subtitleText}>
          Choose how you want to use this application
        </Text>
      </View>

      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Login', {userType: 'patient'})}>
          <View style={styles.cardIconContainer}>
            {/* <Image
              source={require('../../assets/patient-icon.png')}
              style={styles.cardIcon}
              resizeMode="contain"
            /> */}
          </View>
          <Text style={styles.cardTitle}>I'm a Patient</Text>
          <Text style={styles.cardDescription}>
            Find and book appointments with doctors
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Login', {userType: 'doctor'})}>
          <View style={styles.cardIconContainer}>
            {/* <Image
              source={require('../../assets/doctor-icon.png')}
              style={styles.cardIcon}
              resizeMode="contain"
            /> */}
          </View>
          <Text style={styles.cardTitle}>I'm a Doctor</Text>
          <Text style={styles.cardDescription}>
            Manage your appointments and patients
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.helpContainer}>
        <Text style={styles.helpText}>Need help?</Text>
        <TouchableOpacity>
          <Text style={styles.contactText}>Contact support</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0CB69B',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  cardContainer: {
    marginBottom: 40,
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e6f7f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    width: 50,
    height: 50,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  helpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
  },
  contactText: {
    fontSize: 14,
    color: '#0CB69B',
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default UserTypeSelection;

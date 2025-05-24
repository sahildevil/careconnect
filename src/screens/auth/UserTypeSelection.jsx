import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const UserTypeSelection = ({navigation}) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      <View style={styles.topRightShape} />
      <View style={styles.bottomRightShape} />
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
            <Image
              source={require('../../assets/images/Patient.jpg')}
              style={styles.cardIcon}
              resizeMode="contain"
            />
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
            <Image
              source={require('../../assets/images/Doctor_icon.png')}
              style={styles.cardIcon2}
              resizeMode="contain"
            />
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
    position: 'relative', // Important for positioning the curved shape
  },
  // Green curved shape styling
  topRightShape: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.7 / 2,
    backgroundColor: '#5cedd7',//#0CB69B
    zIndex: 0,
  },
  bottomRightShape: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.7 / 2,
    backgroundColor: '#5cedd7',//#0CB69B
    zIndex: 0,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
    zIndex: 1,
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
    zIndex: 1,
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
    elevation: 1,
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
    width: 70,
    height: 70,
    borderRadius: 50,
  },
  cardIcon2: {
    width: 74,
    height: 74,
    borderRadius: 50,
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
    zIndex: 1,
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

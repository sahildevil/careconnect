import React, {useEffect} from 'react';
import {StyleSheet, View, Image, Text, StatusBar} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';

const SplashScreen = () => {
  const navigation = useNavigation();
  const {isAuthenticated, userType} = useAuth();

  useEffect(() => {
    // Simulate splash screen for 2 seconds, then navigate
    setTimeout(() => {
      if (isAuthenticated) {
        // Already logged in, navigate to the appropriate flow
        if (userType === 'doctor') {
          navigation.replace('DoctorFlow');
        } else {
          navigation.replace('PatientFlow');
        }
      } else {
        // Not logged in, navigate to auth
        navigation.replace('Auth');
      }
    }, 2000);
  }, [navigation, isAuthenticated, userType]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0CB69B" barStyle="light-content" />
      <View style={styles.logoContainer}>
        {/* <Image
          // Replace with your logo
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        /> */}
        <Text style={styles.appName}>CareConnect</Text>
        <Text style={styles.tagline}>Your Health, Our Priority</Text>
      </View>
      <Text style={styles.versionText}>Version 1.0</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0CB69B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  versionText: {
    position: 'absolute',
    bottom: 30,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

export default SplashScreen;

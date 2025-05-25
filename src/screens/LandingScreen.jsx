import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const LandingScreen = () => {
  const navigation = useNavigation();

  const handleGetStarted = () => {
    // Navigate to the next screen (e.g., UserTypeSelection)
    navigation.navigate('UserTypeSelection');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00B489" />
      
      <View style={styles.contentContainer}>
        <View style={styles.imageContainer}>
          <Image
            source={require('../assets/images/doc3.png')} // Replace with your image path
            style={styles.doctorImage}
            resizeMode="cover"
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>CareConnect</Text>
          <Text style={styles.subtitle}>
            Book Care. Anytime. Anywhere.
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00B489', // The green background color
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: height * 0.08,
    paddingHorizontal: 24,
  },
  imageContainer: {
    width: width ,
    height: width,
    borderRadius: width * 0.4,
    backgroundColor: '#ffffff20', // Slightly white transparent circle
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: height * 0.05,
  },
  doctorImage: {
    width: width ,
    height: width ,
  },
  textContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  title: {
    fontSize: 35,
    fontWeight: '700',
    color: 'white',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#ffffffdd', // Slightly transparent white
    lineHeight: 22,
  },
  button: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: width * 0.85,
    alignItems: 'center',
    marginBottom: 16,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    // Shadow for Android
    elevation: 3,
  },
  buttonText: {
    color: '#00B489',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LandingScreen;
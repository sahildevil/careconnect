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
            source={require('../assets/images/doctor_potrait2.png')} // Replace with your image path
            style={styles.doctorImage}
            resizeMode="cover"
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>Doctor App</Text>
          <Text style={styles.subtitle}>
            Book an appointment with doctor. Chat with doctor via appointment letter and get consultation
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
    fontSize: 28,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
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
// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   SafeAreaView,
//   StatusBar,
//   Dimensions,
//   ImageBackground,
// } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import { BlurView } from '@react-native-community/blur'; // You'll need to install this

// const LandingScreen = () => {
//   const navigation = useNavigation();

//   const handleGetStarted = () => {
//     // Navigate to the next screen (e.g., UserTypeSelection)
//     navigation.navigate('UserTypeSelection');
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor="#00B489" />
      
//       <View style={styles.contentContainer}>
//         <View style={styles.imageContainer}>
//           <Image
//             source={require('../assets/images/doctor_potrait2.png')} // Replace with your image path
//             style={styles.doctorImage}
//             resizeMode="cover"
//           />
//         </View>
        
//         <View style={styles.textContainer}>
//           <Text style={styles.title}>Doctor App</Text>
//           <Text style={styles.subtitle}>
//             Book an appointment with doctor. Chat with doctor via appointment letter and get consultation
//           </Text>
//         </View>
        
//         <TouchableOpacity 
//           style={styles.button}
//           onPress={handleGetStarted}
//           activeOpacity={0.8}
//         >
//           <Text style={styles.buttonText}>Get Started</Text>
//         </TouchableOpacity>
//       </View>
//     </SafeAreaView>
//   );
// };

// const { width, height } = Dimensions.get('window');

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#00B489', // The green background color
//   },
//   contentContainer: {
//     flex: 1,
//     justifyContent: 'space-between',
//     paddingBottom: height * 0.05,
//   },
//   imageContainer: {
//     width: width,
//     height: height * 0.65, // Takes up about 65% of screen height
//     position: 'relative',
//     justifyContent: 'center',
//     alignItems: 'center',
//     overflow: 'hidden',
//   },
//   doctorImage: {
//     width: width * 1.2, // Slightly wider than screen for better coverage
//     height: height * 0.7,
//     position: 'absolute',
//     top: -20,
//   },

//   textContainer: {
//     alignItems: 'center',
//     paddingHorizontal: 24,
//     marginVertical: 30,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: '600',
//     color: 'white',
//     marginBottom: 12,
//     textAlign: 'center',
//   },
//   subtitle: {
//     fontSize: 16,
//     textAlign: 'center',
//     color: '#ffffffdd', // Slightly transparent white
//     lineHeight: 22,
//     paddingHorizontal: 20,
//   },
//   button: {
//     backgroundColor: 'white',
//     paddingVertical: 16,
//     paddingHorizontal: 32,
//     borderRadius: 30,
//     width: width * 0.85,
//     alignItems: 'center',
//     alignSelf: 'center',
//     marginBottom: 20,
//     // Shadow for Android
//     elevation: 3,
//   },
//   buttonText: {
//     color: '#00B489',
//     fontSize: 16,
//     fontWeight: '600',
//   },
// });

// export default LandingScreen;
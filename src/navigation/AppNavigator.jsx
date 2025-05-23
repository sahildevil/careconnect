import React, {useEffect} from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {ActivityIndicator, View, StyleSheet} from 'react-native';
import {useAuth} from '../context/AuthContext';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import Login from '../screens/auth/Login';
import SignUp from '../screens/auth/SignUp';
import ForgotPassword from '../screens/auth/ForgotPassword';
import UserTypeSelection from '../screens/auth/UserTypeSelection';
import DoctorSignUp from '../screens/auth/DoctorSignUp';

// Patient Screens
import PatientHomeScreen from '../screens/patient/PatientHomeScreen';
import PatientAppointmentsScreen from '../screens/patient/PatientAppointmentsScreen';
import PatientProfileScreen from '../screens/patient/PatientProfileScreen';
import DoctorListScreen from '../screens/patient/DoctorListScreen';
import DoctorDetailScreen from '../screens/patient/DoctorDetailScreen';
import BookAppointmentScreen from '../screens/patient/BookAppointmentScreen';
import PatientTabNavigator from './PatientTabNavigator';

// Doctor Screens
import DoctorHomeScreen from '../screens/doctor/DoctorHomeScreen';
import DoctorAppointmentsScreen from '../screens/doctor/DoctorAppointmentsScreen';
import DoctorProfileScreen from '../screens/doctor/DoctorProfileScreen';
import DoctorScheduleScreen from '../screens/doctor/DoctorScheduleScreen';
import DoctorTabNavigator from './DoctorTabNavigator';
import AppointmentDetailScreen from '../screens/shared/AppointmentDetailScreen';
import DoctorOnboardingScreen from '../screens/doctor/DoctorOnboardingScreen';

//shared screens
import LandingScreen from '../screens/LandingScreen';
import NotificationsScreen from '../screens/common/NotificationsScreen';

const Stack = createStackNavigator();
const AuthStack = createStackNavigator();
const PatientStack = createStackNavigator();
const DoctorStack = createStackNavigator();

// Authentication Navigator
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      initialRouteName="Landing"
      screenOptions={{
        headerShown: false,
      }}>
      <AuthStack.Screen name="Landing" component={LandingScreen} />
      <AuthStack.Screen
        name="UserTypeSelection"
        component={UserTypeSelection}
      />
      <AuthStack.Screen name="Login" component={Login} />
      <AuthStack.Screen name="SignUp" component={SignUp} />
      <AuthStack.Screen name="DoctorSignUp" component={DoctorSignUp} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPassword} />
    </AuthStack.Navigator>
  );
};

// Patient Navigator
const PatientNavigator = () => {
  return (
    <PatientStack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <PatientStack.Screen name="PatientTabs" component={PatientTabNavigator} />
      <PatientStack.Screen name="DoctorList" component={DoctorListScreen} />
      <PatientStack.Screen name="DoctorDetail" component={DoctorDetailScreen} />
      <PatientStack.Screen
        name="BookAppointment"
        component={BookAppointmentScreen}
      />
      <PatientStack.Screen
        name="AppointmentDetail"
        component={AppointmentDetailScreen}
      />
    </PatientStack.Navigator>
  );
};

// Doctor Navigator
const DoctorNavigator = () => {
  return (
    <DoctorStack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <DoctorStack.Screen name="DoctorTabs" component={DoctorTabNavigator} />
      <DoctorStack.Screen
        name="DoctorOnboarding"
        component={DoctorOnboardingScreen}
      />
      <DoctorStack.Screen
        name="DoctorSchedule"
        component={DoctorScheduleScreen}
      />
      <DoctorStack.Screen
        name="AppointmentDetail"
        component={AppointmentDetailScreen}
      />
    </DoctorStack.Navigator>
  );
};

const AppNavigator = () => {
  const auth = useAuth();
  const {loading, userType, user} = auth;
  const isAuthenticated = !!user; // Directly calculate isAuthenticated from user

  // Add console log for debugging
  useEffect(() => {
    console.log('AppNavigator - Auth state:', {
      isAuthenticated: !!user, // Calculate directly from user state
      userType,
      userId: user?.id,
      loading,
    });
  }, [user, userType, loading]);

  // Add a check for doctor needing onboarding
  const needsDoctorOnboarding = React.useMemo(() => {
    if (isAuthenticated && userType === 'doctor' && user) {
      return !user.profile || user.profile.onboarding_complete === false;
    }
    return false;
  }, [isAuthenticated, userType, user]);

  // Inside your AppNavigator component
  useEffect(() => {
    // Add this for better debugging
    if (!isAuthenticated && !loading) {
      console.log('User is not authenticated, navigating to auth screens');
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0CB69B" />
      </View>
    );
  }

  // Determine the initial route based on authentication and onboarding state
  let initialRoute = 'Auth';
  if (isAuthenticated) {
    if (userType === 'doctor') {
      initialRoute = needsDoctorOnboarding ? 'DoctorOnboarding' : 'DoctorFlow';
    } else {
      initialRoute = 'PatientFlow';
    }
  }

  console.log('Initial route selected:', initialRoute);

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Auth" component={AuthNavigator} />
      <Stack.Screen name="DoctorFlow" component={DoctorNavigator} />
      <Stack.Screen name="PatientFlow" component={PatientNavigator} />
      <Stack.Screen
        name="DoctorOnboarding"
        component={DoctorOnboardingScreen}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default AppNavigator;

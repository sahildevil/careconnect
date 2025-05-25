import React, {useEffect, useState, useMemo} from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {ActivityIndicator, View, StyleSheet, AppState} from 'react-native';
import {useAuth} from '../context/AuthContext';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import Login from '../screens/auth/Login';
import SignUp from '../screens/auth/SignUp';
import ForgotPassword from '../screens/auth/ForgotPassword';
import UserTypeSelection from '../screens/auth/UserTypeSelection';
import DoctorSignUp from '../screens/auth/DoctorSignUp';

// Patient Screens
import DoctorListScreen from '../screens/patient/DoctorListScreen';
import DoctorDetailScreen from '../screens/patient/DoctorDetailScreen';
import BookAppointmentScreen from '../screens/patient/BookAppointmentScreen';
import PatientTabNavigator from './PatientTabNavigator';

// Doctor Screens
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
  const {
    loading,
    userType,
    user,
    isAuthenticated,
    isInitialized,
    refreshAuthState,
  } = auth;
  const [appState, setAppState] = useState(AppState.currentState);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      console.log(
        'AppNavigator - AppState changed:',
        appState,
        '->',
        nextAppState,
      );

      if (
        appState.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isInitialized
      ) {
        console.log('App resumed, refreshing auth state...');
        refreshAuthState();
      }

      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [appState, isInitialized, refreshAuthState]);

  useEffect(() => {
    console.log('AppNavigator - Auth state:', {
      isAuthenticated,
      userType,
      userId: user?.id,
      loading,
      isInitialized,
    });
  }, [user, userType, loading, isAuthenticated, isInitialized]);

  const needsDoctorOnboarding = useMemo(() => {
    if (isAuthenticated && userType === 'doctor' && user) {
      return !user.profile || user.profile.onboarding_complete === false;
    }
    return false;
  }, [isAuthenticated, userType, user]);

  const initialRoute = useMemo(() => {
    if (!isAuthenticated) {
      return 'Auth';
    }

    if (userType === 'doctor') {
      return needsDoctorOnboarding ? 'DoctorOnboarding' : 'DoctorFlow';
    } else {
      return 'PatientFlow';
    }
  }, [isAuthenticated, userType, needsDoctorOnboarding]);

  if (!isInitialized || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0CB69B" />
      </View>
    );
  }

  console.log('AppNavigator - Initial route selected:', initialRoute);

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

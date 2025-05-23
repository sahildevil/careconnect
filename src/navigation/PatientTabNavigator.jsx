import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import NotificationBadge from '../components/NotificationBadge';

// Import Patient Screens
import PatientHomeScreen from '../screens/patient/PatientHomeScreen';
import PatientAppointmentsScreen from '../screens/patient/PatientAppointmentsScreen';
import PatientProfileScreen from '../screens/patient/PatientProfileScreen';

const Tab = createBottomTabNavigator();

const PatientTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Appointments') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0CB69B',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}>
      <Tab.Screen
        name="Home"
        component={PatientHomeScreen}
        options={{
          headerTitle: 'CareConnect',
          headerRight: () => <NotificationBadge />,
        }}
      />
      <Tab.Screen name="Appointments" component={PatientAppointmentsScreen} />
      <Tab.Screen name="Profile" component={PatientProfileScreen} />
    </Tab.Navigator>
  );
};

export default PatientTabNavigator;

import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import {AuthProvider} from './src/context/AuthContext';
import 'react-native-gesture-handler';
import {notificationService} from './src/services/notifications';

const App = () => {
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        console.log('Initializing notification service...');
        await notificationService.init();
        console.log('Notification service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize notification service:', error);
      }
    };

    initializeNotifications();
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
};

export default App;

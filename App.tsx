import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {AuthProvider} from './src/context/AuthContext';
import {AppointmentProvider} from './src/context/AppointmentContext';
import AppNavigator from './src/navigation/AppNavigator';
import {notificationService} from './src/services/notifications';

const App = () => {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log(
          'App started, waiting before initializing notifications...',
        );

        // Wait for the app to be fully loaded before initializing notifications
        setTimeout(async () => {
          try {
            console.log('Initializing notification service...');

            // Only initialize basic FCM setup, not full permissions
            // Full permission request will happen when user interacts with the app
            await notificationService.registerMessageHandlers();
          } catch (error) {
            console.error(
              'Failed to initialize basic notification setup:',
              error,
            );
          }
        }, 3000); // Wait 3 seconds after app start
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <AuthProvider>
      <AppointmentProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AppointmentProvider>
    </AuthProvider>
  );
};

export default App;

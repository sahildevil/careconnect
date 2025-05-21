import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Homescreen from '../screens/Homescreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#008080',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Home" 
        component={Homescreen} 
        options={{ title: "CareConnect" }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
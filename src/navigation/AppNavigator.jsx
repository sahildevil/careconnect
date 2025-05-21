import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import Homescreen from '../screens/Homescreen';
import Login from '../screens/auth/Login';
import SignUp from '../screens/auth/SignUp';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#008080',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <Stack.Screen
        name="Login"
        component={Login}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUp}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Home"
        component={Homescreen}
        options={{title: 'CareConnect'}}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;

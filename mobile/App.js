import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider } from './context/AuthContext';
import ProtectedScreen from './components/ProtectedScreen';
import LogoutButton from './components/LogoutButton'; // 👈 new

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ParentDashboard from './screens/ParentDashboard';
import ChildProfileScreen from './screens/ChildProfileScreen';
import SantaChatScreen from './screens/SantaChatScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login">
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />

            <Stack.Screen
              name="ParentDashboard"
              options={({ navigation }) => ({
                headerRight: () => <LogoutButton navigation={navigation} />
              })}
            >
              {props => (
                <ProtectedScreen navigation={props.navigation}>
                  <ParentDashboard {...props} />
                </ProtectedScreen>
              )}
            </Stack.Screen>

            <Stack.Screen name="ChildProfile">
              {props => (
                <ProtectedScreen navigation={props.navigation}>
                  <ChildProfileScreen {...props} />
                </ProtectedScreen>
              )}
            </Stack.Screen>

            <Stack.Screen name="SantaChat">
              {props => (
                <ProtectedScreen navigation={props.navigation}>
                  <SantaChatScreen {...props} />
                </ProtectedScreen>
              )}
            </Stack.Screen>
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

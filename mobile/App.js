import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';

import { AuthProvider } from './context/AuthContext';
import ProtectedScreen from './components/ProtectedScreen';
import LogoutButton from './components/LogoutButton';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ParentDashboard from './screens/ParentDashboard';
import ChildProfileScreen from './screens/ChildProfileScreen';
import SantaChatScreen from './screens/SantaChatScreen';
import EditProfileScreen from './screens/EditProfileScreen';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// Drawer content screens
function AppDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="ParentDashboard"
      screenOptions={({ navigation }) => ({
        headerRight: () => <LogoutButton navigation={navigation} />,
      })}
    >
      <Drawer.Screen
        name="ParentDashboard"
        component={ParentDashboard}
        options={{ title: 'Dashboard' }}
      />
      <Drawer.Screen
        name="ChildProfile"
        component={ChildProfileScreen}
        options={{ title: 'Child Profile' }}
      />
      <Drawer.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
    </Drawer.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
            {/* Public screens */}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />

            {/* Protected Drawer */}
            <Stack.Screen name="AppDrawer">
              {props => (
                <ProtectedScreen navigation={props.navigation}>
                  <AppDrawer {...props} />
                </ProtectedScreen>
              )}
            </Stack.Screen>

            {/* Santa Chat remains full screen outside drawer */}
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

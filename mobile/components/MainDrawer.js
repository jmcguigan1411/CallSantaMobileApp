// mobile/components/MainDrawer.js
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import ParentDashboard from '../screens/ParentDashboard';
import EditProfileScreen from '../screens/EditProfileScreen';
import LogoutButton from './LogoutButton';
import { Platform } from 'react-native';

const Drawer = createDrawerNavigator();

export default function MainDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="ParentDashboard"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#af1f1fff', // festive background
          shadowColor: 'transparent', // remove default shadow
          elevation: 0,
        },
        headerTintColor: '#fff',           // title color
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 22,
        },
        drawerActiveBackgroundColor: '#b71c1c', // active item
        drawerActiveTintColor: '#fff',          // active text
        drawerInactiveTintColor: '#fff',        // inactive text
        drawerStyle: {
          backgroundColor: '#af1f1fff',       // drawer bg
        },
        headerRight: ({ navigation }) => <LogoutButton navigation={navigation} />,
        headerLeft: ({ navigation }) => (
          <DrawerToggleButton navigation={navigation} />
        ),
      }}
    >
      <Drawer.Screen
        name="ParentDashboard"
        component={ParentDashboard}
        options={{ title: 'Dashboard' }}
      />
      <Drawer.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
    </Drawer.Navigator>
  );
}

// Custom burger icon
function DrawerToggleButton({ navigation }) {
  return (
    <TouchableOpacity
      onPress={() => navigation.toggleDrawer()}
      style={{ marginLeft: 15 }}
    >
      <Text style={{ fontSize: 26, color: '#fff' }}>☃️</Text> {/* Snowman as burger icon */}
    </TouchableOpacity>
  );
}

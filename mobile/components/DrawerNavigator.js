// mobile/navigation/DrawerNavigator.js
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import DashboardScreen from '../screens/DashboardScreen';
import AddChildScreen from '../screens/AddChildScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import { AuthContext } from '../context/AuthContext';
import { View, Text, TouchableOpacity } from 'react-native';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: true,
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="AddChild" component={AddChildScreen} />
      <Drawer.Screen name="EditProfile" component={EditProfileScreen} />
    </Drawer.Navigator>
  );
}

// Optional: Custom drawer content
function CustomDrawerContent({ navigation }) {
  const { logout, user } = React.useContext(AuthContext);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>Hello, {user?.name}</Text>

      <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
        <Text style={{ marginBottom: 15 }}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={logout}>
        <Text style={{ marginTop: 20, color: 'red' }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

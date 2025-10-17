import React, { useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { TooltipProvider } from './context/TooltipContext'; // UNCOMMENTED
import ProtectedScreen from './components/ProtectedScreen';
import LogoutButton from './components/LogoutButton';
import TermsModal from './components/TermsModal';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import VerifyResetCodeScreen from './screens/VerifyResetCodeScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import ParentDashboard from './screens/ParentDashboard';
import ChildProfileScreen from './screens/ChildProfileScreen';
import SantaChatScreen from './screens/SantaChatScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import AudioFilesScreen from './screens/AudioFilesScreen';
import { TouchableOpacity, View, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const { width } = Dimensions.get('window');

function CustomDrawerToggle({ navigation }) {
  return (
    <TouchableOpacity
      onPress={() => navigation.toggleDrawer()}
      style={{
        marginLeft: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: 8,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#fff',
      }}
    >
      <Ionicons name="menu" size={24} color="#fff" />
    </TouchableOpacity>
  );
}

function AppDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="ParentDashboard"
      screenOptions={({ navigation }) => ({
        headerStyle: {
          backgroundColor: '#165B33',
          shadowColor: '#FFD700',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 5,
          height: 110,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: width < 360 ? 18 : 22,
          letterSpacing: 1,
          textShadowColor: 'rgba(0, 0, 0, 0.3)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 3,
        },
        headerTitleAlign: 'center',
        headerRight: () => (
          <View style={{ marginRight: 10 }}>
            <LogoutButton navigation={navigation} />
          </View>
        ),
        headerLeft: () => <CustomDrawerToggle navigation={navigation} />,
        headerLeftContainerStyle: {
          paddingLeft: 0,
        },
        headerRightContainerStyle: {
          paddingRight: 0,
        },
        headerTitleContainerStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        drawerStyle: {
          backgroundColor: '#165B33',
          width: width * 0.75,
        },
        drawerActiveBackgroundColor: 'rgba(255, 215, 0, 0.3)',
        drawerActiveTintColor: '#FFD700',
        drawerInactiveTintColor: '#fff',
        drawerLabelStyle: {
          fontSize: 18,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
        drawerItemStyle: {
          borderRadius: 10,
          marginVertical: 5,
          marginHorizontal: 10,
        },
      })}
    >
      <Drawer.Screen
        name="ParentDashboard"
        component={ParentDashboard}
        options={{
          title: 'Dashboard',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="AudioFiles"
        component={AudioFilesScreen}
        options={{
          title: 'Audio Files',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="musical-notes" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          title: 'Edit Profile',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}

function AppContent() {
  const { showTermsModal, acceptTerms } = useContext(AuthContext);
 
  return (
    <>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="VerifyResetCode" component={VerifyResetCodeScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          
          <Stack.Screen name="AppDrawer">
            {props => (
              <ProtectedScreen navigation={props.navigation}>
                <AppDrawer {...props} />
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
      </NavigationContainer>
     
      <TermsModal visible={showTermsModal} onAccept={acceptTerms} />
      <StatusBar style="light" />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
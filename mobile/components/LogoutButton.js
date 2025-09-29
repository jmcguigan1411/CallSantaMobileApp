import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function LogoutButton({ navigation }) {
  const { logout } = useContext(AuthContext);
  
  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };
  
  return (
    <TouchableOpacity
      onPress={handleLogout}
      style={{
        marginRight: 15,
        overflow: 'hidden',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
      }}
    >
      <LinearGradient
        colors={['#C41E3A', '#8B0000']} // Christmas red gradient
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 15,
          paddingVertical: 8,
          gap: 6,
        }}
      >
        <Ionicons name="log-out-outline" size={18} color="#fff" />
        <Text style={{
          color: '#fff',
          fontWeight: 'bold',
          fontSize: 14,
          letterSpacing: 0.5,
        }}>
          Logout
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}
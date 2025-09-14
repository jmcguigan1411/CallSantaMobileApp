import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function LogoutButton({ navigation }) {
  const { logout } = useContext(AuthContext);

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login'); // go back to login
  };

  return (
    <TouchableOpacity
      onPress={handleLogout}
      style={{
        marginRight: 15,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#b71c1c',
      }}
    >
      <Text style={{ color: '#b71c1c', fontWeight: 'bold' }}>🎄 Logout</Text>
    </TouchableOpacity>
  );
}

// components/LogoutButton.js
import React, { useContext } from 'react';
import { Button } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function LogoutButton({ navigation }) {
  const { logout } = useContext(AuthContext);

  return (
    <Button
      title="Logout"
      onPress={logout}
      color="red"
    />
  );
}

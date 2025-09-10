// mobile/components/ProtectedScreen.js
import React, { useContext, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function ProtectedScreen({ children, navigation }) {
  const { user, loaded } = useContext(AuthContext);

  useEffect(() => {
    if (loaded && !user) {
      // Redirect to login if not logged in
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [user, loaded]);

  if (!loaded || (loaded && !user)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return children;
}

import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AuthContext } from '../context/AuthContext';
import Snowflakes from '../components/Snowflakes';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const { login, socialLogin, loading } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- Google Auth ---
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: "<YOUR_IOS_CLIENT_ID>.apps.googleusercontent.com",
    androidClientId: "<YOUR_ANDROID_CLIENT_ID>.apps.googleusercontent.com",
    expoClientId: "<YOUR_EXPO_CLIENT_ID>.apps.googleusercontent.com",
  });

  // Handle Google response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      const fetchGoogleUser = async () => {
        try {
          const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
            headers: { Authorization: `Bearer ${authentication.accessToken}` },
          });
          const userInfo = await res.json();

          await socialLogin('google', authentication.accessToken, userInfo.email);

          // Reset navigation to AppDrawer so burger menu works
          navigation.reset({
            index: 0,
            routes: [{ name: 'AppDrawer' }],
          });
        } catch (err) {
          console.error('Google login error:', err);
        }
      };
      fetchGoogleUser();
    }
  }, [response]);

  const handleLogin = async () => {
    const data = await login(email, password);
    if (data) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppDrawer' }],
      });
    }
  };

  const handleAppleLogin = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      await socialLogin('apple', credential.identityToken, credential.email);

      navigation.reset({
        index: 0,
        routes: [{ name: 'AppDrawer' }],
      });
    } catch (e) {
      if (e.code !== 'ERR_CANCELED') console.error('Apple login error:', e);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#b71c1c', justifyContent: 'center' }}>
      <Snowflakes />
      <View style={styles.card}>
        <Image
          source={{ uri: 'https://www.pngall.com/wp-content/uploads/2016/04/Santa-Hat-Download-PNG.png' }}
          style={styles.santaHat}
        />
        <Text style={styles.title}>🎅 Login 🎅</Text>

        {/* Email/Password Login */}
        <View style={styles.inputGroup}>
          <Text style={styles.icon}>📧</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.icon}>🔒</Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Loading...' : 'LOGIN'}</Text>
        </TouchableOpacity>

        {/* Google Login */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#4285F4' }]}
          disabled={!request}
          onPress={() => promptAsync()}
        >
          <Text style={styles.buttonText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Apple Login (iOS only) */}
        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={8}
            style={{ width: '100%', height: 44, marginTop: 10 }}
            onPress={handleAppleLogin}
          />
        )}

        <Text style={styles.footer}>
          Don’t have an account?{' '}
          <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
            Sign Up
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    alignItems: 'center',
  },
  santaHat: {
    width: 60,
    height: 60,
    position: 'absolute',
    top: -30,
  },
  title: {
    fontSize: 24,
    color: '#b71c1c',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    width: '100%',
  },
  icon: { marginRight: 8, fontSize: 18 },
  input: { flex: 1, padding: 10 },
  button: {
    backgroundColor: '#b71c1c',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    marginTop: 10,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  footer: { color: '#333', marginTop: 20 },
  link: { color: '#b71c1c', fontWeight: 'bold' },
});

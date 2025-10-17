import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AuthContext } from '../context/AuthContext';
import Snowflakes from '../components/Snowflakes';

export default function LoginScreen({ navigation }) {
  const { login, socialLogin, loading } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

        <TouchableOpacity
          style={styles.forgotPasswordButton}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
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
          Don't have an account?{' '}
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
  forgotPasswordButton: {
    marginTop: 15,
    alignSelf: 'center',
  },
  forgotPasswordText: {
    color: '#b71c1c',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: { color: '#333', marginTop: 20 },
  link: { color: '#b71c1c', fontWeight: 'bold' },
});
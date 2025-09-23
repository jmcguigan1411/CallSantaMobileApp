// mobile/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Load stored token on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        console.log('[AuthContext] Loading stored token:', token ? 'Found' : 'Not found');
        if (token) {
          setUser({ token });
        }
      } catch (error) {
        console.error('[AuthContext] Error loading token:', error);
      } finally {
        setLoaded(true);
      }
    };
    loadUser();
  }, []);

  // Check if user needs to see terms after login/register
  const checkTermsAcceptance = (userData) => {
    if (userData && !userData.hasAcceptedTerms) {
      setShowTermsModal(true);
    }
  };

  // Email/password login
  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      if (!data?.token) throw new Error('Login failed, no token returned');
      
      console.log('[AuthContext] Login successful, storing token');
      setUser(data);
      await AsyncStorage.setItem('token', data.token);
      checkTermsAcceptance(data);
      return data;
    } catch (error) {
      console.error('LOGIN ERROR:', error);
      Alert.alert('Login Error', error.message || 'Failed to login');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Email/password register
  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const data = await authService.register(name, email, password);
      if (!data?.token) throw new Error('Registration failed, no token returned');
      
      console.log('[AuthContext] Registration successful, storing token');
      setUser(data);
      await AsyncStorage.setItem('token', data.token);
      checkTermsAcceptance(data);
      return data;
    } catch (error) {
      console.error('REGISTER ERROR:', error);
      Alert.alert('Registration Error', error.message || 'Failed to register');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Social login (Google / Apple)
  const socialLogin = async (provider, token) => {
    setLoading(true);
    try {
      const data = await authService.socialLogin(provider, token);
      if (!data?.token) throw new Error(`${provider} login failed, no token returned`);
      
      console.log(`[AuthContext] ${provider} login successful, storing token`);
      setUser(data);
      await AsyncStorage.setItem('token', data.token);
      checkTermsAcceptance(data);
      return data;
    } catch (error) {
      console.error('SOCIAL LOGIN ERROR:', error);
      Alert.alert('Login Error', error.message || `Failed to login with ${provider}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Accept terms
  const acceptTerms = async () => {
    try {
      const token = user?.token;
      if (!token) return;
      
      await authService.acceptTerms(token);
      setUser(prev => ({ ...prev, hasAcceptedTerms: true }));
      setShowTermsModal(false);
      console.log('[AuthContext] Terms accepted successfully');
    } catch (error) {
      console.error('Accept terms error:', error);
      Alert.alert('Error', 'Failed to accept terms. Please try again.');
    }
  };

  // Logout
  const logout = async () => {
    console.log('[AuthContext] Logging out, removing token');
    setUser(null);
    setShowTermsModal(false);
    await AsyncStorage.removeItem('token');
  };

  // Update Profile (name, email, password)
  const updateProfile = async ({ name, email, currentPassword, newPassword }) => {
    setLoading(true);
    try {
      const token = user?.token;
      const res = await fetch('http://192.168.1.137:5000/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');
      
      setUser(prev => ({ ...prev, ...data }));
      if (data.token) {
        console.log('[AuthContext] Profile updated, storing new token');
        await AsyncStorage.setItem('token', data.token);
      }
      return data;
    } catch (err) {
      console.error('UPDATE PROFILE ERROR:', err);
      Alert.alert('Error', err.message || 'Failed to update profile');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const token = user?.token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        loaded,
        showTermsModal,
        login,
        register,
        socialLogin,
        acceptTerms,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
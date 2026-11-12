import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../config/colors';
import { subscribeToToast } from '../utils/toast';

function ToastOverlay() {
  const [toastMessage, setToastMessage] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Only show in-app banner for non-Android (Web, iOS) since Android has native ToastAndroid
    if (Platform.OS === 'android') return;

    let timeout;
    const unsubscribe = subscribeToToast(({ message, duration }) => {
      setToastMessage(message);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setToastMessage(null));
      }, duration === 'long' ? 4000 : 2500);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [fadeAnim]);

  if (!toastMessage || Platform.OS === 'android') return null;

  return (
    <Animated.View style={[styles.toastContainer, { opacity: fadeAnim }]}>
      <Text style={styles.toastText}>{toastMessage}</Text>
    </Animated.View>
  );
}

export default function Layout() {
  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textLight,
          tabBarStyle: {
            borderTopColor: COLORS.border,
            backgroundColor: COLORS.background,
          },
          headerStyle: {
            backgroundColor: COLORS.background,
          },
          headerTintColor: COLORS.primary,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Camera',
            tabBarLabel: 'Scan',
            tabBarIcon: ({ color, size }) => (
              <Feather name="camera" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarLabel: 'History',
            tabBarIcon: ({ color, size }) => (
              <Feather name="clock" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarLabel: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Feather name="settings" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="result"
          options={{
            title: 'Result',
            href: null,
          }}
        />
      </Tabs>
      <ToastOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 70,
    alignSelf: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    maxWidth: '85%',
    zIndex: 9999,
    elevation: 5,
  },
  toastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../config/colors';
import { clearAllHistory, getHistoryCount } from '../utils/storageService';
import { showToast } from '../utils/toast';
import { confirmAction } from '../utils/confirm';
import { STORAGE_STATUS } from '../utils/storageErrors';

export default function SettingsScreen() {
  const [scanCount, setScanCount] = useState(0);
  const [countError, setCountError] = useState(false);

  const loadCount = useCallback(async () => {
    try {
      const result = await getHistoryCount();
      if (result.status === STORAGE_STATUS.ERROR) {
        setCountError(true);
        setScanCount(0);
      } else {
        setCountError(false);
        setScanCount(result.count);
      }
    } catch (error) {
      if (__DEV__) console.warn('Failed to load count:', error);
      setCountError(true);
    }
  }, []);

  // Reload count whenever the Settings tab gains focus
  useFocusEffect(
    useCallback(() => {
      loadCount();
    }, [loadCount])
  );

  const handleClearHistory = async () => {
    if (!countError && scanCount === 0) {
      showToast('History is already empty');
      return;
    }

    const confirmed = await confirmAction(
      'Clear All History',
      'This will delete all saved scans permanently. This action cannot be undone.',
      { confirmText: 'Clear All', destructive: true }
    );

    if (confirmed) {
      const success = await clearAllHistory();
      if (success) {
        setScanCount(0);
        setCountError(false);
        showToast('All history cleared');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>App Name</Text>
          <Text style={styles.value}>ContextCam</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Version</Text>
          <Text style={styles.value}>1.0.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Total Scans</Text>
          <Text style={styles.value}>{countError ? '?' : scanCount}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        <Pressable 
          style={styles.dangerButton}
          onPress={handleClearHistory}
        >
          <Text style={styles.dangerText}>Clear All History</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>
          ContextCam automatically detects the domain context (Health, Legal, Academic) of any document you scan and produces structured, human-readable insights.
        </Text>
        <Text style={styles.description}>
          Powered by React Native, Google ML Kit, and Gemini AI.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.subtitleSize,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    fontSize: TYPOGRAPHY.bodySize,
    color: COLORS.text,
  },
  value: {
    fontSize: TYPOGRAPHY.bodySize,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    color: COLORS.primary,
  },
  dangerButton: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: COLORS.accent,
    padding: SPACING.lg,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerText: {
    color: COLORS.accent,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    fontSize: TYPOGRAPHY.bodySize,
  },
  description: {
    fontSize: TYPOGRAPHY.smallSize,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
});

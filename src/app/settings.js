import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../config/colors';
import { clearAllHistory, getHistoryCount } from '../utils/storageService';

export default function SettingsScreen() {
  const [scanCount, setScanCount] = React.useState(0);

  React.useEffect(() => {
    loadCount();
  }, []);

  const loadCount = async () => {
    const count = await getHistoryCount();
    setScanCount(count);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear All History',
      'This will delete all saved scans. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          onPress: async () => {
            await clearAllHistory();
            setScanCount(0);
            Alert.alert('Done', 'All history cleared');
          },
          style: 'destructive',
        },
      ]
    );
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
          <Text style={styles.value}>{scanCount}</Text>
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
          ContextCam automatically detects the type of content you're scanning and provides mode-specific analysis.
        </Text>
        <Text style={styles.description}>
          Built with React Native, Google ML Kit, and Gemini API.
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
    lineHeight: 1.6,
    marginBottom: SPACING.md,
  },
});
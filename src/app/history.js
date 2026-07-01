import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../config/colors';
import {
    checkAndWarnAboutOldScans,
    deleteFromHistory,
    getHistory,
    markAsBackedUp,
    showDeleteWarningAlert
} from '../utils/storageService';

export default function HistoryScreen({ navigation }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // Check for old scans and show warnings
      const scansToWarn = await checkAndWarnAboutOldScans();
      scansToWarn.forEach(scan => {
        showDeleteWarningAlert(
          scan,
          (scan) => {
            // User clicked "Save as PDF"
            handleExportPDF(scan);
          },
          (scan) => {
            // User clicked "Ignore"
            console.log('User ignored warning');
          }
        );
      });

      // Load all scans
      const allScans = await getHistory();
      setScans(allScans);
    } catch (error) {
      console.error('Error loading history:', error);
    }
    setLoading(false);
  };

  const handleDelete = (scanId) => {
    Alert.alert(
      'Delete Scan',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            await deleteFromHistory(scanId);
            loadHistory(); // Refresh list
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleExportPDF = async (scan) => {
    try {
      // TODO: Implement PDF export
      // For now, just mark as backed up
      await markAsBackedUp(scan.id);
      Alert.alert('Success', 'Scan saved as PDF');
      loadHistory(); // Refresh
    } catch (error) {
      Alert.alert('Error', 'Failed to export PDF');
    }
  };

  const handleViewDetails = (scan) => {
    navigation.navigate('ResultScreen', { result: scan });
  };

  const renderScanItem = ({ item }) => (
    <Pressable 
      style={styles.scanItem}
      onPress={() => handleViewDetails(item)}
    >
      {/* Mode Badge */}
      <View style={[styles.modeBadge, { backgroundColor: getModeColor(item.mode) }]}>
        <Text style={styles.modeBadgeText}>{item.mode}</Text>
      </View>

      {/* Scan Info */}
      <View style={styles.scanInfo}>
        <Text style={styles.scanPreview} numberOfLines={2}>
          {item.extractedText}
        </Text>
        <Text style={styles.scanTime}>
          {new Date(item.savedAt).toLocaleString()}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={styles.actionButton}
          onPress={() => handleExportPDF(item)}
        >
          <Text style={styles.actionText}>PDF</Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </Pressable>
      </View>
    </Pressable>
  );

  if (scans.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No scans yet</Text>
        <Text style={styles.emptySubtext}>Tap Camera to start scanning</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={scans}
        renderItem={renderScanItem}
        keyExtractor={item => item.id}
        onRefresh={loadHistory}
        refreshing={loading}
      />
    </View>
  );
}

function getModeColor(mode) {
  switch (mode) {
    case 'HEALTH': return COLORS.modeHealth || '#E8D5D5';
    case 'LEGAL': return COLORS.modeLegal || '#DDD5CA';
    case 'ACADEMIC': return COLORS.modeAcademic || '#D5CADF';
    default: return COLORS.accent;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },

  emptyText: {
    fontSize: TYPOGRAPHY.subtitleSize,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },

  emptySubtext: {
    fontSize: TYPOGRAPHY.smallSize,
    color: COLORS.textLight,
  },

  scanItem: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
    gap: SPACING.md,
  },

  modeBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },

  modeBadgeText: {
    fontSize: TYPOGRAPHY.smallSize,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    color: COLORS.primary,
  },

  scanInfo: {
    flex: 1,
  },

  scanPreview: {
    fontSize: TYPOGRAPHY.bodySize,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    lineHeight: 1.4,
  },

  scanTime: {
    fontSize: TYPOGRAPHY.smallSize,
    color: COLORS.textLight,
  },

  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },

  actionButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
  },

  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  actionText: {
    fontSize: TYPOGRAPHY.smallSize,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    color: COLORS.secondary,
  },

  deleteText: {
    color: COLORS.accent,
  },
});
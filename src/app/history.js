import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../config/colors';
import {
  checkAndWarnAboutOldScans,
  deleteFromHistory,
  getHistory,
  markAsBackedUp,
  showDeleteWarningAlert,
} from '../utils/storageService';
import { exportScanAsPDF } from '../utils/pdfExport';
import { setCurrentScan } from '../utils/scanResultStore';
import { showToast } from '../utils/toast';
import { confirmAction } from '../utils/confirm';
import { STORAGE_STATUS } from '../utils/storageErrors';

export default function HistoryScreen() {
  const router = useRouter();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // Check for old scans and warn if needed
      const scansToWarn = await checkAndWarnAboutOldScans();
      if (scansToWarn && scansToWarn.length > 0) {
        showDeleteWarningAlert(
          scansToWarn[0],
          (scan) => handleExportPDF(scan),
          () => {
            if (__DEV__) console.log('User dismissed warning');
          }
        );
      }

      // Load all scans
      const result = await getHistory();

      if (result.status === STORAGE_STATUS.ERROR) {
        setScans([]);
        setErrorMessage(result.error || 'Failed to load history');
      } else {
        setScans(result.scans || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      setErrorMessage('An unexpected error occurred');
      showToast('Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh history whenever the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const handleDelete = async (scanId) => {
    const confirmed = await confirmAction(
      'Delete Scan',
      'Are you sure you want to delete this scan? This cannot be undone.',
      { confirmText: 'Delete', destructive: true }
    );

    if (confirmed) {
      await deleteFromHistory(scanId);
      loadHistory();
    }
  };

  const handleExportPDF = async (scan) => {
    try {
      const exported = await exportScanAsPDF(scan);
      if (exported) {
        await markAsBackedUp(scan.id);
        loadHistory();
      }
    } catch (error) {
      showToast('Failed to export scan');
    }
  };

  const handleViewDetails = (scan) => {
    setCurrentScan({
      success: true,
      ...scan,
      timestamp: scan.timestamp || scan.savedAt || new Date().toISOString(),
    });
    router.push('/result');
  };

  const renderScanItem = ({ item }) => {
    const dateDisplay = item.savedAt || item.timestamp 
      ? new Date(item.savedAt || item.timestamp).toLocaleString()
      : 'Saved recently';

    return (
      <Pressable style={styles.scanItem} onPress={() => handleViewDetails(item)}>
        {/* Mode Badge */}
        <View style={[styles.modeBadge, { backgroundColor: getModeColor(item.mode) }]}>
          <Text style={styles.modeBadgeText}>{item.mode || 'HEALTH'}</Text>
        </View>

        {/* Scan Info */}
        <View style={styles.scanInfo}>
          <Text style={styles.scanPreview} numberOfLines={2}>
            {item.extractedText || item.analysis || 'No text'}
          </Text>
          <Text style={styles.scanTime}>{dateDisplay}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation?.();
              handleExportPDF(item);
            }}
          >
            <Text style={styles.actionText}>PDF</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.deleteButton]}
            onPress={(e) => {
              e.stopPropagation?.();
              handleDelete(item.id);
            }}
          >
            <Text style={[styles.actionText, styles.deleteText]}>✕</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  // Error state — retryable
  if (!loading && errorMessage) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.errorIcon}>⚠</Text>
        <Text style={styles.emptyText}>Something went wrong</Text>
        <Text style={styles.emptySubtext}>{errorMessage}</Text>
        <Pressable style={styles.retryButton} onPress={loadHistory}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // Empty state
  if (!loading && scans.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No scans yet</Text>
        <Text style={styles.emptySubtext}>Tap Camera in the bottom bar to scan your first document</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={scans}
        renderItem={renderScanItem}
        keyExtractor={(item, index) => item.id || `scan_${index}`}
        onRefresh={loadHistory}
        refreshing={loading}
        contentContainerStyle={scans.length === 0 ? styles.emptyList : null}
      />
    </View>
  );
}

function getModeColor(mode) {
  switch (mode) {
    case 'HEALTH': return COLORS.modeHealth || '#E8D5D5';
    case 'LEGAL': return COLORS.modeLegal || '#DDD5CA';
    case 'ACADEMIC': return COLORS.modeAcademic || '#D5CADF';
    default: return COLORS.accent || '#B55C5E';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
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
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: SPACING.md,
  },
  retryButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  retryText: {
    color: COLORS.secondary,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    fontSize: TYPOGRAPHY.bodySize,
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
    minWidth: 76,
    alignItems: 'center',
  },
  modeBadgeText: {
    fontSize: TYPOGRAPHY.tinySize || 10,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  scanInfo: {
    flex: 1,
  },
  scanPreview: {
    fontSize: TYPOGRAPHY.bodySize,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  scanTime: {
    fontSize: TYPOGRAPHY.smallSize,
    color: COLORS.textLight,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  actionText: {
    fontSize: TYPOGRAPHY.tinySize || 11,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    color: COLORS.secondary,
  },
  deleteText: {
    color: COLORS.accent,
  },
});

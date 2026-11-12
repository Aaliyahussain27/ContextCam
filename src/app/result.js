import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../config/colors';
import { processScan } from '../utils/processingService';
import { getCurrentScan, setCurrentScan } from '../utils/scanResultStore';
import { saveToHistory } from '../utils/storageService';
import { showToast } from '../utils/toast';

export default function ResultScreen() {
  const router = useRouter();
  const [result, setResult] = useState(() => getCurrentScan());
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [showModeOptions, setShowModeOptions] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setResult(getCurrentScan());
      setSaved(false);
      setShowModeOptions(false);
    }, [])
  );

  // Handle save to history
  const handleSave = async () => {
    if (!result || saving || saved) return;

    setSaving(true);
    try {
      const success = await saveToHistory({
        mode: result.mode || 'HEALTH',
        extractedText: result.extractedText || '',
        analysis: result.analysis || '',
        timestamp: result.timestamp || new Date().toISOString(),
      });
      if (success) {
        setSaved(true);
      }
    } catch (error) {
      console.error('Save error:', error);
      showToast('Error saving to history');
    } finally {
      setSaving(false);
    }
  };

  // Switch mode and re-analyze
  const handleModeSelect = async (newMode) => {
    setShowModeOptions(false);

    if (!result?.extractedText || result.mode === newMode || reprocessing) {
      return;
    }

    setReprocessing(true);
    showToast(`Re-analyzing as ${newMode}...`);

    try {
      const updatedResult = await processScan(result.extractedText, newMode);
      setCurrentScan(updatedResult);
      setResult(updatedResult);
      setSaved(false);
    } catch (error) {
      console.error('Mode change error:', error);
      showToast('Failed to switch mode analysis');
    } finally {
      setReprocessing(false);
    }
  };

  // Navigation handlers
  const handleScanAgain = () => {
    router.push('/');
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/');
    }
  };

  if (!result || (!result.success && !result.extractedText)) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{result?.error || 'No scan result found.'}</Text>
        <Pressable style={styles.buttonPrimary} onPress={handleScanAgain}>
          <Text style={styles.buttonText}>Scan Again</Text>
        </Pressable>
      </View>
    );
  }

  const formattedAnalysis = (result.analysis || '')
    .split('\n')
    .map((line) => (line.trim() ? `• ${line.trim()}` : ''))
    .filter(Boolean)
    .join('\n');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Top Navigation Row */}
      <View style={styles.topNavRow}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
      </View>

      {/* Mode Badge / Selector */}
      <View style={styles.modeContainer}>
        <Pressable
          style={[styles.modeBadgeWrapper, { backgroundColor: getModeColor(result.mode) }]}
          onPress={() => setShowModeOptions(!showModeOptions)}
        >
          <Text style={styles.modeBadgeText}>
            {result.mode || 'GENERIC'} ▾
          </Text>
        </Pressable>
      </View>

      {showModeOptions && (
        <View style={styles.modeOptions}>
          {['HEALTH', 'LEGAL', 'ACADEMIC'].map((mode) => (
            <Pressable
              key={mode}
              style={[styles.modeOption, result.mode === mode && styles.modeOptionActive]}
              onPress={() => handleModeSelect(mode)}
            >
              <Text style={[styles.modeOptionText, result.mode === mode && styles.modeOptionTextActive]}>
                {mode}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {reprocessing && (
        <View style={styles.reprocessingBox}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.reprocessingText}>Updating analysis...</Text>
        </View>
      )}

      {/* Extracted Text Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Extracted Text</Text>
        <View style={styles.textBox}>
          <Text style={styles.bodyText} selectable>
            {result.extractedText || 'No text extracted'}
          </Text>
        </View>
      </View>

      {/* Analysis Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contextual Analysis</Text>
        <View style={styles.textBox}>
          <Text style={styles.bodyText} selectable>
            {formattedAnalysis || result.analysis || 'No analysis available.'}
          </Text>
        </View>
      </View>

      {/* Timestamp */}
      <View style={styles.section}>
        <Text style={styles.timestamp}>
          Captured on {new Date(result.timestamp || Date.now()).toLocaleString()}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.buttonPrimary, saved && styles.buttonSaved]}
          onPress={handleSave}
          disabled={saving || saved}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving...' : saved ? 'Saved to History ✓' : 'Save to History'}
          </Text>
        </Pressable>

        <Pressable style={styles.buttonSecondary} onPress={handleScanAgain}>
          <Text style={styles.buttonTextSecondary}>Scan Again</Text>
        </Pressable>
      </View>
    </ScrollView>
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
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  topNavRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  modeContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  modeBadgeWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modeBadgeText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  modeOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modeOption: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  modeOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modeOptionText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 12,
  },
  modeOptionTextActive: {
    color: COLORS.secondary,
  },
  reprocessingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
    marginBottom: 12,
  },
  reprocessingText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.6,
  },
  textBox: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 14,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.text,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSaved: {
    backgroundColor: '#6E9075',
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.secondary,
    fontWeight: '600',
    fontSize: 14,
  },
  buttonTextSecondary: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
});
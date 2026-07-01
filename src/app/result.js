import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { processScan } from '../utils/processingService';
import { saveToHistory } from '../utils/storageService';

import { COLORS } from '../config/colors';

export default function ResultScreen({ route, navigation }) {
  // route.params = { success, mode, analysis, extractedText, timestamp }
  const [result, setResult] = useState(route.params?.result);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModeOptions, setShowModeOptions] = useState(false);

  // Handle save to history
  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await saveToHistory({
        mode: result.mode,
        extractedText: result.extractedText,
        analysis: result.analysis,
        timestamp: result.timestamp,
      });
      if (success) {
        setSaved(true);
      }
    } catch (error) {
      console.error('Save error:', error);
    }
    setSaving(false);
  };

  const handleModeSelect = async (mode) => {
    setShowModeOptions(false);

    if (!result?.extractedText || result.mode === mode) {
      return;
    }

    try {
      const updatedResult = await processScan(result.extractedText, mode);
      setResult(updatedResult);
    } catch (error) {
      console.error('Mode change error:', error);
    }
  };

  // Navigate back to camera
  const handleScanAgain = () => {
    navigation.navigate('Camera');
  };

  if (!result || !result.success) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{result?.error || 'Error processing image'}</Text>
        <Pressable
          style={styles.buttonPrimary}
          onPress={handleScanAgain}
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const formattedAnalysis = (result.analysis || '')
    .split('\n')
    .map((line) => line.trim() ? `• ${line.trim()}` : '')
    .filter(Boolean)
    .join('\n');

  return (
    <ScrollView style={styles.container}>
      {/* Mode Badge */}
      <Pressable
        style={styles.modeContainer}
        onPress={() => setShowModeOptions(!showModeOptions)}
      >
        <Text style={[styles.modeBadge, { backgroundColor: getModeColor(result.mode) }]}>
          {result.mode} ↓
        </Text>
      </Pressable>

      {showModeOptions && (
        <View style={styles.modeOptions}>
          {['HEALTH', 'LEGAL', 'ACADEMIC'].map((mode) => (
            <Pressable
              key={mode}
              style={[styles.modeOption, result.mode === mode && styles.modeOptionActive]}
              onPress={() => handleModeSelect(mode)}
            >
              <Text style={[styles.modeOptionText, result.mode === mode && styles.modeOptionTextActive]}>{mode}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Extracted Text Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Extracted Text</Text>
        <View style={styles.textBox}>
          <Text style={styles.bodyText}>{result.extractedText}</Text>
        </View>
      </View>

      {/* Analysis Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analysis</Text>
        <View style={styles.textBox}>
          <Text style={styles.bodyText}>{formattedAnalysis}</Text>
        </View>
      </View>

      {/* Timestamp */}
      <View style={styles.section}>
        <Text style={styles.timestamp}>
          {new Date(result.timestamp).toLocaleString()}
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.buttonPrimary, saved && styles.buttonSaved]}
          onPress={handleSave}
          disabled={saving || saved}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save to History'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.buttonSecondary}
          onPress={handleScanAgain}
        >
          <Text style={styles.buttonTextSecondary}>Scan Again</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// Helper function: Get color based on mode
function getModeColor(mode) {
  switch (mode) {
    case 'HEALTH': return COLORS.modeHealth;
    case 'LEGAL': return COLORS.modeLegal;
    case 'ACADEMIC': return COLORS.modeAcademic;
    default: return COLORS.accent;
  }
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },

  modeContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },

  modeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },

  modeOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },

  modeOption: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
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

  section: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  textBox: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
  },

  bodyText: {
    fontSize: 14,
    lineHeight: 1.8,
    color: COLORS.text,
    letterSpacing: 0.3,
  },

  timestamp: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },

  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
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
    opacity: 0.8,
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
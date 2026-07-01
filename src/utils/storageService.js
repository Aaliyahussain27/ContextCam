import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const HISTORY_KEY = 'contextcam_history';
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000; // milliseconds
const WARNING_BEFORE_DAYS = 26 * 24 * 60 * 60 * 1000; // Warn at 26 days, delete at 30

// Save scan to history
export async function saveToHistory(scan) {
  try {
    const existingHistory = await AsyncStorage.getItem(HISTORY_KEY);
    const history = existingHistory ? JSON.parse(existingHistory) : [];
    
    const newScan = {
      id: Date.now().toString(),
      ...scan,
      savedAt: new Date().toISOString(),
      backedUp: false, // Track if user backed up as PDF
    };
    
    history.push(newScan);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    
    console.log('Scan saved:', newScan.id);
    return true;
  } catch (error) {
    console.error('Error saving to history:', error);
    return false;
  }
}

// Get all scans from history
export async function getHistory() {
  try {
    const history = await AsyncStorage.getItem(HISTORY_KEY);
    const scans = history ? JSON.parse(history) : [];
    
    // Sort by savedAt (newest first)
    return scans.sort((a, b) => 
      new Date(b.savedAt) - new Date(a.savedAt)
    );
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
}

// Delete a specific scan
export async function deleteFromHistory(scanId) {
  try {
    const history = await AsyncStorage.getItem(HISTORY_KEY);
    const scans = history ? JSON.parse(history) : [];
    
    const filtered = scans.filter(scan => scan.id !== scanId);
    
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    
    console.log('Scan deleted:', scanId);
    return true;
  } catch (error) {
    console.error('Error deleting scan:', error);
    return false;
  }
}

// Check scans approaching 30 days and show warning
export async function checkAndWarnAboutOldScans() {
  try {
    const history = await AsyncStorage.getItem(HISTORY_KEY);
    const scans = history ? JSON.parse(history) : [];
    
    const now = new Date().getTime();
    const scansToWarn = [];
    const scansToDelete = [];
    
    scans.forEach(scan => {
      const scanTime = new Date(scan.savedAt).getTime();
      const age = now - scanTime;
      
      // Delete if older than 30 days
      if (age > THIRTY_DAYS) {
        scansToDelete.push(scan.id);
      }
      // Warn if older than 26 days (4 days before deletion)
      else if (age > WARNING_BEFORE_DAYS && !scan.backedUp) {
        scansToWarn.push(scan);
      }
    });
    
    // Auto-delete after 30 days
    if (scansToDelete.length > 0) {
      const filtered = scans.filter(scan => !scansToDelete.includes(scan.id));
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
      console.log('Auto-deleted old scans:', scansToDelete);
    }
    
    // Return scans that need warning (so HistoryScreen can show alert)
    return scansToWarn;
    
  } catch (error) {
    console.error('Error checking old scans:', error);
    return [];
  }
}

// Mark scan as backed up (PDF saved)
export async function markAsBackedUp(scanId) {
  try {
    const history = await AsyncStorage.getItem(HISTORY_KEY);
    const scans = history ? JSON.parse(history) : [];
    
    const updated = scans.map(scan => 
      scan.id === scanId ? { ...scan, backedUp: true } : scan
    );
    
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    console.log('Marked as backed up:', scanId);
    return true;
  } catch (error) {
    console.error('Error marking backup:', error);
    return false;
  }
}

// Show warning alert to user
export function showDeleteWarningAlert(scan, onSavePress, onIgnorePress) {
  const daysLeft = 4; // Will be deleted in 4 days
  
  Alert.alert(
    'Scan Expiring Soon',
    `Your scan from ${new Date(scan.savedAt).toLocaleDateString()} will be deleted in ${daysLeft} days.\n\nWould you like to save it as PDF first?`,
    [
      {
        text: 'Save as PDF',
        onPress: () => onSavePress(scan),
        style: 'default',
      },
      {
        text: 'Ignore',
        onPress: () => onIgnorePress(scan),
        style: 'cancel',
      },
    ],
  );
}

// Clear all history
export async function clearAllHistory() {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
    console.log('All history cleared');
    return true;
  } catch (error) {
    console.error('Error clearing history:', error);
    return false;
  }
}

// Get scan count
export async function getHistoryCount() {
  try {
    const history = await AsyncStorage.getItem(HISTORY_KEY);
    const scans = history ? JSON.parse(history) : [];
    return scans.length;
  } catch (error) {
    console.error('Error getting count:', error);
    return 0;
  }
}
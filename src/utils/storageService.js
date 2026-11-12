import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from './toast';
import { confirmAction } from './confirm';
import { StorageError, STORAGE_STATUS } from './storageErrors';

const HISTORY_KEY = 'contextcam_history';
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000; // milliseconds
const WARNING_BEFORE_DAYS = 26 * 24 * 60 * 60 * 1000; // Warn at 26 days, delete at 30

/**
 * Validates that a date string is a parseable ISO date.
 */
function isValidISODate(value) {
  if (typeof value !== 'string') return false;
  const ts = Date.parse(value);
  return !isNaN(ts);
}

/**
 * Validates an individual scan record.
 * Must have an `id` (string) and at least one valid date field.
 */
function isValidRecord(record) {
  if (!record || typeof record !== 'object') return false;
  if (typeof record.id !== 'string' || record.id.length === 0) return false;
  const hasValidDate =
    isValidISODate(record.savedAt) || isValidISODate(record.timestamp);
  return hasValidDate;
}

/**
 * Safely parses JSON string or returns fallback.
 * Discards individual malformed records but keeps valid ones.
 */
function safeParseJson(jsonString, fallback = []) {
  if (!jsonString) return fallback;
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return fallback;

    // Validate each record individually
    const valid = parsed.filter((record) => {
      const ok = isValidRecord(record);
      if (!ok && __DEV__) {
        console.warn('[StorageService] Discarding malformed record:', record);
      }
      return ok;
    });

    return valid;
  } catch (error) {
    if (__DEV__) {
      console.warn('[StorageService] Corrupted storage data, resetting to fallback:', error);
    }
    return fallback;
  }
}

/**
 * Saves a new scan result to local AsyncStorage history.
 * @param {object} scan - The scan object to persist.
 * @returns {Promise<boolean>}
 */
export async function saveToHistory(scan) {
  if (!scan) return false;

  try {
    const existingHistory = await AsyncStorage.getItem(HISTORY_KEY);
    const history = safeParseJson(existingHistory, []);

    const newScan = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      mode: scan.mode || 'HEALTH',
      extractedText: scan.extractedText || '',
      analysis: scan.analysis || '',
      savedAt: new Date().toISOString(),
      timestamp: scan.timestamp || new Date().toISOString(),
      backedUp: false,
    };

    history.push(newScan);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    showToast('Saved to history');
    return true;
  } catch (error) {
    if (__DEV__) {
      console.error('[StorageService] Error saving to history:', error);
    }
    showToast('Failed to save to history');
    return false;
  }
}

/**
 * Retrieves all stored scans sorted newest first.
 * @returns {Promise<{ status: 'ok'|'empty'|'error', scans: Array, error?: string }>}
 */
export async function getHistory() {
  try {
    const existingHistory = await AsyncStorage.getItem(HISTORY_KEY);
    const scans = safeParseJson(existingHistory, []);

    if (scans.length === 0) {
      return { status: STORAGE_STATUS.EMPTY, scans: [] };
    }

    const sorted = scans.sort((a, b) => {
      const timeA = new Date(a.savedAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.savedAt || b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    return { status: STORAGE_STATUS.OK, scans: sorted };
  } catch (error) {
    if (__DEV__) {
      console.error('[StorageService] Error loading history:', error);
    }
    return {
      status: STORAGE_STATUS.ERROR,
      scans: [],
      error: error.message || 'Failed to load history',
    };
  }
}

/**
 * Deletes a single scan by ID.
 * @param {string} scanId
 * @returns {Promise<boolean>}
 */
export async function deleteFromHistory(scanId) {
  if (!scanId) return false;

  try {
    const existingHistory = await AsyncStorage.getItem(HISTORY_KEY);
    const scans = safeParseJson(existingHistory, []);

    const filtered = scans.filter((scan) => scan.id !== scanId);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));

    showToast('Scan deleted');
    return true;
  } catch (error) {
    if (__DEV__) {
      console.error('[StorageService] Error deleting scan:', error);
    }
    showToast('Failed to delete scan');
    return false;
  }
}

/**
 * Checks for scans approaching 30-day retention and auto-prunes expired scans.
 * Scans with `backedUp: true` are exempt from auto-pruning.
 * @returns {Promise<Array>} Scans requiring backup warnings.
 */
export async function checkAndWarnAboutOldScans() {
  try {
    const existingHistory = await AsyncStorage.getItem(HISTORY_KEY);
    const scans = safeParseJson(existingHistory, []);

    const now = Date.now();
    const scansToWarn = [];
    const scansToDelete = [];

    scans.forEach((scan) => {
      const scanTime = new Date(scan.savedAt || scan.timestamp || now).getTime();
      if (isNaN(scanTime)) return;

      const age = now - scanTime;

      // Delete if older than 30 days AND not backed up
      if (age > THIRTY_DAYS && !scan.backedUp) {
        scansToDelete.push(scan.id);
      }
      // Warn if older than 26 days (and not already backed up)
      else if (age > WARNING_BEFORE_DAYS && !scan.backedUp) {
        scansToWarn.push(scan);
      }
    });

    if (scansToDelete.length > 0) {
      const filtered = scans.filter((scan) => !scansToDelete.includes(scan.id));
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
      if (__DEV__) {
        console.log('[StorageService] Auto-pruned expired scans:', scansToDelete.length);
      }
    }

    return scansToWarn;
  } catch (error) {
    if (__DEV__) {
      console.error('[StorageService] Error checking old scans:', error);
    }
    return [];
  }
}

/**
 * Marks a scan as backed up to prevent recurring deletion warnings.
 * @param {string} scanId
 * @returns {Promise<boolean>}
 */
export async function markAsBackedUp(scanId) {
  if (!scanId) return false;

  try {
    const existingHistory = await AsyncStorage.getItem(HISTORY_KEY);
    const scans = safeParseJson(existingHistory, []);

    const updated = scans.map((scan) =>
      scan.id === scanId ? { ...scan, backedUp: true } : scan
    );

    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    showToast('Marked as backed up');
    return true;
  } catch (error) {
    if (__DEV__) {
      console.error('[StorageService] Error marking backup:', error);
    }
    return false;
  }
}

/**
 * Shows an expiration warning dialog for a scan.
 * Returns true if the user chose to save/export, false if dismissed.
 * Dismissal does NOT mark the scan as exported.
 *
 * @param {object} scan
 * @param {Function} onSavePress - Called when user chooses to save/export.
 * @param {Function} onIgnorePress - Called when user dismisses (optional).
 * @returns {Promise<boolean>}
 */
export async function showDeleteWarningAlert(scan, onSavePress, onIgnorePress) {
  const formattedDate = new Date(scan.savedAt || scan.timestamp).toLocaleDateString();

  const confirmed = await confirmAction(
    'Scan Expiring Soon',
    `Your scan from ${formattedDate} will be deleted in 4 days.\n\nWould you like to export/save it first?`,
    { confirmText: 'Save / Export', cancelText: 'Dismiss' }
  );

  if (confirmed) {
    onSavePress?.(scan);
  } else {
    onIgnorePress?.(scan);
  }

  return confirmed;
}

/**
 * Clears all scan history from AsyncStorage.
 * @returns {Promise<boolean>}
 */
export async function clearAllHistory() {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
    showToast('All scan history cleared');
    return true;
  } catch (error) {
    if (__DEV__) {
      console.error('[StorageService] Error clearing history:', error);
    }
    showToast('Failed to clear history');
    return false;
  }
}

/**
 * Returns the total number of saved scans.
 * @returns {Promise<{ status: 'ok'|'error', count: number, error?: string }>}
 */
export async function getHistoryCount() {
  try {
    const existingHistory = await AsyncStorage.getItem(HISTORY_KEY);
    const scans = safeParseJson(existingHistory, []);
    return { status: STORAGE_STATUS.OK, count: scans.length };
  } catch (error) {
    if (__DEV__) {
      console.error('[StorageService] Error getting history count:', error);
    }
    return {
      status: STORAGE_STATUS.ERROR,
      count: 0,
      error: error.message || 'Failed to get history count',
    };
  }
}

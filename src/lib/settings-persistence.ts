/**
 * Settings Persistence Utility
 * Provides localStorage backup and recovery for settings to prevent data loss
 */

const BACKUP_PREFIX = 'settings_backup_';
const BACKUP_TIMESTAMP_SUFFIX = '_timestamp';
const BACKUP_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface BackupData<T> {
  data: T;
  timestamp: number;
  organizationId: string;
  userId: string;
}

/**
 * Create a backup key for a specific settings table
 */
function getBackupKey(tableName: string, organizationId: string): string {
  return `${BACKUP_PREFIX}${tableName}_${organizationId}`;
}

/**
 * Save settings to localStorage as backup
 */
export function backupSettings<T>(
  tableName: string,
  organizationId: string,
  userId: string,
  data: T
): boolean {
  try {
    const backupData: BackupData<T> = {
      data,
      timestamp: Date.now(),
      organizationId,
      userId,
    };

    const key = getBackupKey(tableName, organizationId);
    localStorage.setItem(key, JSON.stringify(backupData));

    console.log(`[Settings Persistence] Backed up ${tableName} for org ${organizationId}`);
    return true;
  } catch (error) {
    console.error(`[Settings Persistence] Failed to backup ${tableName}:`, error);
    return false;
  }
}

/**
 * Restore settings from localStorage backup
 */
export function restoreSettings<T>(
  tableName: string,
  organizationId: string
): BackupData<T> | null {
  try {
    const key = getBackupKey(tableName, organizationId);
    const backupJson = localStorage.getItem(key);

    if (!backupJson) {
      return null;
    }

    const backup = JSON.parse(backupJson) as BackupData<T>;

    // Check if backup is too old
    const age = Date.now() - backup.timestamp;
    if (age > BACKUP_MAX_AGE_MS) {
      console.log(`[Settings Persistence] Backup for ${tableName} is too old (${Math.floor(age / 1000 / 60)} minutes), discarding`);
      clearBackup(tableName, organizationId);
      return null;
    }

    console.log(`[Settings Persistence] Restored backup for ${tableName} (${Math.floor(age / 1000)} seconds old)`);
    return backup;
  } catch (error) {
    console.error(`[Settings Persistence] Failed to restore ${tableName}:`, error);
    return null;
  }
}

/**
 * Clear backup from localStorage after successful save
 */
export function clearBackup(tableName: string, organizationId: string): void {
  try {
    const key = getBackupKey(tableName, organizationId);
    localStorage.removeItem(key);
    console.log(`[Settings Persistence] Cleared backup for ${tableName}`);
  } catch (error) {
    console.error(`[Settings Persistence] Failed to clear backup:`, error);
  }
}

/**
 * Check if there's an unsaved backup
 */
export function hasUnsavedBackup(tableName: string, organizationId: string): boolean {
  try {
    const key = getBackupKey(tableName, organizationId);
    const backupJson = localStorage.getItem(key);

    if (!backupJson) {
      return false;
    }

    const backup = JSON.parse(backupJson) as BackupData<any>;
    const age = Date.now() - backup.timestamp;

    return age <= BACKUP_MAX_AGE_MS;
  } catch (error) {
    return false;
  }
}

/**
 * Get backup age in milliseconds
 */
export function getBackupAge(tableName: string, organizationId: string): number | null {
  try {
    const key = getBackupKey(tableName, organizationId);
    const backupJson = localStorage.getItem(key);

    if (!backupJson) {
      return null;
    }

    const backup = JSON.parse(backupJson) as BackupData<any>;
    return Date.now() - backup.timestamp;
  } catch (error) {
    return null;
  }
}

/**
 * Clean up old backups from localStorage
 */
export function cleanupOldBackups(): void {
  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key && key.startsWith(BACKUP_PREFIX)) {
        try {
          const backupJson = localStorage.getItem(key);
          if (backupJson) {
            const backup = JSON.parse(backupJson) as BackupData<any>;
            const age = Date.now() - backup.timestamp;

            if (age > BACKUP_MAX_AGE_MS) {
              keysToRemove.push(key);
            }
          }
        } catch (error) {
          // Invalid JSON, remove it
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    if (keysToRemove.length > 0) {
      console.log(`[Settings Persistence] Cleaned up ${keysToRemove.length} old backups`);
    }
  } catch (error) {
    console.error('[Settings Persistence] Failed to cleanup old backups:', error);
  }
}

/**
 * Save operation with retry logic
 */
export async function saveWithRetry<T>(
  saveFunction: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<{ success: boolean; data?: T; error?: Error }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Settings Persistence] Save attempt ${attempt}/${maxRetries}`);
      const data = await saveFunction();
      return { success: true, data };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Settings Persistence] Save attempt ${attempt} failed:`, lastError.message);

      if (attempt < maxRetries) {
        const delay = delayMs * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`[Settings Persistence] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return { success: false, error: lastError || new Error('Save failed after retries') };
}

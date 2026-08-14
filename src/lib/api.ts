import { TaskSummary, TaskRecord, AppLockStatus, AppLockTimeout, Note } from '../types';
import { firestoreService, UserDoc } from './firestoreService';

const DEVICE_ID_KEY = 'ledgerflow_device_id';
const APP_TOKEN_SESSION_KEY = 'ledgerflow_app_token';

/**
 * Gets or creates the unique, secure anonymous installation identifier stored locally on the device.
 * The user never needs to see this identifier.
 */
export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'inst_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// In-memory or session token for App-level Lock
let appSessionToken: string | null = sessionStorage.getItem(APP_TOKEN_SESSION_KEY) || null;

export function setAppToken(token: string) {
  appSessionToken = token;
  sessionStorage.setItem(APP_TOKEN_SESSION_KEY, token);
}

export function getAppToken(): string | null {
  return appSessionToken || sessionStorage.getItem(APP_TOKEN_SESSION_KEY);
}

export function removeAppToken() {
  appSessionToken = null;
  sessionStorage.removeItem(APP_TOKEN_SESSION_KEY);
}

// In-memory token store for unlocked individual tasks
const unlockedTaskTokens = new Map<string, string>();

export function setTaskToken(taskId: string, token: string) {
  unlockedTaskTokens.set(taskId, token);
}

export function getTaskToken(taskId: string): string | undefined {
  return unlockedTaskTokens.get(taskId);
}

export function removeTaskToken(taskId: string) {
  unlockedTaskTokens.delete(taskId);
}

export function isTaskUnlocked(taskId: string): boolean {
  return unlockedTaskTokens.has(taskId);
}

export function clearAllTaskTokens() {
  unlockedTaskTokens.clear();
}

/**
 * Unified Ledger Flow API layer directly backed by Firebase Cloud Firestore.
 * Completely login-free with zero Firebase Authentication user accounts.
 */
export const api = {
  async initDevice(): Promise<{ userId: string; deviceId: string; appLock: AppLockStatus }> {
    const installationId = getOrCreateDeviceId();
    const { appLock } = await firestoreService.initUser(installationId);
    
    // Check if session token already validates app lock
    const currentToken = getAppToken();
    if (currentToken && appLock.isSetup) {
      appLock.isUnlocked = true;
    }

    return {
      userId: installationId,
      deviceId: installationId,
      appLock,
    };
  },

  // --- App Lock Operations ---
  async getAppLockStatus(): Promise<AppLockStatus> {
    const installationId = getOrCreateDeviceId();
    const { appLock } = await firestoreService.initUser(installationId);
    const currentToken = getAppToken();
    if (currentToken && appLock.isSetup) {
      appLock.isUnlocked = true;
    }
    return appLock;
  },

  async setupAppLock(password: string, timeout: AppLockTimeout = 'closed'): Promise<{ success: boolean; appToken: string }> {
    const installationId = getOrCreateDeviceId();
    const res = await firestoreService.setupAppLock(installationId, password, timeout);
    const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    setAppToken(token);
    return { success: true, appToken: token };
  },

  async unlockApp(password: string): Promise<{ success: boolean; appToken: string }> {
    const installationId = getOrCreateDeviceId();
    const res = await firestoreService.verifyAppLock(installationId, password);
    if (!res.success) {
      const err = new Error(res.message || 'Incorrect password.');
      (err as any).lockedRemainingSec = res.lockedRemainingSec;
      throw err;
    }
    const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    setAppToken(token);
    return { success: true, appToken: token };
  },

  async lockApp(): Promise<void> {
    removeAppToken();
    clearAllTaskTokens();
  },

  async changeAppPassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const installationId = getOrCreateDeviceId();
    const res = await firestoreService.changeAppPassword(installationId, currentPassword, newPassword);
    return { success: res.success, message: res.message || 'App password updated successfully.' };
  },

  async updateAppLockSettings(timeout?: AppLockTimeout, enabled?: boolean): Promise<{ success: boolean; status: AppLockStatus }> {
    const installationId = getOrCreateDeviceId();
    const status = await firestoreService.updateAppLockSettings(installationId, timeout, enabled);
    return { success: true, status };
  },

  async resetUserData(): Promise<{ success: boolean }> {
    const installationId = getOrCreateDeviceId();
    const res = await firestoreService.resetUserData(installationId);
    removeAppToken();
    clearAllTaskTokens();
    return res;
  },

  // --- Task Persistence Operations in Firestore ---
  async getTasks(): Promise<TaskSummary[]> {
    const installationId = getOrCreateDeviceId();
    return firestoreService.getTasks(installationId);
  },

  async createTask(taskName: string, password: string): Promise<{ task: TaskSummary; token: string }> {
    const installationId = getOrCreateDeviceId();
    const { task } = await firestoreService.createTask(installationId, taskName, password);
    const token = 'tasktoken_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    setTaskToken(task.id, token);
    return { task, token };
  },

  async unlockTask(taskId: string, password: string): Promise<{ success: boolean; token: string; task: TaskSummary; records: TaskRecord[] }> {
    const installationId = getOrCreateDeviceId();
    const { task, records } = await firestoreService.unlockTask(installationId, taskId, password);
    const token = 'tasktoken_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    setTaskToken(taskId, token);
    return { success: true, token, task, records };
  },

  async lockTask(taskId: string): Promise<void> {
    removeTaskToken(taskId);
  },

  async getTaskRecords(taskId: string): Promise<{ task: TaskSummary; records: TaskRecord[] }> {
    const installationId = getOrCreateDeviceId();
    const tasks = await firestoreService.getTasks(installationId);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error('Task not found in Firestore.');
    }
    const records = await firestoreService.getTaskRecords(installationId, taskId);
    return { task, records };
  },

  async saveTaskRecords(
    taskId: string,
    records: Array<Omit<TaskRecord, 'task_id' | 'created_at' | 'updated_at'> & { id?: string }>
  ): Promise<{ task: TaskSummary; records: TaskRecord[] }> {
    const installationId = getOrCreateDeviceId();
    return firestoreService.saveTaskRecords(installationId, taskId, records as TaskRecord[]);
  },

  async renameTask(taskId: string, newName: string): Promise<TaskSummary> {
    const installationId = getOrCreateDeviceId();
    return firestoreService.renameTask(installationId, taskId, newName);
  },

  async changePassword(taskId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const installationId = getOrCreateDeviceId();
    await firestoreService.changeTaskPassword(installationId, taskId, currentPassword, newPassword);
    return { success: true, message: 'Task password changed successfully.' };
  },

  async duplicateTask(taskId: string, newName: string, newPassword: string): Promise<{ task: TaskSummary; token: string }> {
    const installationId = getOrCreateDeviceId();
    const { task } = await firestoreService.duplicateTask(installationId, taskId, newName, newPassword);
    const token = 'tasktoken_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    setTaskToken(task.id, token);
    return { task, token };
  },

  async deleteTask(taskId: string): Promise<void> {
    const installationId = getOrCreateDeviceId();
    await firestoreService.deleteTask(installationId, taskId);
    removeTaskToken(taskId);
  },

  // --- Dedicated Notepad Operations (Firestore) ---
  async getNotes(): Promise<Note[]> {
    const installationId = getOrCreateDeviceId();
    return firestoreService.getNotes(installationId);
  },

  async saveNote(note: Partial<Note> & { id?: string }): Promise<Note> {
    const installationId = getOrCreateDeviceId();
    return firestoreService.saveNote(installationId, note);
  },

  async deleteNote(noteId: string): Promise<{ success: boolean }> {
    const installationId = getOrCreateDeviceId();
    return firestoreService.deleteNote(installationId, noteId);
  },

  async restoreNote(noteId: string): Promise<{ success: boolean }> {
    const installationId = getOrCreateDeviceId();
    return firestoreService.restoreNote(installationId, noteId);
  },

  async permanentDeleteNote(noteId: string): Promise<{ success: boolean }> {
    const installationId = getOrCreateDeviceId();
    return firestoreService.permanentDeleteNote(installationId, noteId);
  },

  async emptyTrash(): Promise<{ success: boolean; deletedCount: number }> {
    const installationId = getOrCreateDeviceId();
    return firestoreService.emptyTrash(installationId);
  },

  async exportBackup(): Promise<any> {
    const installationId = getOrCreateDeviceId();
    return firestoreService.exportBackup(installationId);
  },

  async restoreBackup(backupData: any): Promise<{ success: boolean; importedCount: number; importedNotesCount?: number }> {
    const installationId = getOrCreateDeviceId();
    const res = await firestoreService.restoreBackup(installationId, backupData);
    return { success: true, importedCount: res.importedCount, importedNotesCount: res.importedNotesCount };
  },
};

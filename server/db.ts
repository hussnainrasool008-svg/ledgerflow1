import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { hashPassword, verifyPassword, generateSessionToken } from './crypto.js';

export interface AnonymousUser {
  id: string;
  anonymous_device_id: string;
  app_password_hash?: string;
  app_password_salt?: string;
  app_password_version?: string;
  app_lock_enabled?: boolean;
  app_lock_timeout?: 'immediately' | '1m' | '5m' | '15m' | 'closed';
  app_failed_attempts?: number;
  app_locked_until?: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  anonymous_user_id: string;
  task_name: string;
  password_hash: string;
  password_salt: string;
  password_version: string;
  failed_attempts: number;
  locked_until: number;
  created_at: string;
  updated_at: string;
  last_opened_at: string;
}

export interface TaskRecord {
  id: string;
  task_id: string;
  customer_name: string;
  item: string;
  quantity: number;
  price: number;
  total: number;
  date: string;
  created_at: string;
  updated_at: string;
  order_index: number;
}

export interface TaskPublicSummary {
  id: string;
  task_name: string;
  record_count: number;
  grand_total: number;
  created_at: string;
  updated_at: string;
  last_opened_at: string;
  is_protected: boolean;
}

interface DatabaseSchema {
  users: Record<string, AnonymousUser>;
  tasks: Record<string, Task>;
  records: Record<string, TaskRecord[]>;
}

// In-memory active session tokens for unlocked tasks: token -> { taskId, userId, expiresAt }
interface ActiveSession {
  taskId: string;
  userId: string;
  expiresAt: number;
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'ledgerflow_db.json');

class DatabaseService {
  private data: DatabaseSchema = {
    users: {},
    tasks: {},
    records: {},
  };

  private activeSessions: Map<string, ActiveSession> = new Map();

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Error initializing database file:', err);
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  public getOrCreateUser(deviceId: string): AnonymousUser {
    if (!deviceId) {
      deviceId = crypto.randomUUID();
    }
    let user = Object.values(this.data.users).find((u) => u.anonymous_device_id === deviceId);
    if (!user) {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      user = {
        id,
        anonymous_device_id: deviceId,
        created_at: now,
        updated_at: now,
      };
      this.data.users[id] = user;
      this.save();
    }
    return user;
  }

  public getTasksForUser(userId: string): TaskPublicSummary[] {
    const userTasks = Object.values(this.data.tasks).filter((t) => t.anonymous_user_id === userId);

    return userTasks
      .map((t) => {
        const taskRecs = this.data.records[t.id] || [];
        const grandTotal = taskRecs.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
        return {
          id: t.id,
          task_name: t.task_name,
          record_count: taskRecs.length,
          grand_total: grandTotal,
          created_at: t.created_at,
          updated_at: t.updated_at,
          last_opened_at: t.last_opened_at,
          is_protected: true,
        };
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  public createTask(userId: string, taskName: string, password: string): { task: TaskPublicSummary; token: string } {
    if (!taskName || !taskName.trim()) {
      throw new Error('Task name is required.');
    }
    if (!password) {
      throw new Error('Password is required.');
    }

    const { salt, hash, version } = hashPassword(password);
    const now = new Date().toISOString();
    const taskId = crypto.randomUUID();

    const task: Task = {
      id: taskId,
      anonymous_user_id: userId,
      task_name: taskName.trim(),
      password_hash: hash,
      password_salt: salt,
      password_version: version,
      failed_attempts: 0,
      locked_until: 0,
      created_at: now,
      updated_at: now,
      last_opened_at: now,
    };

    this.data.tasks[taskId] = task;
    this.data.records[taskId] = [];
    this.save();

    // Issue session token for immediate access
    const token = generateSessionToken();
    this.activeSessions.set(token, {
      taskId,
      userId,
      expiresAt: Date.now() + 4 * 60 * 60 * 1000, // 4 hours
    });

    return {
      task: {
        id: task.id,
        task_name: task.task_name,
        record_count: 0,
        grand_total: 0,
        created_at: task.created_at,
        updated_at: task.updated_at,
        last_opened_at: task.last_opened_at,
        is_protected: true,
      },
      token,
    };
  }

  public verifyTaskPassword(taskId: string, userId: string, password: string): { success: boolean; token?: string; message?: string; lockedRemainingSec?: number } {
    const task = this.data.tasks[taskId];
    if (!task || task.anonymous_user_id !== userId) {
      return { success: false, message: 'Task not found or unauthorized.' };
    }

    const now = Date.now();
    if (task.locked_until && task.locked_until > now) {
      const remainingSec = Math.ceil((task.locked_until - now) / 1000);
      return {
        success: false,
        message: `Too many failed attempts. Task is locked for security. Please try again in ${remainingSec} seconds.`,
        lockedRemainingSec: remainingSec,
      };
    }

    const isValid = verifyPassword(password, task.password_salt, task.password_hash);
    if (!isValid) {
      task.failed_attempts = (task.failed_attempts || 0) + 1;
      if (task.failed_attempts >= 5) {
        // Lock for 30 seconds after 5 failures
        task.locked_until = now + 30 * 1000;
        this.save();
        return {
          success: false,
          message: 'Incorrect password. 5 failed attempts reached. Task temporarily locked for 30 seconds.',
          lockedRemainingSec: 30,
        };
      }
      this.save();
      const remaining = 5 - task.failed_attempts;
      return {
        success: false,
        message: `Incorrect password. Please try again. (${remaining} attempts remaining before security cooldown)`,
      };
    }

    // Success: reset rate limiting
    task.failed_attempts = 0;
    task.locked_until = 0;
    task.last_opened_at = new Date().toISOString();
    this.save();

    const token = generateSessionToken();
    this.activeSessions.set(token, {
      taskId,
      userId,
      expiresAt: Date.now() + 4 * 60 * 60 * 1000,
    });

    return { success: true, token };
  }

  public isAuthorizedSession(taskId: string, userId: string, token: string | undefined): boolean {
    if (!token) return false;
    const session = this.activeSessions.get(token);
    if (!session) return false;
    if (session.taskId !== taskId || session.userId !== userId) return false;
    if (session.expiresAt < Date.now()) {
      this.activeSessions.delete(token);
      return false;
    }
    return true;
  }

  public lockTaskSession(token: string | undefined): void {
    if (token) {
      this.activeSessions.delete(token);
    }
  }

  public getTaskRecords(taskId: string, userId: string, token: string | undefined): { task: TaskPublicSummary; records: TaskRecord[] } {
    const task = this.data.tasks[taskId];
    if (!task || task.anonymous_user_id !== userId) {
      throw new Error('Task not found.');
    }
    if (!this.isAuthorizedSession(taskId, userId, token)) {
      throw new Error('Unauthorized. Valid task unlock token required.');
    }

    const records = (this.data.records[taskId] || []).sort((a, b) => a.order_index - b.order_index);
    const grandTotal = records.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

    return {
      task: {
        id: task.id,
        task_name: task.task_name,
        record_count: records.length,
        grand_total: grandTotal,
        created_at: task.created_at,
        updated_at: task.updated_at,
        last_opened_at: task.last_opened_at,
        is_protected: true,
      },
      records,
    };
  }

  public updateTaskRecords(
    taskId: string,
    userId: string,
    token: string | undefined,
    records: Array<Omit<TaskRecord, 'task_id' | 'created_at' | 'updated_at' | 'order_index'> & { id?: string; order_index?: number }>
  ): { task: TaskPublicSummary; records: TaskRecord[] } {
    const task = this.data.tasks[taskId];
    if (!task || task.anonymous_user_id !== userId) {
      throw new Error('Task not found.');
    }
    if (!this.isAuthorizedSession(taskId, userId, token)) {
      throw new Error('Unauthorized. Valid task unlock token required.');
    }

    const now = new Date().toISOString();
    const formattedRecords: TaskRecord[] = records.map((rec, index) => {
      const qty = Number(rec.quantity) || 0;
      const price = Number(rec.price) || 0;
      const total = qty * price;
      return {
        id: rec.id || crypto.randomUUID(),
        task_id: taskId,
        customer_name: rec.customer_name || '',
        item: rec.item || '',
        quantity: qty,
        price: price,
        total: total,
        date: rec.date || new Date().toISOString().split('T')[0],
        created_at: now,
        updated_at: now,
        order_index: typeof rec.order_index === 'number' ? rec.order_index : index,
      };
    });

    this.data.records[taskId] = formattedRecords;
    task.updated_at = now;
    this.save();

    const grandTotal = formattedRecords.reduce((sum, r) => sum + r.total, 0);

    return {
      task: {
        id: task.id,
        task_name: task.task_name,
        record_count: formattedRecords.length,
        grand_total: grandTotal,
        created_at: task.created_at,
        updated_at: task.updated_at,
        last_opened_at: task.last_opened_at,
        is_protected: true,
      },
      records: formattedRecords,
    };
  }

  public renameTask(taskId: string, userId: string, token: string | undefined, newName: string): TaskPublicSummary {
    const task = this.data.tasks[taskId];
    if (!task || task.anonymous_user_id !== userId) {
      throw new Error('Task not found.');
    }
    if (!this.isAuthorizedSession(taskId, userId, token)) {
      throw new Error('Unauthorized. Valid task unlock token required.');
    }
    if (!newName || !newName.trim()) {
      throw new Error('Task name cannot be empty.');
    }

    const now = new Date().toISOString();
    task.task_name = newName.trim();
    task.updated_at = now;
    this.save();

    const taskRecs = this.data.records[taskId] || [];
    const grandTotal = taskRecs.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

    return {
      id: task.id,
      task_name: task.task_name,
      record_count: taskRecs.length,
      grand_total: grandTotal,
      created_at: task.created_at,
      updated_at: task.updated_at,
      last_opened_at: task.last_opened_at,
      is_protected: true,
    };
  }

  public changePassword(taskId: string, userId: string, currentPassword: string, newPassword: string): { success: boolean; message?: string } {
    const task = this.data.tasks[taskId];
    if (!task || task.anonymous_user_id !== userId) {
      return { success: false, message: 'Task not found.' };
    }
    if (!verifyPassword(currentPassword, task.password_salt, task.password_hash)) {
      return { success: false, message: 'Current password is incorrect.' };
    }
    if (!newPassword || newPassword.length < 1) {
      return { success: false, message: 'New password is required.' };
    }

    const { salt, hash, version } = hashPassword(newPassword);
    task.password_salt = salt;
    task.password_hash = hash;
    task.password_version = version;
    task.updated_at = new Date().toISOString();
    this.save();

    return { success: true, message: 'Password changed successfully.' };
  }

  public deleteTask(taskId: string, userId: string, token: string | undefined): { success: boolean } {
    const task = this.data.tasks[taskId];
    if (!task || task.anonymous_user_id !== userId) {
      throw new Error('Task not found.');
    }
    if (!this.isAuthorizedSession(taskId, userId, token)) {
      throw new Error('Unauthorized. Valid task unlock token required.');
    }

    delete this.data.tasks[taskId];
    delete this.data.records[taskId];

    // Remove any active sessions for this task
    for (const [sToken, session] of this.activeSessions.entries()) {
      if (session.taskId === taskId) {
        this.activeSessions.delete(sToken);
      }
    }

    this.save();
    return { success: true };
  }

  public duplicateTask(taskId: string, userId: string, token: string | undefined, newName: string, newPassword: string): { task: TaskPublicSummary; token: string } {
    const sourceTask = this.data.tasks[taskId];
    if (!sourceTask || sourceTask.anonymous_user_id !== userId) {
      throw new Error('Source task not found.');
    }
    if (!this.isAuthorizedSession(taskId, userId, token)) {
      throw new Error('Unauthorized. Valid source task unlock token required.');
    }

    const sourceRecords = this.data.records[taskId] || [];
    const createResult = this.createTask(userId, newName, newPassword);

    // Clone records to new task
    const now = new Date().toISOString();
    const clonedRecords: TaskRecord[] = sourceRecords.map((r, i) => ({
      id: crypto.randomUUID(),
      task_id: createResult.task.id,
      customer_name: r.customer_name,
      item: r.item,
      quantity: r.quantity,
      price: r.price,
      total: r.total,
      date: r.date,
      created_at: now,
      updated_at: now,
      order_index: i,
    }));

    this.data.records[createResult.task.id] = clonedRecords;
    this.save();

    const grandTotal = clonedRecords.reduce((sum, r) => sum + r.total, 0);

    return {
      task: {
        ...createResult.task,
        record_count: clonedRecords.length,
        grand_total: grandTotal,
      },
      token: createResult.token,
    };
  }

  public exportAllUserData(userId: string): { tasks: Array<Task & { records: TaskRecord[] }> } {
    const userTasks = Object.values(this.data.tasks).filter((t) => t.anonymous_user_id === userId);
    const exportTasks = userTasks.map((t) => ({
      ...t,
      records: this.data.records[t.id] || [],
    }));
    return { tasks: exportTasks };
  }

  public importUserData(userId: string, backupData: { tasks: Array<Task & { records: TaskRecord[] }> }): { importedCount: number } {
    if (!backupData || !Array.isArray(backupData.tasks)) {
      throw new Error('Invalid backup format.');
    }

    let count = 0;
    for (const item of backupData.tasks) {
      const newTaskId = crypto.randomUUID();
      const now = new Date().toISOString();
      const task: Task = {
        id: newTaskId,
        anonymous_user_id: userId,
        task_name: item.task_name || 'Restored Task',
        password_hash: item.password_hash,
        password_salt: item.password_salt,
        password_version: item.password_version || 'pbkdf2-sha512-v1',
        failed_attempts: 0,
        locked_until: 0,
        created_at: item.created_at || now,
        updated_at: now,
        last_opened_at: now,
      };
      this.data.tasks[newTaskId] = task;

      const records = (item.records || []).map((r, idx) => ({
        id: crypto.randomUUID(),
        task_id: newTaskId,
        customer_name: r.customer_name || '',
        item: r.item || '',
        quantity: Number(r.quantity) || 0,
        price: Number(r.price) || 0,
        total: Number(r.total) || (Number(r.quantity) || 0) * (Number(r.price) || 0),
        date: r.date || now.split('T')[0],
        created_at: r.created_at || now,
        updated_at: now,
        order_index: idx,
      }));
      this.data.records[newTaskId] = records;
      count++;
    }

    this.save();
    return { importedCount: count };
  }

  // --- App Lock Methods ---

  public getAppLockStatus(userId: string): {
    isSetup: boolean;
    enabled: boolean;
    timeout: 'immediately' | '1m' | '5m' | '15m' | 'closed';
  } {
    const user = this.data.users[userId];
    if (!user) {
      return { isSetup: false, enabled: false, timeout: 'closed' };
    }
    const isSetup = Boolean(user.app_password_hash && user.app_password_salt);
    return {
      isSetup,
      enabled: user.app_lock_enabled ?? isSetup,
      timeout: user.app_lock_timeout || 'closed',
    };
  }

  public setupAppPassword(
    userId: string,
    password: string,
    timeout: 'immediately' | '1m' | '5m' | '15m' | 'closed' = 'closed'
  ): { success: boolean; appToken: string } {
    const user = this.data.users[userId];
    if (!user) {
      throw new Error('User device session not found.');
    }
    if (!password || password.length < 3) {
      throw new Error('App password must be at least 3 characters.');
    }

    const { salt, hash, version } = hashPassword(password);
    user.app_password_hash = hash;
    user.app_password_salt = salt;
    user.app_password_version = version;
    user.app_lock_enabled = true;
    user.app_lock_timeout = timeout;
    user.app_failed_attempts = 0;
    user.app_locked_until = 0;
    user.updated_at = new Date().toISOString();
    this.save();

    const appToken = generateSessionToken();
    this.activeSessions.set(appToken, {
      taskId: 'APP_LOCK_ROOT',
      userId,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    return { success: true, appToken };
  }

  public verifyAppPassword(
    userId: string,
    password: string
  ): { success: boolean; appToken?: string; message?: string; lockedRemainingSec?: number } {
    const user = this.data.users[userId];
    if (!user || !user.app_password_hash || !user.app_password_salt) {
      return { success: false, message: 'App lock has not been configured.' };
    }

    const now = Date.now();
    if (user.app_locked_until && user.app_locked_until > now) {
      const remainingSec = Math.ceil((user.app_locked_until - now) / 1000);
      return {
        success: false,
        message: `Too many failed attempts. App is locked for security. Please try again in ${remainingSec} seconds.`,
        lockedRemainingSec: remainingSec,
      };
    }

    const isValid = verifyPassword(password, user.app_password_salt, user.app_password_hash);
    if (!isValid) {
      user.app_failed_attempts = (user.app_failed_attempts || 0) + 1;
      if (user.app_failed_attempts >= 5) {
        user.app_locked_until = now + 30 * 1000; // 30s lockout
        this.save();
        return {
          success: false,
          message: 'Incorrect password. 5 failed attempts reached. App temporarily locked for 30 seconds.',
          lockedRemainingSec: 30,
        };
      }
      this.save();
      const remaining = 5 - user.app_failed_attempts;
      return {
        success: false,
        message: `Incorrect password. (${remaining} attempts remaining before temporary security lock)`,
      };
    }

    // Success
    user.app_failed_attempts = 0;
    user.app_locked_until = 0;
    user.updated_at = new Date().toISOString();
    this.save();

    const appToken = generateSessionToken();
    this.activeSessions.set(appToken, {
      taskId: 'APP_LOCK_ROOT',
      userId,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    return { success: true, appToken };
  }

  public isAuthorizedAppSession(userId: string, appToken: string | undefined): boolean {
    const user = this.data.users[userId];
    if (!user || !user.app_password_hash || user.app_lock_enabled === false) {
      // If app lock is not configured or disabled, access is granted
      return true;
    }
    if (!appToken) return false;
    const session = this.activeSessions.get(appToken);
    if (!session || session.userId !== userId || session.taskId !== 'APP_LOCK_ROOT') {
      return false;
    }
    if (session.expiresAt < Date.now()) {
      this.activeSessions.delete(appToken);
      return false;
    }
    return true;
  }

  public lockAppSession(appToken: string | undefined): void {
    if (appToken) {
      this.activeSessions.delete(appToken);
    }
  }

  public changeAppPassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): { success: boolean; message?: string } {
    const user = this.data.users[userId];
    if (!user || !user.app_password_hash || !user.app_password_salt) {
      return { success: false, message: 'App lock has not been configured.' };
    }

    if (!verifyPassword(currentPassword, user.app_password_salt, user.app_password_hash)) {
      return { success: false, message: 'Current app password is incorrect.' };
    }

    if (!newPassword || newPassword.length < 3) {
      return { success: false, message: 'New password must be at least 3 characters.' };
    }

    const { salt, hash, version } = hashPassword(newPassword);
    user.app_password_hash = hash;
    user.app_password_salt = salt;
    user.app_password_version = version;
    user.updated_at = new Date().toISOString();
    this.save();

    return { success: true, message: 'App password updated successfully.' };
  }

  public updateAppLockSettings(
    userId: string,
    timeout?: 'immediately' | '1m' | '5m' | '15m' | 'closed',
    enabled?: boolean
  ): { success: boolean; status: any } {
    const user = this.data.users[userId];
    if (!user) {
      throw new Error('User not found.');
    }
    if (timeout) {
      user.app_lock_timeout = timeout;
    }
    if (typeof enabled === 'boolean') {
      user.app_lock_enabled = enabled;
    }
    user.updated_at = new Date().toISOString();
    this.save();

    return {
      success: true,
      status: this.getAppLockStatus(userId),
    };
  }

  public resetUserData(userId: string): { success: boolean } {
    const user = this.data.users[userId];
    if (user) {
      delete user.app_password_hash;
      delete user.app_password_salt;
      delete user.app_password_version;
      user.app_lock_enabled = false;
      user.app_failed_attempts = 0;
      user.app_locked_until = 0;
    }

    // Delete all tasks and records for this user
    const taskIds = Object.values(this.data.tasks)
      .filter((t) => t.anonymous_user_id === userId)
      .map((t) => t.id);

    for (const taskId of taskIds) {
      delete this.data.tasks[taskId];
      delete this.data.records[taskId];
    }

    // Invalidate all active sessions for this user
    for (const [token, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        this.activeSessions.delete(token);
      }
    }

    this.save();
    return { success: true };
  }
}

export const db = new DatabaseService();

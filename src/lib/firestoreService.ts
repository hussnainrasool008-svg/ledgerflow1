import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { hashPasswordClient, verifyPasswordClient } from './crypto';
import {
  TaskSummary,
  TaskRecord,
  AppLockStatus,
  AppLockTimeout,
  calculatePaymentStatus,
  calculateRemainingAmount,
  Note,
} from '../types';

export interface UserDoc {
  id: string;
  anonymous_installation_id: string;
  app_password_hash?: string;
  app_password_salt?: string;
  app_password_version?: string;
  app_lock_enabled?: boolean;
  app_lock_timeout?: AppLockTimeout;
  app_failed_attempts?: number;
  app_locked_until?: number;
  created_at: string;
  updated_at: string;
}

export const firestoreService = {
  /**
   * Initializes or loads the anonymous user installation record in Firestore.
   */
  async initUser(installationId: string): Promise<{
    user: UserDoc;
    appLock: AppLockStatus;
  }> {
    const userRef = doc(db, 'users', installationId);
    const snap = await getDoc(userRef);

    let userData: UserDoc;
    const now = new Date().toISOString();

    if (!snap.exists()) {
      userData = {
        id: installationId,
        anonymous_installation_id: installationId,
        app_lock_enabled: false,
        app_lock_timeout: 'closed',
        app_failed_attempts: 0,
        app_locked_until: 0,
        created_at: now,
        updated_at: now,
      };
      await setDoc(userRef, userData);
    } else {
      userData = snap.data() as UserDoc;
    }

    const isSetup = Boolean(userData.app_password_hash && userData.app_password_salt);
    const enabled = userData.app_lock_enabled ?? isSetup;
    const timeout = userData.app_lock_timeout || 'closed';

    return {
      user: userData,
      appLock: {
        isSetup,
        enabled,
        timeout,
        isUnlocked: !isSetup || !enabled,
      },
    };
  },

  /**
   * Sets up App Lock for the first time with PBKDF2/SHA-512 cryptographic hashing.
   */
  async setupAppLock(
    installationId: string,
    password: string,
    timeout: AppLockTimeout = 'closed'
  ): Promise<{ success: boolean; appLock: AppLockStatus }> {
    if (!password || password.length < 3) {
      throw new Error('App password must be at least 3 characters long.');
    }

    const { salt, hash, version } = await hashPasswordClient(password);
    const userRef = doc(db, 'users', installationId);
    const now = new Date().toISOString();

    await setDoc(
      userRef,
      {
        id: installationId,
        anonymous_installation_id: installationId,
        app_password_hash: hash,
        app_password_salt: salt,
        app_password_version: version,
        app_lock_enabled: true,
        app_lock_timeout: timeout,
        app_failed_attempts: 0,
        app_locked_until: 0,
        updated_at: now,
      },
      { merge: true }
    );

    return {
      success: true,
      appLock: {
        isSetup: true,
        enabled: true,
        timeout,
        isUnlocked: true,
      },
    };
  },

  /**
   * Verifies the App Lock password against Firestore cryptographic hashes.
   */
  async verifyAppLock(
    installationId: string,
    password: string
  ): Promise<{ success: boolean; message?: string; lockedRemainingSec?: number }> {
    const userRef = doc(db, 'users', installationId);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      return { success: false, message: 'Installation record not found in Firestore.' };
    }

    const user = snap.data() as UserDoc;
    if (!user.app_password_hash || !user.app_password_salt) {
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

    const isValid = await verifyPasswordClient(password, user.app_password_salt, user.app_password_hash);
    if (!isValid) {
      const failedAttempts = (user.app_failed_attempts || 0) + 1;
      let lockedUntil = 0;
      let remainingSec = 0;

      if (failedAttempts >= 5) {
        lockedUntil = now + 30 * 1000;
        remainingSec = 30;
      }

      await updateDoc(userRef, {
        app_failed_attempts: failedAttempts,
        app_locked_until: lockedUntil,
        updated_at: new Date().toISOString(),
      });

      if (failedAttempts >= 5) {
        return {
          success: false,
          message: 'Incorrect password. 5 failed attempts reached. App temporarily locked for 30 seconds.',
          lockedRemainingSec: 30,
        };
      }

      return {
        success: false,
        message: `Incorrect password. (${5 - failedAttempts} attempts remaining before temporary security lock)`,
      };
    }

    // Success - reset attempts
    await updateDoc(userRef, {
      app_failed_attempts: 0,
      app_locked_until: 0,
      updated_at: new Date().toISOString(),
    });

    return { success: true };
  },

  /**
   * Updates App Lock settings (timeout, enabled state).
   */
  async updateAppLockSettings(
    installationId: string,
    timeout?: AppLockTimeout,
    enabled?: boolean
  ): Promise<AppLockStatus> {
    const userRef = doc(db, 'users', installationId);
    const updates: Partial<UserDoc> = { updated_at: new Date().toISOString() };

    if (timeout) updates.app_lock_timeout = timeout;
    if (typeof enabled === 'boolean') updates.app_lock_enabled = enabled;

    await updateDoc(userRef, updates as any);

    const snap = await getDoc(userRef);
    const user = snap.data() as UserDoc;
    const isSetup = Boolean(user.app_password_hash && user.app_password_salt);

    return {
      isSetup,
      enabled: user.app_lock_enabled ?? isSetup,
      timeout: user.app_lock_timeout || 'closed',
      isUnlocked: true,
    };
  },

  /**
   * Changes the App Lock Master Password.
   */
  async changeAppPassword(
    installationId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string }> {
    const verify = await this.verifyAppLock(installationId, currentPassword);
    if (!verify.success) {
      throw new Error(verify.message || 'Current app password is incorrect.');
    }

    if (!newPassword || newPassword.length < 3) {
      throw new Error('New app password must be at least 3 characters long.');
    }

    const { salt, hash, version } = await hashPasswordClient(newPassword);
    const userRef = doc(db, 'users', installationId);

    await updateDoc(userRef, {
      app_password_hash: hash,
      app_password_salt: salt,
      app_password_version: version,
      app_failed_attempts: 0,
      app_locked_until: 0,
      updated_at: new Date().toISOString(),
    });

    return { success: true, message: 'App password updated successfully.' };
  },

  /**
   * Resets all user data in Firestore (used during forgotten password recovery).
   */
  async resetUserData(installationId: string): Promise<{ success: boolean }> {
    const tasksRef = collection(db, 'users', installationId, 'tasks');
    const tasksSnap = await getDocs(tasksRef);

    // Delete all records and tasks
    for (const taskDoc of tasksSnap.docs) {
      const recordsRef = collection(db, 'users', installationId, 'tasks', taskDoc.id, 'records');
      const recordsSnap = await getDocs(recordsRef);
      const batch = writeBatch(db);
      for (const recDoc of recordsSnap.docs) {
        batch.delete(recDoc.ref);
      }
      batch.delete(taskDoc.ref);
      await batch.commit();
    }

    // Delete all notes
    const notesRef = collection(db, 'users', installationId, 'notes');
    const notesSnap = await getDocs(notesRef);
    if (!notesSnap.empty) {
      const notesBatch = writeBatch(db);
      for (const nDoc of notesSnap.docs) {
        notesBatch.delete(nDoc.ref);
      }
      await notesBatch.commit();
    }

    // Reset user doc
    const userRef = doc(db, 'users', installationId);
    const now = new Date().toISOString();
    await setDoc(userRef, {
      id: installationId,
      anonymous_installation_id: installationId,
      app_lock_enabled: false,
      app_lock_timeout: 'closed',
      app_failed_attempts: 0,
      app_locked_until: 0,
      created_at: now,
      updated_at: now,
    });

    return { success: true };
  },

  /**
   * Fetches all tasks for the current anonymous installation from Firestore.
   */
  async getTasks(installationId: string): Promise<TaskSummary[]> {
    const tasksRef = collection(db, 'users', installationId, 'tasks');
    const snap = await getDocs(tasksRef);

    const list: TaskSummary[] = snap.docs.map((d) => {
      const data = d.data();
      const grandTotal = Number(data.total_amount ?? data.grand_total ?? 0);
      const totalPaid = Number(data.total_paid ?? 0);
      const totalRemaining = Number(data.total_remaining ?? Math.max(0, grandTotal - totalPaid));

      return {
        id: data.id || d.id,
        task_name: data.task_name,
        record_count: data.total_records ?? data.record_count ?? 0,
        grand_total: grandTotal,
        total_paid: totalPaid,
        total_remaining: totalRemaining,
        paid_count: Number(data.paid_count ?? 0),
        partial_count: Number(data.partial_count ?? 0),
        unpaid_count: Number(data.unpaid_count ?? 0),
        created_at: data.created_at,
        updated_at: data.updated_at,
        last_opened_at: data.last_opened_at || data.updated_at,
        is_protected: data.is_password_protected ?? true,
        password_hash: data.password_hash,
        password_salt: data.password_salt,
        password_version: data.password_version,
        anonymous_installation_id: installationId,
      };
    });

    // Sort by updated_at descending
    return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },

  /**
   * Creates a new business task in Firestore with isolated password cryptographic hashing.
   */
  async createTask(
    installationId: string,
    taskName: string,
    password?: string
  ): Promise<{ task: TaskSummary }> {
    const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();

    let salt = '';
    let hash = '';
    let version = '';
    const isProtected = Boolean(password && password.length > 0);

    if (isProtected && password) {
      const hashed = await hashPasswordClient(password);
      salt = hashed.salt;
      hash = hashed.hash;
      version = hashed.version;
    }

    const taskDocData = {
      id: taskId,
      task_name: taskName.trim(),
      is_password_protected: isProtected,
      password_hash: hash,
      password_salt: salt,
      password_version: version,
      total_records: 0,
      total_amount: 0,
      total_paid: 0,
      total_remaining: 0,
      paid_count: 0,
      partial_count: 0,
      unpaid_count: 0,
      created_at: now,
      updated_at: now,
      last_opened_at: now,
      anonymous_installation_id: installationId,
    };

    const taskRef = doc(db, 'users', installationId, 'tasks', taskId);
    await setDoc(taskRef, taskDocData);

    const taskSummary: TaskSummary = {
      id: taskId,
      task_name: taskName.trim(),
      record_count: 0,
      grand_total: 0,
      total_paid: 0,
      total_remaining: 0,
      paid_count: 0,
      partial_count: 0,
      unpaid_count: 0,
      created_at: now,
      updated_at: now,
      last_opened_at: now,
      is_protected: isProtected,
      password_hash: hash,
      password_salt: salt,
      password_version: version,
      anonymous_installation_id: installationId,
    };

    return { task: taskSummary };
  },

  /**
   * Verifies task password and retrieves records from Firestore.
   */
  async unlockTask(
    installationId: string,
    taskId: string,
    password: string
  ): Promise<{ task: TaskSummary; records: TaskRecord[] }> {
    const taskRef = doc(db, 'users', installationId, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);

    if (!taskSnap.exists()) {
      throw new Error('Task not found in Firestore.');
    }

    const t = taskSnap.data();

    if (t.is_password_protected) {
      if (!t.password_hash || !t.password_salt) {
        throw new Error('Task password is corrupted.');
      }
      const isValid = await verifyPasswordClient(password, t.password_salt, t.password_hash);
      if (!isValid) {
        throw new Error('Incorrect password. Please try again.');
      }
    }

    // Update last_opened_at in Firestore
    const now = new Date().toISOString();
    await updateDoc(taskRef, {
      last_opened_at: now,
      updated_at: now,
    });

    const records = await this.getTaskRecords(installationId, taskId);

    const grandTotal = records.reduce((sum, r) => sum + (r.total || 0), 0);
    const totalPaid = records.reduce((sum, r) => sum + (r.paid_amount || 0), 0);
    const totalRemaining = records.reduce((sum, r) => sum + (r.remaining_amount || 0), 0);
    const paidCount = records.filter((r) => r.payment_status === 'PAID').length;
    const partialCount = records.filter((r) => r.payment_status === 'PARTIAL').length;
    const unpaidCount = records.filter((r) => r.payment_status === 'UNPAID').length;

    const taskSummary: TaskSummary = {
      id: taskId,
      task_name: t.task_name,
      record_count: records.length,
      grand_total: grandTotal,
      total_paid: totalPaid,
      total_remaining: totalRemaining,
      paid_count: paidCount,
      partial_count: partialCount,
      unpaid_count: unpaidCount,
      created_at: t.created_at,
      updated_at: now,
      last_opened_at: now,
      is_protected: t.is_password_protected ?? true,
      password_hash: t.password_hash,
      password_salt: t.password_salt,
      password_version: t.password_version,
      anonymous_installation_id: installationId,
    };

    return { task: taskSummary, records };
  },

  /**
   * Fetches all records for a specific task from Firestore.
   */
  async getTaskRecords(installationId: string, taskId: string): Promise<TaskRecord[]> {
    const recordsRef = collection(db, 'users', installationId, 'tasks', taskId, 'records');
    const snap = await getDocs(recordsRef);

    const records: TaskRecord[] = snap.docs.map((d, index) => {
      const data = d.data();
      const qty = Number(data.quantity) || 0;
      const price = Number(data.price) || 0;
      const total = typeof data.total === 'number' ? data.total : qty * price;
      const paidAmount = Number(data.paid_amount) || 0;
      const remainingAmount =
        typeof data.remaining_amount === 'number'
          ? data.remaining_amount
          : calculateRemainingAmount(total, paidAmount);
      const paymentStatus =
        data.payment_status || calculatePaymentStatus(total, paidAmount);

      return {
        id: data.id || d.id,
        task_id: taskId,
        customer_name: data.customer_name || '',
        item: data.item || '',
        quantity: qty,
        price: price,
        total: total,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        payment_status: paymentStatus,
        date: data.date || '',
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        order_index: data.order_index ?? index,
        anonymous_installation_id: installationId,
      };
    });

    return records.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  },

  /**
   * Auto-saves and syncs spreadsheet records to Firestore.
   */
  async saveTaskRecords(
    installationId: string,
    taskId: string,
    records: TaskRecord[]
  ): Promise<{ task: TaskSummary; records: TaskRecord[] }> {
    const taskRef = doc(db, 'users', installationId, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);

    if (!taskSnap.exists()) {
      throw new Error('Task not found in Firestore.');
    }

    const t = taskSnap.data();
    const now = new Date().toISOString();

    // 1. Fetch current existing records in Firestore to remove deleted rows
    const recordsColRef = collection(db, 'users', installationId, 'tasks', taskId, 'records');
    const existingSnap = await getDocs(recordsColRef);
    const existingIds = new Set(existingSnap.docs.map((d) => d.id));

    const currentIds = new Set(records.map((r) => r.id));

    const batch = writeBatch(db);

    // Delete removed records
    for (const docId of existingIds) {
      if (!currentIds.has(docId)) {
        batch.delete(doc(db, 'users', installationId, 'tasks', taskId, 'records', docId));
      }
    }

    // Upsert current records
    let grandTotal = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    const cleanRecords: TaskRecord[] = [];

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const recordId = r.id || 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const qty = Number(r.quantity) || 0;
      const price = Number(r.price) || 0;
      const total = qty * price;
      const paid = Number(r.paid_amount) || 0;
      const remaining = calculateRemainingAmount(total, paid);
      const status = calculatePaymentStatus(total, paid);

      grandTotal += total;
      totalPaid += paid;
      totalRemaining += remaining;

      if (status === 'PAID') paidCount++;
      else if (status === 'PARTIAL') partialCount++;
      else unpaidCount++;

      const recordDocData: TaskRecord = {
        id: recordId,
        task_id: taskId,
        customer_name: r.customer_name || '',
        item: r.item || '',
        quantity: qty,
        price: price,
        total: total,
        paid_amount: paid,
        remaining_amount: remaining,
        payment_status: status,
        date: r.date || '',
        created_at: r.created_at || now,
        updated_at: now,
        order_index: i,
        anonymous_installation_id: installationId,
      };

      const recordDocRef = doc(db, 'users', installationId, 'tasks', taskId, 'records', recordId);
      batch.set(recordDocRef, recordDocData);

      cleanRecords.push(recordDocData);
    }

    // Update parent task metadata in Firestore
    batch.update(taskRef, {
      total_records: cleanRecords.length,
      total_amount: grandTotal,
      total_paid: totalPaid,
      total_remaining: totalRemaining,
      paid_count: paidCount,
      partial_count: partialCount,
      unpaid_count: unpaidCount,
      updated_at: now,
    });

    await batch.commit();

    const taskSummary: TaskSummary = {
      id: taskId,
      task_name: t.task_name,
      record_count: cleanRecords.length,
      grand_total: grandTotal,
      total_paid: totalPaid,
      total_remaining: totalRemaining,
      paid_count: paidCount,
      partial_count: partialCount,
      unpaid_count: unpaidCount,
      created_at: t.created_at,
      updated_at: now,
      last_opened_at: t.last_opened_at || now,
      is_protected: t.is_password_protected ?? true,
      password_hash: t.password_hash,
      password_salt: t.password_salt,
      password_version: t.password_version,
      anonymous_installation_id: installationId,
    };

    return { task: taskSummary, records: cleanRecords };
  },

  /**
   * Renames a task in Firestore.
   */
  async renameTask(
    installationId: string,
    taskId: string,
    newName: string
  ): Promise<TaskSummary> {
    const taskRef = doc(db, 'users', installationId, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);

    if (!taskSnap.exists()) {
      throw new Error('Task not found in Firestore.');
    }

    const now = new Date().toISOString();
    await updateDoc(taskRef, {
      task_name: newName.trim(),
      updated_at: now,
    });

    const t = (await getDoc(taskRef)).data()!;
    return {
      id: taskId,
      task_name: newName.trim(),
      record_count: t.total_records ?? 0,
      grand_total: t.total_amount ?? 0,
      total_paid: t.total_paid ?? 0,
      total_remaining: t.total_remaining ?? 0,
      paid_count: t.paid_count ?? 0,
      partial_count: t.partial_count ?? 0,
      unpaid_count: t.unpaid_count ?? 0,
      created_at: t.created_at,
      updated_at: now,
      last_opened_at: t.last_opened_at || now,
      is_protected: t.is_password_protected ?? true,
      password_hash: t.password_hash,
      password_salt: t.password_salt,
      password_version: t.password_version,
      anonymous_installation_id: installationId,
    };
  },

  /**
   * Changes the password of an individual task in Firestore.
   */
  async changeTaskPassword(
    installationId: string,
    taskId: string,
    currentPass: string,
    newPass: string
  ): Promise<{ success: boolean }> {
    const taskRef = doc(db, 'users', installationId, 'tasks', taskId);
    const snap = await getDoc(taskRef);

    if (!snap.exists()) {
      throw new Error('Task not found in Firestore.');
    }

    const t = snap.data();
    if (t.is_password_protected) {
      const isValid = await verifyPasswordClient(currentPass, t.password_salt, t.password_hash);
      if (!isValid) {
        throw new Error('Current task password is incorrect.');
      }
    }

    if (!newPass || newPass.length < 3) {
      throw new Error('New password must be at least 3 characters.');
    }

    const { salt, hash, version } = await hashPasswordClient(newPass);
    const now = new Date().toISOString();

    await updateDoc(taskRef, {
      is_password_protected: true,
      password_hash: hash,
      password_salt: salt,
      password_version: version,
      updated_at: now,
    });

    return { success: true };
  },

  /**
   * Duplicates a task and all its records in Firestore with a new password.
   */
  async duplicateTask(
    installationId: string,
    sourceTaskId: string,
    newName: string,
    newPassword?: string
  ): Promise<{ task: TaskSummary }> {
    const sourceRecords = await this.getTaskRecords(installationId, sourceTaskId);
    const { task } = await this.createTask(installationId, newName, newPassword);

    if (sourceRecords.length > 0) {
      const clonedRecords = sourceRecords.map((r, i) => ({
        ...r,
        id: 'rec_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substring(2, 5),
        task_id: task.id,
      }));
      const saved = await this.saveTaskRecords(installationId, task.id, clonedRecords);
      return { task: saved.task };
    }

    return { task };
  },

  /**
   * Deletes a task and all its subcollection records from Firestore.
   */
  async deleteTask(installationId: string, taskId: string): Promise<{ success: boolean }> {
    const recordsRef = collection(db, 'users', installationId, 'tasks', taskId, 'records');
    const recordsSnap = await getDocs(recordsRef);

    const batch = writeBatch(db);
    for (const d of recordsSnap.docs) {
      batch.delete(d.ref);
    }
    batch.delete(doc(db, 'users', installationId, 'tasks', taskId));
    await batch.commit();

    return { success: true };
  },

  /**
   * ============================================================================
   * DEDICATED NOTEPAD STORAGE (Personal & Business Notes in Firestore)
   * ============================================================================
   */

  /**
   * Fetches all notes for the current anonymous installation from Firestore.
   */
  async getNotes(installationId: string): Promise<Note[]> {
    const notesRef = collection(db, 'users', installationId, 'notes');
    const snap = await getDocs(notesRef);

    const notes: Note[] = [];
    for (const d of snap.docs) {
      const data = d.data();
      notes.push({
        id: data.id || d.id,
        title: data.title || '',
        content: data.content || '',
        is_pinned: Boolean(data.is_pinned),
        is_archived: Boolean(data.is_archived),
        is_deleted: Boolean(data.is_deleted),
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        anonymous_installation_id: data.anonymous_installation_id || installationId,
      });
    }

    // Default sort: pinned first, then updated_at descending
    return notes.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  },

  /**
   * Creates or updates a note in Firestore.
   */
  async saveNote(
    installationId: string,
    noteData: Partial<Note> & { id?: string }
  ): Promise<Note> {
    const noteId =
      noteData.id ||
      'note_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const now = new Date().toISOString();

    const noteDocRef = doc(db, 'users', installationId, 'notes', noteId);
    const existingSnap = await getDoc(noteDocRef);

    let fullNote: Note;

    if (existingSnap.exists()) {
      const current = existingSnap.data();
      fullNote = {
        id: noteId,
        title: noteData.title !== undefined ? noteData.title : current.title || '',
        content: noteData.content !== undefined ? noteData.content : current.content || '',
        is_pinned:
          noteData.is_pinned !== undefined ? Boolean(noteData.is_pinned) : Boolean(current.is_pinned),
        is_archived:
          noteData.is_archived !== undefined
            ? Boolean(noteData.is_archived)
            : Boolean(current.is_archived),
        is_deleted:
          noteData.is_deleted !== undefined
            ? Boolean(noteData.is_deleted)
            : Boolean(current.is_deleted),
        created_at: current.created_at || now,
        updated_at: now,
        anonymous_installation_id: installationId,
      };
    } else {
      fullNote = {
        id: noteId,
        title: noteData.title || '',
        content: noteData.content || '',
        is_pinned: Boolean(noteData.is_pinned),
        is_archived: Boolean(noteData.is_archived),
        is_deleted: Boolean(noteData.is_deleted),
        created_at: noteData.created_at || now,
        updated_at: now,
        anonymous_installation_id: installationId,
      };
    }

    await setDoc(noteDocRef, fullNote);
    return fullNote;
  },

  /**
   * Moves a note to Trash (soft delete).
   */
  async deleteNote(installationId: string, noteId: string): Promise<{ success: boolean }> {
    const noteDocRef = doc(db, 'users', installationId, 'notes', noteId);
    const snap = await getDoc(noteDocRef);
    if (!snap.exists()) {
      throw new Error('Note not found');
    }
    await updateDoc(noteDocRef, {
      is_deleted: true,
      updated_at: new Date().toISOString(),
    });
    return { success: true };
  },

  /**
   * Restores a note from Trash.
   */
  async restoreNote(installationId: string, noteId: string): Promise<{ success: boolean }> {
    const noteDocRef = doc(db, 'users', installationId, 'notes', noteId);
    const snap = await getDoc(noteDocRef);
    if (!snap.exists()) {
      throw new Error('Note not found');
    }
    await updateDoc(noteDocRef, {
      is_deleted: false,
      updated_at: new Date().toISOString(),
    });
    return { success: true };
  },

  /**
   * Permanently deletes a note from Firestore.
   */
  async permanentDeleteNote(
    installationId: string,
    noteId: string
  ): Promise<{ success: boolean }> {
    const noteDocRef = doc(db, 'users', installationId, 'notes', noteId);
    await deleteDoc(noteDocRef);
    return { success: true };
  },

  /**
   * Empties all notes in the Trash.
   */
  async emptyTrash(installationId: string): Promise<{ success: boolean; deletedCount: number }> {
    const notes = await this.getNotes(installationId);
    const trashNotes = notes.filter((n) => n.is_deleted);
    if (trashNotes.length === 0) return { success: true, deletedCount: 0 };

    const batch = writeBatch(db);
    for (const n of trashNotes) {
      batch.delete(doc(db, 'users', installationId, 'notes', n.id));
    }
    await batch.commit();
    return { success: true, deletedCount: trashNotes.length };
  },

  /**
   * Exports all tasks, records, and notes from Firestore into a JSON backup object.
   */
  async exportBackup(installationId: string): Promise<any> {
    const userRef = doc(db, 'users', installationId);
    const userSnap = await getDoc(userRef);
    const tasks = await this.getTasks(installationId);
    const notes = await this.getNotes(installationId);

    const recordsMap: Record<string, TaskRecord[]> = {};
    for (const t of tasks) {
      recordsMap[t.id] = await this.getTaskRecords(installationId, t.id);
    }

    return {
      version: '3.0_firestore_notes_and_payment_tracking',
      export_date: new Date().toISOString(),
      installation_id: installationId,
      user_profile: userSnap.exists() ? userSnap.data() : null,
      tasks,
      records: recordsMap,
      notes,
    };
  },

  /**
   * Restores a JSON backup into Firestore including tasks, records, and notes.
   */
  async restoreBackup(
    installationId: string,
    backupData: any
  ): Promise<{ importedCount: number; importedNotesCount: number }> {
    if (!backupData || (!backupData.tasks && !backupData.notes)) {
      throw new Error('Invalid backup file format.');
    }

    const tasksList = Array.isArray(backupData.tasks)
      ? backupData.tasks
      : backupData.tasks
      ? Object.values(backupData.tasks)
      : [];

    let importedCount = 0;
    let importedNotesCount = 0;
    const now = new Date().toISOString();

    // 1. Restore Tasks & Records
    for (const t of tasksList as any[]) {
      const taskId =
        t.id || 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const taskDocRef = doc(db, 'users', installationId, 'tasks', taskId);

      const taskRecords: any[] =
        backupData.records?.[t.id] || backupData.records?.[taskId] || [];
      let grandTotal = 0;
      let totalPaid = 0;
      let totalRemaining = 0;
      let paidCount = 0;
      let partialCount = 0;
      let unpaidCount = 0;

      if (Array.isArray(taskRecords) && taskRecords.length > 0) {
        const batch = writeBatch(db);
        for (let i = 0; i < taskRecords.length; i++) {
          const r = taskRecords[i];
          const recId = r.id || 'rec_' + Date.now() + '_' + i;
          const qty = Number(r.quantity) || 0;
          const price = Number(r.price) || 0;
          const total = typeof r.total === 'number' ? r.total : qty * price;
          const paid = Number(r.paid_amount) || 0;
          const remaining = calculateRemainingAmount(total, paid);
          const status = calculatePaymentStatus(total, paid);

          grandTotal += total;
          totalPaid += paid;
          totalRemaining += remaining;

          if (status === 'PAID') paidCount++;
          else if (status === 'PARTIAL') partialCount++;
          else unpaidCount++;

          const recRef = doc(db, 'users', installationId, 'tasks', taskId, 'records', recId);
          batch.set(recRef, {
            id: recId,
            task_id: taskId,
            customer_name: r.customer_name || '',
            item: r.item || '',
            quantity: qty,
            price: price,
            total: total,
            paid_amount: paid,
            remaining_amount: remaining,
            payment_status: status,
            date: r.date || '',
            created_at: r.created_at || now,
            updated_at: now,
            order_index: i,
            anonymous_installation_id: installationId,
          });
        }
        await batch.commit();
      }

      const taskDocData = {
        id: taskId,
        task_name: t.task_name || 'Restored Task',
        is_password_protected: Boolean(t.is_protected ?? t.is_password_protected),
        password_hash: t.password_hash || '',
        password_salt: t.password_salt || '',
        password_version: t.password_version || 'pbkdf2_sha512_v1',
        total_records: taskRecords.length,
        total_amount: grandTotal,
        total_paid: totalPaid,
        total_remaining: totalRemaining,
        paid_count: paidCount,
        partial_count: partialCount,
        unpaid_count: unpaidCount,
        created_at: t.created_at || now,
        updated_at: now,
        last_opened_at: now,
        anonymous_installation_id: installationId,
      };

      await setDoc(taskDocRef, taskDocData);
      importedCount++;
    }

    // 2. Restore Notes
    const notesList: Note[] = Array.isArray(backupData.notes) ? backupData.notes : [];
    if (notesList.length > 0) {
      const notesBatch = writeBatch(db);
      for (const n of notesList) {
        const noteId =
          n.id ||
          'note_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        const noteRef = doc(db, 'users', installationId, 'notes', noteId);
        notesBatch.set(noteRef, {
          id: noteId,
          title: n.title || '',
          content: n.content || '',
          is_pinned: Boolean(n.is_pinned),
          is_archived: Boolean(n.is_archived),
          is_deleted: Boolean(n.is_deleted),
          created_at: n.created_at || now,
          updated_at: n.updated_at || now,
          anonymous_installation_id: installationId,
        });
        importedNotesCount++;
      }
      await notesBatch.commit();
    }

    return { importedCount, importedNotesCount };
  },
};

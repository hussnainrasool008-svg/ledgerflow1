import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';

interface AuthenticatedRequest extends Request {
  userId?: string;
  deviceId?: string;
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Anonymous Device Identification Middleware
function deviceAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const deviceId = (req.headers['x-device-id'] as string) || (req.query.deviceId as string);
  if (!deviceId) {
    // If no device ID was sent, we create/assign one
    const user = db.getOrCreateUser('');
    req.userId = user.id;
    req.deviceId = user.anonymous_device_id;
    res.setHeader('x-device-id', user.anonymous_device_id);
    return next();
  }

  const user = db.getOrCreateUser(deviceId);
  req.userId = user.id;
  req.deviceId = user.anonymous_device_id;
  next();
}

app.use('/api', deviceAuthMiddleware);

// App Lock Verification Guard Middleware for private routes
function appLockGuardMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const appToken = req.headers['x-app-token'] as string;
  const isAuthorized = db.isAuthorizedAppSession(req.userId!, appToken);
  if (!isAuthorized) {
    return res.status(423).json({
      error: 'App is locked. App password verification required.',
      isAppLocked: true,
    });
  }
  next();
}

// --- API Endpoints ---

// Health check
app.get('/api/health', (req: AuthenticatedRequest, res: Response) => {
  res.json({ status: 'ok', app: 'Ledger Flow', timestamp: new Date().toISOString() });
});

// Initialize / Sync user device & App Lock status
app.get('/api/user/init', (req: AuthenticatedRequest, res: Response) => {
  const lockStatus = db.getAppLockStatus(req.userId!);
  const appToken = req.headers['x-app-token'] as string;
  const isUnlocked = db.isAuthorizedAppSession(req.userId!, appToken);

  res.json({
    userId: req.userId,
    deviceId: req.deviceId,
    appLock: {
      ...lockStatus,
      isUnlocked,
    },
  });
});

// --- App Lock Endpoints ---

// Get App Lock Status
app.get('/api/app-lock/status', (req: AuthenticatedRequest, res: Response) => {
  const lockStatus = db.getAppLockStatus(req.userId!);
  const appToken = req.headers['x-app-token'] as string;
  const isUnlocked = db.isAuthorizedAppSession(req.userId!, appToken);

  res.json({
    ...lockStatus,
    isUnlocked,
  });
});

// Setup App Password (first-time)
app.post('/api/app-lock/setup', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { password, timeout } = req.body;
    if (!password || password.length < 3) {
      return res.status(400).json({ error: 'App password must be at least 3 characters long.' });
    }
    const result = db.setupAppPassword(req.userId!, password, timeout);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to setup app password.' });
  }
});

// Unlock App Lock
app.post('/api/app-lock/unlock', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'App password is required.' });
    }
    const result = db.verifyAppPassword(req.userId!, password);
    if (!result.success) {
      return res.status(401).json({
        error: result.message || 'Incorrect app password.',
        lockedRemainingSec: result.lockedRemainingSec,
      });
    }
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to verify app password.' });
  }
});

// Lock App
app.post('/api/app-lock/lock', (req: AuthenticatedRequest, res: Response) => {
  const appToken = req.headers['x-app-token'] as string;
  db.lockAppSession(appToken);
  res.json({ success: true, message: 'App locked.' });
});

// Change App Password (Settings -> Security)
app.post('/api/app-lock/change-password', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }
    const result = db.changeAppPassword(req.userId!, currentPassword, newPassword);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to change app password.' });
  }
});

// Update App Lock Settings (timeout / enabled)
app.post('/api/app-lock/settings', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { timeout, enabled } = req.body;
    const result = db.updateAppLockSettings(req.userId!, timeout, enabled);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update app lock settings.' });
  }
});

// Reset All User Data (Forgot App Password fallback)
app.post('/api/app-lock/reset-data', (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.resetUserData(req.userId!);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to reset device data.' });
  }
});

// --- Guarded Task Routes (Strictly protected by App Lock) ---
app.use('/api/tasks', appLockGuardMiddleware);
app.use('/api/backup', appLockGuardMiddleware);

// List all tasks for device user
app.get('/api/tasks', (req: AuthenticatedRequest, res: Response) => {
  try {
    const tasks = db.getTasksForUser(req.userId!);
    res.json({ tasks });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch tasks.' });
  }
});

// Create new task
app.post('/api/tasks', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskName, password } = req.body;
    if (!taskName || !taskName.trim()) {
      return res.status(400).json({ error: 'Task Name is required.' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required for protected tasks.' });
    }

    const result = db.createTask(req.userId!, taskName.trim(), password);
    res.status(201).json({
      task: result.task,
      token: result.token,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create task.' });
  }
});

// Unlock protected task with password
app.post('/api/tasks/:id/unlock', (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    const verifyResult = db.verifyTaskPassword(taskId, req.userId!, password);
    if (!verifyResult.success) {
      return res.status(401).json({
        error: verifyResult.message || 'Incorrect password.',
        lockedRemainingSec: verifyResult.lockedRemainingSec,
      });
    }

    // Also fetch the initial records upon unlock
    const data = db.getTaskRecords(taskId, req.userId!, verifyResult.token);

    res.json({
      success: true,
      token: verifyResult.token,
      task: data.task,
      records: data.records,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to verify password.' });
  }
});

// Lock task session
app.post('/api/tasks/:id/lock', (req: AuthenticatedRequest, res: Response) => {
  const token = req.headers['x-task-token'] as string;
  db.lockTaskSession(token);
  res.json({ success: true, message: 'Task locked.' });
});

// Get task records (requires unlock token)
app.get('/api/tasks/:id/records', (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const token = req.headers['x-task-token'] as string;
    const data = db.getTaskRecords(taskId, req.userId!, token);
    res.json(data);
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Unauthorized.' });
  }
});

// Update / Auto-save task records (requires unlock token)
app.put('/api/tasks/:id/records', (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const token = req.headers['x-task-token'] as string;
    const { records } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Records must be an array.' });
    }

    const updatedData = db.updateTaskRecords(taskId, req.userId!, token, records);
    res.json(updatedData);
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to update records.' });
  }
});

// Rename task
app.patch('/api/tasks/:id/rename', (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const token = req.headers['x-task-token'] as string;
    const { newName } = req.body;

    if (!newName || !newName.trim()) {
      return res.status(400).json({ error: 'New task name is required.' });
    }

    const updatedTask = db.renameTask(taskId, req.userId!, token, newName.trim());
    res.json({ task: updatedTask });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to rename task.' });
  }
});

// Change task password
app.post('/api/tasks/:id/change-password', (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }

    const result = db.changePassword(taskId, req.userId!, currentPassword, newPassword);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ success: true, message: result.message });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to change password.' });
  }
});

// Duplicate task
app.post('/api/tasks/:id/duplicate', (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const token = req.headers['x-task-token'] as string;
    const { newName, newPassword } = req.body;

    if (!newName || !newName.trim() || !newPassword) {
      return res.status(400).json({ error: 'New task name and new password are required.' });
    }

    const result = db.duplicateTask(taskId, req.userId!, token, newName.trim(), newPassword);
    res.json(result);
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to duplicate task.' });
  }
});

// Delete task
app.delete('/api/tasks/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const token = req.headers['x-task-token'] as string;

    db.deleteTask(taskId, req.userId!, token);
    res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to delete task.' });
  }
});

// Full Backup Export
app.get('/api/backup/export', (req: AuthenticatedRequest, res: Response) => {
  try {
    const backup = db.exportAllUserData(req.userId!);
    res.setHeader('Content-Disposition', `attachment; filename="ledgerflow_backup_${Date.now()}.json"`);
    res.json(backup);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to export backup data.' });
  }
});

// Backup Restore
app.post('/api/backup/restore', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { backupData } = req.body;
    const result = db.importUserData(req.userId!, backupData);
    res.json({ success: true, importedCount: result.importedCount });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to restore backup.' });
  }
});

// --- Vite Middleware / Static serving ---
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ledger Flow server running on http://0.0.0.0:${PORT}`);
  });
}

start();

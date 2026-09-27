import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { config, getServicesStatus } from './config.js';
import { initDatabase } from './db.js';

import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';
import noteRoutes from './routes/notes.js';
import credentialRoutes from './routes/credentials.js';
import searchRoutes from './routes/search.js';
import statusRoutes from './routes/status.js';
import taskRoutes from './routes/tasks.js';
import pushRoutes from './routes/push.js';
import { startReminderScheduler } from './services/scheduler.js';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Ensure database is initialized
let dbInitialized = false;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
    } catch (err) {
      console.error('Database initialization error:', err.message);
    }
  }
  next();
});

// Security and utility middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve static frontend UI from public/
app.use(express.static(path.join(__dirname, '..', 'public')));

// Mount routes for both /api/path and /path for robust serverless support
const mountApiRoute = (subPath, routerHandler) => {
  app.use(`/api${subPath}`, routerHandler);
  app.use(subPath, routerHandler);
};

mountApiRoute('/auth', authRoutes);
mountApiRoute('/files', fileRoutes);
mountApiRoute('/notes', noteRoutes);
mountApiRoute('/credentials', credentialRoutes);
mountApiRoute('/tasks', taskRoutes);
mountApiRoute('/push', pushRoutes);
mountApiRoute('/search', searchRoutes);
mountApiRoute('/status', statusRoutes);

// SPA Fallback for client routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth') || req.path.startsWith('/files') || req.path.startsWith('/notes') || req.path.startsWith('/credentials') || req.path.startsWith('/tasks') || req.path.startsWith('/push') || req.path.startsWith('/search') || req.path.startsWith('/status')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(200).send('Personal AI Vault');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Start local server if not running inside serverless environment
if (process.env.VERCEL !== '1') {
  initDatabase().then(() => {
    dbInitialized = true;
    startReminderScheduler();
    const localIp = getLocalIp();
    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`\n======================================================`);
      console.log(`🔒 Personal AI Vault running on http://localhost:${config.port}`);
      console.log(`📱 Access from phone on your Wi-Fi: http://${localIp}:${config.port}`);
      console.log(`======================================================`);
      
      const status = getServicesStatus();
      console.log(`☁️ Cloud Storage: ${status.storage.connected ? '🟢 Connected (' + status.storage.provider + ')' : '🟡 Local Staging Mode (Cloud credentials needed in .env)'}`);
      console.log(`💾 Database: 🟢 Active (${status.database.type})`);
      console.log(`🧠 AI Retrieval: ${status.ai.connected ? '🟢 Connected (' + status.ai.provider + ')' : '🟡 AI Key needed in .env (Add GEMINI_API_KEY for free AI)'}`);
      console.log(`⏰ Push Reminders: 🟢 Active (Scheduled every 60s)`);
      console.log(`======================================================\n`);
    });

    const shutdown = () => {
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }).catch(err => {
    console.error('Failed to start server:', err);
  });
}

export default app;


import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, getServicesStatus } from './config.js';
import { initDatabase } from './db.js';

import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';
import noteRoutes from './routes/notes.js';
import credentialRoutes from './routes/credentials.js';
import searchRoutes from './routes/search.js';
import statusRoutes from './routes/status.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Initialize SQLite database
  await initDatabase();

  const app = express();

  // Security and utility middleware
  app.use(cors({
    origin: true,
    credentials: true
  }));

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Serve static frontend UI from public/
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/files', fileRoutes);
  app.use('/api/notes', noteRoutes);
  app.use('/api/credentials', credentialRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/status', statusRoutes);

  // SPA Fallback for client routes
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  // Start Server
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🔒 Personal AI Vault running on http://localhost:${config.port}`);
    console.log(`📱 Access from phone on your local network: http://<your-laptop-ip>:${config.port}`);
    console.log(`======================================================`);
    
    const status = getServicesStatus();
    console.log(`☁️ Cloud Storage: ${status.storage.connected ? '🟢 Connected (' + status.storage.provider + ')' : '🟡 Local Staging Mode (Cloud credentials needed in .env)'}`);
    console.log(`💾 Database: 🟢 Active (${status.database.type})`);
    console.log(`🧠 AI Retrieval: ${status.ai.connected ? '🟢 Connected (' + status.ai.provider + ')' : '🟡 AI Key needed in .env (Add GEMINI_API_KEY for free AI)'}`);
    console.log(`======================================================\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

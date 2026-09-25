import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { fileModel } from '../db.js';
import { storageService } from '../services/storage.js';

const router = express.Router();

// POST /api/credentials - Store a password, email login, or database URI
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, username = '', password = '', url = '', notes = '', tags = [] } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Heading / Service title is required (e.g. Personal Email, MongoDB URI).' });
    }

    if (!password && !username) {
      return res.status(400).json({ error: 'Please provide a password, secret, or username.' });
    }

    const credId = crypto.randomUUID();
    const sanitizedTitle = title.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Credential_${sanitizedTitle}.md`;
    const storageKey = `vault_user_${req.user.id}/credentials/${Date.now()}_${credId.slice(0, 8)}_${filename}`;

    const formattedContent = [
      `# Credential: ${title.trim()}`,
      `**Service / Heading:** ${title.trim()}`,
      username ? `**Email / Username:** ${username.trim()}` : '',
      password ? `**Password / Secret / URI:** ${password.trim()}` : '',
      url ? `**URL / Endpoint:** ${url.trim()}` : '',
      notes ? `**Notes:**\n${notes.trim()}` : '',
      ``,
      `---`,
      `Stored securely in Personal AI Vault`
    ].filter(Boolean).join('\n');

    const buffer = Buffer.from(formattedContent, 'utf-8');

    // Store in Cloud Storage (Google Drive)
    const uploadResult = await storageService.uploadFile({
      key: storageKey,
      buffer,
      mimeType: 'text/markdown'
    });

    const summaryParts = [
      `Service: ${title.trim()}`,
      username ? `User/Email: ${username.trim()}` : '',
      url ? `URL: ${url.trim()}` : '',
      notes ? `Notes: ${notes.trim().slice(0, 80)}` : ''
    ].filter(Boolean);

    const summary = summaryParts.join(' | ');
    const credTags = Array.isArray(tags) ? ['credential', 'password', ...tags.filter(t => t !== 'credential' && t !== 'password')] : ['credential', 'password'];

    // Save to Database and Full-Text Search
    const savedCred = await fileModel.create({
      id: credId,
      userId: req.user.id,
      originalName: `🔑 ${title.trim()}`,
      storageKey: uploadResult.key || storageKey,
      storageProvider: uploadResult.provider,
      mimeType: 'application/x-credential',
      sizeBytes: buffer.length,
      extractedText: formattedContent,
      summary,
      tags: credTags,
      isNote: 0
    });

    res.status(201).json({
      message: 'Password / credential stored successfully in your cloud vault.',
      credential: savedCred
    });
  } catch (err) {
    console.error('Store credential error:', err);
    res.status(500).json({ error: 'Failed to store credential: ' + err.message });
  }
});

export default router;

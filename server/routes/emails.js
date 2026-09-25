import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { fileModel } from '../db.js';
import { storageService } from '../services/storage.js';

const router = express.Router();

// POST /api/emails - Store an email message in cloud storage and index for AI
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { sender, recipient, subject, date, body, tags = [] } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Email subject is required.' });
    }
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Email body or message text is required.' });
    }

    const emailId = crypto.randomUUID();
    const cleanDate = date || new Date().toISOString().split('T')[0];
    const sanitizedSubject = subject.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Email_${sanitizedSubject}.md`;
    const storageKey = `vault_user_${req.user.id}/emails/${Date.now()}_${emailId.slice(0, 8)}_${filename}`;

    const formattedContent = [
      `# Email: ${subject.trim()}`,
      `**From:** ${sender || 'Unknown Sender'}`,
      `**To:** ${recipient || 'Me'}`,
      `**Date:** ${cleanDate}`,
      `**Subject:** ${subject.trim()}`,
      ``,
      `---`,
      ``,
      body.trim()
    ].join('\n');

    const buffer = Buffer.from(formattedContent, 'utf-8');

    // Store in Cloud Storage (Google Drive / S3)
    const uploadResult = await storageService.uploadFile({
      key: storageKey,
      buffer,
      mimeType: 'text/markdown'
    });

    const summary = `From: ${sender || 'Unknown'} | To: ${recipient || 'Me'} | Date: ${cleanDate} | Subject: ${subject.trim()} — ${body.trim().slice(0, 150)}`;

    const emailTags = Array.isArray(tags) ? ['email', ...tags.filter(t => t !== 'email')] : ['email'];

    // Save to Database and Full-Text Search
    const savedEmail = fileModel.create({
      id: emailId,
      userId: req.user.id,
      originalName: `✉️ ${subject.trim()}`,
      storageKey: uploadResult.key || storageKey,
      storageProvider: uploadResult.provider,
      mimeType: 'message/rfc822',
      sizeBytes: buffer.length,
      extractedText: formattedContent,
      summary,
      tags: emailTags,
      isNote: 0
    });

    res.status(201).json({
      message: 'Email stored and indexed successfully in your cloud vault.',
      email: savedEmail
    });
  } catch (err) {
    console.error('Store email error:', err);
    res.status(500).json({ error: 'Failed to store email: ' + err.message });
  }
});

export default router;

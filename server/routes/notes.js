import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { fileModel } from '../db.js';
import { storageService } from '../services/storage.js';

const router = express.Router();

// POST /api/notes - Create a new personal note
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, content, tags = [] } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Note title is required.' });
    }

    const noteId = crypto.randomUUID();
    const filename = `${title.trim().replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    const storageKey = `vault_user_${req.user.id}/notes/${Date.now()}_${noteId.slice(0, 8)}_${filename}`;
    const buffer = Buffer.from(content || '', 'utf-8');

    // Store in Cloud Storage
    const uploadResult = await storageService.uploadFile({
      key: storageKey,
      buffer,
      mimeType: 'text/markdown'
    });

    const summary = (content || '').slice(0, 200) + ((content || '').length > 200 ? '...' : '');

    // Save to Database and Full-Text Search
    const savedNote = await fileModel.create({
      id: noteId,
      userId: req.user.id,
      originalName: title.trim().endsWith('.md') ? title.trim() : `${title.trim()}.md`,
      storageKey: uploadResult.key || storageKey,
      storageProvider: uploadResult.provider,
      mimeType: 'text/markdown',
      sizeBytes: buffer.length,
      extractedText: content || '',
      summary,
      tags: Array.isArray(tags) ? tags : ['note'],
      isNote: 1
    });

    res.status(201).json({
      message: 'Note created and indexed successfully.',
      note: savedNote
    });
  } catch (err) {
    console.error('Create note error:', err);
    res.status(500).json({ error: 'Failed to create note: ' + err.message });
  }
});

// PUT /api/notes/:id - Update an existing note
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const file = await fileModel.findById(req.params.id, req.user.id);

    if (!file) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    const buffer = Buffer.from(content || '', 'utf-8');
    await storageService.uploadFile({
      key: file.storage_key,
      buffer,
      mimeType: 'text/markdown'
    });

    const summary = (content || '').slice(0, 200);
    const updated = await fileModel.updateContent(file.id, req.user.id, {
      extractedText: content,
      summary,
      tags
    });

    res.json({ message: 'Note updated successfully.', note: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update note: ' + err.message });
  }
});

export default router;

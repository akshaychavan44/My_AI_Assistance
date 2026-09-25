import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { authenticateToken } from '../middleware/auth.js';
import { fileModel } from '../db.js';
import { storageService } from '../services/storage.js';
import { extractorService } from '../services/extractor.js';

const router = express.Router();

// Use memory storage for uploads to avoid permanent local disk writes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file limit
  }
});

// GET /api/files - List files for logged in user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const type = req.query.type; // 'all', 'pdf', 'image', 'doc', 'note'
    const limit = parseInt(req.query.limit || '100', 10);
    const offset = parseInt(req.query.offset || '0', 10);

    const files = await fileModel.listByUser(req.user.id, { type, limit, offset });
    const stats = await fileModel.getStats(req.user.id);

    res.json({
      files,
      stats,
      cloudConnected: storageService.isCloudConnected()
    });
  } catch (err) {
    console.error('List files error:', err);
    res.status(500).json({ error: 'Failed to retrieve files: ' + err.message });
  }
});

// POST /api/files/upload - Upload file(s) to cloud storage and index into database
router.post('/upload', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided for upload.' });
    }

    const results = [];

    for (const file of req.files) {
      const fileId = crypto.randomUUID();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageKey = `vault_user_${req.user.id}/${Date.now()}_${fileId.slice(0, 8)}_${sanitizedName}`;

      // 1. Upload to Cloud Object Storage
      const uploadResult = await storageService.uploadFile({
        key: storageKey,
        buffer: file.buffer,
        mimeType: file.mimetype || 'application/octet-stream'
      });

      // 2. Extract text and OCR from document/image
      const extracted = await extractorService.extractText({
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname
      });

      // 3. Save searchable metadata to database & FTS index
      const savedFile = await fileModel.create({
        id: fileId,
        userId: req.user.id,
        originalName: file.originalname,
        storageKey: uploadResult.key || storageKey,
        storageProvider: uploadResult.provider,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        extractedText: extracted.extractedText,
        summary: extracted.summary,
        tags: extracted.tags,
        isNote: 0
      });

      results.push({
        ...savedFile,
        cloudStored: uploadResult.cloudStored,
        warning: uploadResult.warning
      });
    }

    res.status(201).json({
      message: `Successfully uploaded and indexed ${results.length} file(s).`,
      files: results,
      cloudConnected: storageService.isCloudConnected()
    });
  } catch (err) {
    console.error('Upload processing error:', err);
    res.status(500).json({ error: 'Upload processing failed: ' + err.message });
  }
});

// GET /api/files/:id - Get details of a single file
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const file = await fileModel.findById(req.params.id, req.user.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found in your vault.' });
    }

    res.json({
      file,
      cloudConnected: storageService.isCloudConnected()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve file: ' + err.message });
  }
});

// GET /api/files/:id/content - Secure authenticated streaming (Protects files from strangers)
router.get('/:id/content', authenticateToken, async (req, res) => {
  try {
    const file = await fileModel.findById(req.params.id, req.user.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found or unauthorized.' });
    }

    // Set secure private caching headers
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    
    // Set disposition: inline for previewing, or attachment if requested
    const isDownload = req.query.download === '1';
    const disposition = isDownload ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.original_name)}"`);

    // Stream from Cloud Storage / staging
    const { stream, contentLength } = await storageService.getFileStream(file.storage_key);

    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    stream.pipe(res);
  } catch (err) {
    console.error('File stream error:', err);
    res.status(500).json({ error: 'Could not stream file: ' + err.message });
  }
});

// GET /api/files/:id/signed-url - Temporary signed download URL
router.get('/:id/signed-url', authenticateToken, async (req, res) => {
  try {
    const file = await fileModel.findById(req.params.id, req.user.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const signedUrl = await storageService.getSignedUrl(file.storage_key, 900); // 15 min TTL
    if (!signedUrl) {
      return res.status(400).json({ 
        error: 'Pre-signed URLs require active Cloud Storage connection. Use direct authenticated stream endpoint instead.' 
      });
    }

    res.json({ url: signedUrl, expires_in_seconds: 900 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate signed URL: ' + err.message });
  }
});

// DELETE /api/files/:id - Delete file permanently from storage and database
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const file = await fileModel.findById(req.params.id, req.user.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    // 1. Delete from Cloud Storage
    await storageService.deleteFile(file.storage_key);

    // 2. Delete from Database and FTS index
    await fileModel.delete(file.id, req.user.id);

    res.json({ message: `"${file.original_name}" deleted successfully.` });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete file: ' + err.message });
  }
});

export default router;

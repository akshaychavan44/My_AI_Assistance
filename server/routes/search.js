import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { fileModel } from '../db.js';
import { aiService } from '../services/ai.js';

const router = express.Router();

// GET /api/search - Keyword and Full-Text Search across filenames and document text
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = req.query.q || '';
    const results = await fileModel.search(req.user.id, query);

    res.json({
      query,
      count: results.length,
      results
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed: ' + err.message });
  }
});

// POST /api/search/ai - Grounded AI Search over the user's private documents
router.post('/ai', authenticateToken, async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Please enter a question to ask your AI Vault.' });
    }

    const aiResult = await aiService.askVault(req.user.id, question.trim());

    res.json(aiResult);
  } catch (err) {
    console.error('AI Search route error:', err);
    res.status(500).json({
      connected: false,
      error: 'AI search query failed: ' + err.message,
      sources: []
    });
  }
});

export default router;

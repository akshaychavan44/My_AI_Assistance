import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userModel } from '../db.js';
import { config } from '../config.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    const existingEmail = await userModel.findByEmail(cleanEmail);
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const existingUsername = await userModel.findByUsername(cleanUsername);
    if (existingUsername) {
      return res.status(409).json({ error: 'This username is already taken.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await userModel.create(cleanUsername, cleanEmail, passwordHash);

    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/username and password are required.' });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    let user = await userModel.findByEmail(cleanIdentifier);
    if (!user) {
      user = await userModel.findByUsername(identifier.trim());
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials. Password incorrect.' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Logged in successfully.',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// Get current user profile
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: req.user
  });
});

// GET /api/auth/voiceprint - Get enrolled voiceprint
router.get('/voiceprint', authenticateToken, async (req, res) => {
  try {
    const voiceprint = await userModel.getVoiceprint(req.user.id);
    res.json({ voiceprint: voiceprint || null, enrolled: Boolean(voiceprint) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve voiceprint: ' + err.message });
  }
});

// POST /api/auth/voiceprint - Save or update enrolled voiceprint
router.post('/voiceprint', authenticateToken, async (req, res) => {
  try {
    const { voiceprint } = req.body;
    if (!voiceprint || !Array.isArray(voiceprint.features)) {
      return res.status(400).json({ error: 'Invalid voiceprint signature data.' });
    }

    await userModel.saveVoiceprint(req.user.id, voiceprint);
    res.json({ message: 'Voiceprint calibrated and secured to your account.', enrolled: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save voiceprint: ' + err.message });
  }
});

export default router;

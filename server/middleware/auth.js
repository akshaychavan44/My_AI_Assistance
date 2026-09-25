import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { userModel } from '../db.js';

export async function authenticateToken(req, res, next) {
  let token = null;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    // Useful for streaming images/PDFs directly into <img> or <iframe> tags
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await userModel.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User account not found or deactivated.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired session token. Please log in again.' });
  }
}

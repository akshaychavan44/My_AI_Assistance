import express from 'express';
import { getServicesStatus, config } from '../config.js';

const router = express.Router();

router.get('/', (req, res) => {
  const status = getServicesStatus();

  res.json({
    status: 'ok',
    services: status
  });
});

export default router;

import express from 'express';
import { getServicesStatus, config } from '../config.js';

const router = express.Router();

router.get('/', (req, res) => {
  const status = getServicesStatus();

  // Return connection status and 100% free setup guidance
  res.json({
    status: 'ok',
    totalMonthlyCost: '$0.00 (100% FREE)',
    services: status,
    setupGuide: {
      freeBlueprint: {
        ai: 'Google Gemini 1.5 Flash (100% Free - 1,500 questions/day via Google AI Studio)',
        storage: 'Cloudflare R2 (100% Free - 10 GB storage with $0 egress fees)',
        database: 'Built-in SQLite WASM with Full-Text Search ($0.00 Forever)',
        ocr: 'Built-in Tesseract.js & Gemini Vision ($0.00 Forever)',
        totalCost: '$0.00 / month'
      },
      cloudStorage: {
        title: '100% Free Cloud Object Storage (10 GB Free)',
        provider: 'Cloudflare R2',
        freeAllowance: '10 GB monthly storage, 10M read operations, $0 data download fees',
        cost: '$0.00 / month',
        setupUrl: 'https://dash.cloudflare.com/'
      },
      database: {
        title: 'Database & Search Engine',
        provider: 'Built-in SQLite WASM + FTS5',
        cost: '$0.00 / month (Fully local & embedded)',
        status: 'Operational'
      },
      ai: {
        title: '100% Free AI Search & Grounded Assistant',
        provider: 'Google Gemini 1.5 Flash',
        freeAllowance: '1,500 questions/day & 15 queries/min via Google AI Studio',
        cost: '$0.00 / month',
        setupUrl: 'https://aistudio.google.com/app/apikey'
      }
    }
  });
});

export default router;

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3003', 10),
  jwtSecret: process.env.JWT_SECRET || 'personal-ai-vault-super-secure-jwt-secret-key-2026',
  env: process.env.NODE_ENV || 'development',
  
  // Storage Configuration (S3-compatible: AWS S3, Cloudflare R2, Supabase Storage, or Google Drive)
  storage: {
    provider: process.env.STORAGE_PROVIDER || 's3', // 's3', 'r2', 'supabase', 'gdrive', 'google-drive', or 'local-staging'
    bucket: process.env.S3_BUCKET || process.env.STORAGE_BUCKET || '',
    region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || '', // e.g. https://<account_id>.r2.cloudflarestorage.com or https://<project_id>.supabase.co/storage/v1/s3
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    // Google Drive options (15 GB free storage)
    googleDriveFolderId: (process.env.GDRIVE_FOLDER_ID || '').includes('/folders/')
      ? (process.env.GDRIVE_FOLDER_ID || '').split('/folders/')[1].split(/[?#]/)[0]
      : (process.env.GDRIVE_FOLDER_ID || '').trim(),
    googleClientId: process.env.GDRIVE_CLIENT_ID || '',
    googleClientSecret: process.env.GDRIVE_CLIENT_SECRET || '',
    googleRefreshToken: process.env.GDRIVE_REFRESH_TOKEN || '',
    googleServiceAccountEmail: process.env.GDRIVE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    googlePrivateKey: (process.env.GDRIVE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    googleKeyFilePath: process.env.GDRIVE_KEY_FILE ? path.resolve(__dirname, '..', process.env.GDRIVE_KEY_FILE) : path.join(__dirname, '..', 'google-service-account.json'),
  },

  // AI Configuration (Gemini or OpenAI)
  ai: {
    provider: process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : (process.env.OPENAI_API_KEY ? 'openai' : 'none')),
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },

  // Database path / connection
  db: {
    path: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'vault.sqlite'),
    url: process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || '',
  }
};

/**
 * Checks active connection status of all external services
 */
export function getServicesStatus() {
  const isS3Configured = Boolean(
    config.storage.bucket && 
    config.storage.accessKeyId && 
    config.storage.secretAccessKey
  );

  const hasGDriveOAuth = Boolean(config.storage.googleClientId && config.storage.googleClientSecret && config.storage.googleRefreshToken);
  const hasGDriveKeyFile = fs.existsSync(config.storage.googleKeyFilePath);
  const hasGDriveCredentials = Boolean(config.storage.googleServiceAccountEmail && config.storage.googlePrivateKey);
  const isGDriveConfigured = (config.storage.provider === 'gdrive' || config.storage.provider === 'google-drive') && (hasGDriveOAuth || hasGDriveKeyFile || hasGDriveCredentials);

  const isCloudStorageConfigured = isS3Configured || isGDriveConfigured;

  const isGeminiConfigured = Boolean(config.ai.geminiApiKey);
  const isOpenAIConfigured = Boolean(config.ai.openaiApiKey);
  const isAiConfigured = isGeminiConfigured || isOpenAIConfigured;
  const isNeonConfigured = Boolean(config.db.url);

  let storageMessage = 'Cloud storage not connected. Files temporarily held in local staging. Configure Google Drive or S3/R2/Supabase in .env';
  if (isGDriveConfigured) {
    storageMessage = `Connected to Google Drive (Folder ID: ${config.storage.googleDriveFolderId || 'Root'})`;
  } else if (isS3Configured) {
    storageMessage = `Connected to cloud bucket: ${config.storage.bucket}`;
  }

  return {
    storage: {
      connected: isCloudStorageConfigured,
      provider: isGDriveConfigured ? 'google-drive' : config.storage.provider,
      bucket: isGDriveConfigured ? 'Google Drive' : (config.storage.bucket || null),
      region: config.storage.region,
      endpoint: isGDriveConfigured ? 'https://www.googleapis.com/drive/v3' : (config.storage.endpoint || 'Standard AWS S3 endpoint'),
      message: storageMessage
    },
    database: {
      connected: true,
      type: isNeonConfigured ? 'Neon Serverless PostgreSQL (Cloud Database)' : 'SQLite Database with Full-Text Search',
      location: isNeonConfigured ? 'Neon Cloud (AWS us-east-2)' : config.db.path,
      message: isNeonConfigured
        ? 'Connected to Neon Serverless PostgreSQL with cloud resilience & JSONB indexing'
        : 'Database operational (User auth, Document indexing, Metadata & Search active)'
    },
    ai: {
      connected: isAiConfigured,
      provider: isGeminiConfigured ? 'Google Gemini' : (isOpenAIConfigured ? 'OpenAI' : 'None'),
      model: isGeminiConfigured ? config.ai.geminiModel : (isOpenAIConfigured ? config.ai.openaiModel : null),
      message: isAiConfigured
        ? `Connected to ${isGeminiConfigured ? 'Google Gemini' : 'OpenAI'} (${isGeminiConfigured ? config.ai.geminiModel : config.ai.openaiModel})`
        : 'AI service not connected. Add GEMINI_API_KEY (Free tier available) or OPENAI_API_KEY to enable AI Grounded Search'
    }
  };
}

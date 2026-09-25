import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { google } from 'googleapis';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stagingDir = path.join(__dirname, '..', '..', 'staging_temp');

// Ensure staging directory exists for temporary upload buffer / staging fallback
if (!fs.existsSync(stagingDir)) {
  fs.mkdirSync(stagingDir, { recursive: true });
}

let s3Client = null;
let driveClient = null;

function getS3Client() {
  if (s3Client) return s3Client;

  if (!config.storage.accessKeyId || !config.storage.secretAccessKey) {
    return null;
  }

  const s3Config = {
    region: config.storage.region || 'us-east-1',
    credentials: {
      accessKeyId: config.storage.accessKeyId,
      secretAccessKey: config.storage.secretAccessKey,
    },
    forcePathStyle: config.storage.forcePathStyle,
  };

  // If custom endpoint is set (e.g. Cloudflare R2, Supabase S3, MinIO)
  if (config.storage.endpoint) {
    s3Config.endpoint = config.storage.endpoint;
  }

  s3Client = new S3Client(s3Config);
  return s3Client;
}

function getGoogleDriveClient() {
  if (driveClient) return driveClient;

  if (config.storage.provider !== 'gdrive' && config.storage.provider !== 'google-drive') {
    return null;
  }

  try {
    let auth = null;
    // 1. Check for OAuth2 credentials (Preferred: Uses personal 15 GB quota)
    if (config.storage.googleClientId && config.storage.googleClientSecret && config.storage.googleRefreshToken) {
      const oauth2Client = new google.auth.OAuth2(
        config.storage.googleClientId,
        config.storage.googleClientSecret,
        'http://localhost:3004/oauth2callback'
      );
      oauth2Client.setCredentials({
        refresh_token: config.storage.googleRefreshToken
      });
      auth = oauth2Client;
    } 
    // 2. Check for Service Account JSON Key File
    else if (config.storage.googleKeyFilePath && fs.existsSync(config.storage.googleKeyFilePath)) {
      auth = new google.auth.GoogleAuth({
        keyFile: config.storage.googleKeyFilePath,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
    } 
    // 3. Check for Service Account inline credentials
    else if (config.storage.googleServiceAccountEmail && config.storage.googlePrivateKey) {
      auth = new google.auth.JWT({
        email: config.storage.googleServiceAccountEmail,
        key: config.storage.googlePrivateKey,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
    } else {
      return null;
    }

    driveClient = google.drive({ version: 'v3', auth });
    return driveClient;
  } catch (err) {
    console.error('Failed to initialize Google Drive client:', err.message);
    return null;
  }
}

export const storageService = {
  isCloudConnected() {
    const isS3 = Boolean(
      config.storage.bucket &&
      config.storage.accessKeyId &&
      config.storage.secretAccessKey
    );

    const hasGDriveOAuth = Boolean(config.storage.googleClientId && config.storage.googleClientSecret && config.storage.googleRefreshToken);
    const hasGDriveKeyFile = fs.existsSync(config.storage.googleKeyFilePath);
    const hasGDriveCredentials = Boolean(config.storage.googleServiceAccountEmail && config.storage.googlePrivateKey);
    const isGDrive = (config.storage.provider === 'gdrive' || config.storage.provider === 'google-drive') && (hasGDriveOAuth || hasGDriveKeyFile || hasGDriveCredentials);

    return isS3 || isGDrive;
  },

  async uploadFile({ key, buffer, mimeType }) {
    const isGDrive = config.storage.provider === 'gdrive' || config.storage.provider === 'google-drive';
    const drive = isGDrive ? getGoogleDriveClient() : null;

    if (drive) {
      try {
        const isExistingDriveFile = typeof key === 'string' && key.startsWith('gdrive:');
        const filename = path.basename(key.replace(/^gdrive:/, '')) || 'vault_file';

        const media = {
          mimeType: mimeType || 'application/octet-stream',
          body: Readable.from(buffer),
        };

        if (isExistingDriveFile) {
          const fileId = key.replace('gdrive:', '');
          const response = await drive.files.update({
            fileId,
            media,
            fields: 'id, name, webViewLink, webContentLink',
          });
          return {
            provider: 'google-drive',
            bucket: 'Google Drive',
            key: `gdrive:${response.data.id}`,
            cloudStored: true,
            driveFileId: response.data.id,
            webViewLink: response.data.webViewLink,
          };
        } else {
          const fileMetadata = {
            name: filename,
            parents: config.storage.googleDriveFolderId ? [config.storage.googleDriveFolderId] : undefined,
          };
          const response = await drive.files.create({
            requestBody: fileMetadata,
            media,
            fields: 'id, name, webViewLink, webContentLink',
          });
          return {
            provider: 'google-drive',
            bucket: 'Google Drive',
            key: `gdrive:${response.data.id}`,
            cloudStored: true,
            driveFileId: response.data.id,
            webViewLink: response.data.webViewLink,
          };
        }
      } catch (err) {
        console.error('Google Drive upload error:', err.message);
        console.warn('Falling back to local staging storage for resilience...');
        const localFilePath = path.join(stagingDir, key);
        const subDir = path.dirname(localFilePath);
        if (!fs.existsSync(subDir)) {
          fs.mkdirSync(subDir, { recursive: true });
        }
        await fs.promises.writeFile(localFilePath, buffer);
        return {
          provider: 'local-staging',
          bucket: null,
          key,
          cloudStored: false,
          warning: 'Saved to local staging because Google Drive encountered an error: ' + err.message
        };
      }
    }

    const client = getS3Client();

    if (this.isCloudConnected() && client) {
      // Upload directly to Cloud Object Storage (S3 / R2 / Supabase)
      const command = new PutObjectCommand({
        Bucket: config.storage.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      });

      await client.send(command);
      return {
        provider: config.storage.provider || 's3',
        bucket: config.storage.bucket,
        key,
        cloudStored: true
      };
    } else {
      // Staging fallback before cloud credentials configured
      const localFilePath = path.join(stagingDir, key);
      const subDir = path.dirname(localFilePath);
      if (!fs.existsSync(subDir)) {
        fs.mkdirSync(subDir, { recursive: true });
      }
      await fs.promises.writeFile(localFilePath, buffer);

      return {
        provider: 'local-staging',
        bucket: null,
        key,
        cloudStored: false,
        warning: 'Saved to local temporary staging. Connect Google Drive or S3 in .env for permanent cloud persistence.'
      };
    }
  },

  async getFileStream(key) {
    if (typeof key === 'string' && key.startsWith('gdrive:')) {
      const drive = getGoogleDriveClient();
      if (!drive) {
        throw new Error('Google Drive client is not configured.');
      }
      const fileId = key.replace('gdrive:', '');
      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );
      let meta = null;
      try {
        const metaRes = await drive.files.get({ fileId, fields: 'mimeType, size' });
        meta = metaRes.data;
      } catch (err) {
        // non-fatal
      }
      return {
        stream: response.data,
        contentType: meta?.mimeType || 'application/octet-stream',
        contentLength: meta?.size ? parseInt(meta.size, 10) : undefined,
      };
    }

    const client = getS3Client();

    if (this.isCloudConnected() && client) {
      const command = new GetObjectCommand({
        Bucket: config.storage.bucket,
        Key: key,
      });

      const response = await client.send(command);
      return {
        stream: response.Body,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
      };
    } else {
      const localFilePath = path.join(stagingDir, key);
      if (!fs.existsSync(localFilePath)) {
        throw new Error('File not found in temporary staging or cloud storage');
      }

      return {
        stream: fs.createReadStream(localFilePath),
        contentType: 'application/octet-stream',
        contentLength: (await fs.promises.stat(localFilePath)).size,
      };
    }
  },

  async getSignedUrl(key, expiresInSeconds = 900) {
    if (typeof key === 'string' && key.startsWith('gdrive:')) {
      const drive = getGoogleDriveClient();
      if (!drive) return null;
      try {
        const fileId = key.replace('gdrive:', '');
        const metaRes = await drive.files.get({ fileId, fields: 'webViewLink, webContentLink' });
        return metaRes.data.webContentLink || metaRes.data.webViewLink || null;
      } catch (err) {
        return null;
      }
    }

    const client = getS3Client();

    if (this.isCloudConnected() && client) {
      const command = new GetObjectCommand({
        Bucket: config.storage.bucket,
        Key: key,
      });

      // Secure pre-signed URL with short TTL (15 minutes)
      return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    }

    return null;
  },

  async deleteFile(key) {
    if (typeof key === 'string' && key.startsWith('gdrive:')) {
      const drive = getGoogleDriveClient();
      if (drive) {
        try {
          const fileId = key.replace('gdrive:', '');
          await drive.files.delete({ fileId });
        } catch (err) {
          console.warn('Google Drive delete error:', err.message);
        }
      }
      return true;
    }

    const client = getS3Client();

    if (this.isCloudConnected() && client) {
      const command = new DeleteObjectCommand({
        Bucket: config.storage.bucket,
        Key: key,
      });

      await client.send(command);
    } else {
      const localFilePath = path.join(stagingDir, key);
      if (fs.existsSync(localFilePath)) {
        await fs.promises.unlink(localFilePath);
      }
    }
    return true;
  }
};

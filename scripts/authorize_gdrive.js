import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env');

dotenv.config({ path: envPath });

const CLIENT_ID = process.env.GDRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GDRIVE_CLIENT_SECRET;
const PORT = 3004;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET must be set in .env');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const scopes = [
  'https://www.googleapis.com/auth/drive'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: scopes,
});

console.log('\n======================================================');
console.log('🔗 GOOGLE DRIVE ONE-CLICK AUTHORIZATION');
console.log('======================================================');
console.log('\nPlease open this link in your browser to authorize:');
console.log('\n' + authUrl + '\n');
console.log('Waiting for authorization callback on port ' + PORT + '...');

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = url.parse(req.url, true);
    if (parsedUrl.pathname === '/oauth2callback') {
      const code = parsedUrl.query.code;

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error: No authorization code received.</h1>');
        return;
      }

      const { tokens } = await oauth2Client.getToken(code);
      const refreshToken = tokens.refresh_token;

      if (!refreshToken) {
        console.warn('Note: No refresh token returned. (Using existing or access token).');
      } else {
        // Update .env file with GDRIVE_REFRESH_TOKEN
        let envContent = fs.readFileSync(envPath, 'utf8');
        if (envContent.includes('GDRIVE_REFRESH_TOKEN=')) {
          envContent = envContent.replace(/GDRIVE_REFRESH_TOKEN=.*/, `GDRIVE_REFRESH_TOKEN=${refreshToken}`);
        } else {
          envContent += `\nGDRIVE_REFRESH_TOKEN=${refreshToken}\n`;
        }
        fs.writeFileSync(envPath, envContent, 'utf8');
        console.log('\n✅ Successfully saved GDRIVE_REFRESH_TOKEN to .env!');
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Drive Connected</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 40px 48px; border-radius: 16px; border: 1px solid #334155; text-align: center; max-width: 480px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
            h1 { color: #10b981; font-size: 26px; margin-bottom: 12px; }
            p { color: #94a3b8; font-size: 15px; line-height: 1.6; }
            .badge { display: inline-block; background: #064e3b; color: #6ee7b7; padding: 6px 16px; border-radius: 9999px; font-weight: 600; font-size: 14px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">Connected Successfully</div>
            <h1>Google Drive Connected!</h1>
            <p>Your Personal AI Vault is now connected to your Google Drive. All uploaded PDFs, notes, and documents will be saved directly into your 15 GB Google Drive storage.</p>
            <p style="margin-top: 24px; color: #64748b; font-size: 13px;">You can now close this tab and return to your app.</p>
          </div>
        </body>
        </html>
      `);

      console.log('\n🎉 GOOGLE DRIVE CONNECTED SUCCESSFULLY! All systems ready.\n');
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 2000);
    }
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`<h1>Authorization Failed</h1><p>${err.message}</p>`);
  }
});

server.listen(PORT, () => {
  console.log(`Server listening for OAuth callback at http://localhost:${PORT}/oauth2callback`);
});

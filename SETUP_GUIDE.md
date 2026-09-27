# 🆓 100% Free Forever ($0.00 Cost) Setup Guide

This guide shows you how to run your **Personal AI Vault** completely **FREE** ($0/month) with **zero credit card charges**.

---

## 💎 The 100% Free Blueprint ($0/Month)

| Component | 100% Free Solution | Free Allowance | Monthly Cost |
| :--- | :--- | :--- | :--- |
| **🧠 AI Grounded Search** | **Google Gemini 1.5 Flash** (via Google AI Studio) | **1,500 questions/day** & 15 queries/min | **$0.00 (FREE)** |
| **☁️ Cloud Object Storage** | **Cloudflare R2** or **Supabase Storage** | **10 GB storage free** (Cloudflare R2) / 1 GB (Supabase) | **$0.00 (FREE)** |
| **💾 Database & Index** | **Built-in SQLite + FTS5** | Unlimited files & metadata | **$0.00 (FREE)** |
| **👁️ Document OCR & Vision** | **Built-in Tesseract.js & Gemini** | Unlimited scans | **$0.00 (FREE)** |
| **📱 Phone & Laptop Access** | **Direct Local Wi-Fi Network** | Unlimited bandwidth | **$0.00 (FREE)** |
| **TOTAL MONTHLY COST** | | | **$0.00 / month** |

---

## Step 1: Get Your Free Google Gemini AI Key (Takes 1 minute)

The AI search uses **Google Gemini 1.5 Flash**, which Google provides **100% free** for personal developers via Google AI Studio (up to 1,500 queries every single day).

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your normal Google/Gmail account.
3. Click **"Create API Key"** (or "Get API key").
4. Copy the generated key (starts with `AIzaSy...`).
5. Open the [`.env`](file:///c:/Users/aksha/OneDrive/Desktop/MyStorage/.env) file in your vault folder and paste it:
   ```env
   GEMINI_API_KEY=AIzaSyYourCopiedKeyHere
   GEMINI_MODEL=gemini-1.5-flash
   ```

*You now have 100% free AI search!*

---

## Step 2: Get 10 GB Free Cloud Storage with Cloudflare R2 (Takes 2 minutes)

Cloudflare provides **10 GB of permanent cloud object storage for free** with **zero egress/download fees**.

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) and sign up for a free account.
2. In the left sidebar, click **R2 Object Storage**.
3. Click **"Create bucket"** and name it (e.g. `my-ai-vault`).
4. On the R2 home page, click **"Manage R2 API Tokens"** (on the right side).
5. Click **"Create API Token"**:
   - Permissions: Select **Object Read & Write**.
   - TTL: Leave as default (Forever).
   - Click **Create API Token**.
6. Copy:
   - **Account ID** (found on the R2 overview page)
   - **Access Key ID**
   - **Secret Access Key**
7. Open your [`.env`](file:///c:/Users/aksha/OneDrive/Desktop/MyStorage/.env) file and fill in:
   ```env
   STORAGE_PROVIDER=s3
   S3_BUCKET=my-ai-vault
   S3_REGION=auto
   S3_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com
   S3_ACCESS_KEY_ID=<your-access-key-id>
   S3_SECRET_ACCESS_KEY=<your-secret-access-key>
   ```

---

## Alternative Free Storage: Supabase (1 GB Free)

If you prefer Supabase:
1. Create a free account at [supabase.com](https://supabase.com/).
2. Create a new project.
3. Go to **Storage** > **New Bucket** (name it `my-ai-vault` and make it private).
4. Go to **Project Settings** > **Storage** > Generate S3 credentials.
5. Add to [`.env`](file:///c:/Users/aksha/OneDrive/Desktop/MyStorage/.env):
   ```env
   STORAGE_PROVIDER=supabase
   S3_BUCKET=my-ai-vault
   S3_REGION=us-east-1
   S3_ENDPOINT=https://<your-project-id>.supabase.co/storage/v1/s3
   S3_ACCESS_KEY_ID=<your-supabase-key-id>
   S3_SECRET_ACCESS_KEY=<your-supabase-secret-key>
   S3_FORCE_PATH_STYLE=true
   ```

---

## Step 3: Web Push Notifications & Reminders Setup (100% Free)

Push notifications use the open W3C Web Push standard with RFC 8292 VAPID encryption. No third-party paid notification service (e.g., Firebase, OneSignal) is required!

1. **Automatic Development Keys**: On first start, the server automatically generates a local VAPID keypair in `data/vapid_keys.json` so notifications work immediately out-of-the-box.
2. **Production Key Generation (Optional)**:
   ```bash
   npx web-push generate-vapid-keys
   ```
   Add the output to your [`.env`](file:///c:/Users/aksha/localstorage/Desktop/MyStorage/.env):
   ```env
   VAPID_PUBLIC_KEY=BG...
   VAPID_PRIVATE_KEY=...
   VAPID_SUBJECT=mailto:your-email@example.com
   ```
3. **Scheduled Reminders**:
   - The built-in scheduler checks for due reminders every 60 seconds.
   - For serverless deployments (Vercel, AWS Lambda), set `CRON_SECRET=your-cron-secret` in `.env` and trigger `POST /api/tasks/cron/reminders` with header `Authorization: Bearer your-cron-secret` via Vercel Cron or GitHub Actions.

---

## Step 4: Access from Your Phone for Free

You do not need to pay for any cloud hosting or domain to use the vault from your phone:

1. Connect your phone and laptop to the same Wi-Fi.
2. Run `ipconfig` in PowerShell to find your laptop's local IPv4 address (e.g., `192.168.1.45`).
3. Start the server:
   ```bash
   npm start
   ```
4. Open Chrome or Safari on your phone and go to:
   ```
   http://192.168.1.45:3000
   ```
5. Bookmark it or tap **"Add to Home Screen"** on your phone to install the PWA, enable push notifications, and receive reminder alerts even when the browser is in the background!

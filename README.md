# 🔒 Private Personal AI Vault

A private, secure personal AI vault accessible from your phone and laptop. Upload PDFs, documents, images, and notes, and instantly retrieve them using full-text keyword search or a grounded AI assistant.

---

## ✨ Features

- **📱 Phone & Laptop Access:** Fully responsive glassmorphic web interface optimized for desktop browsers and mobile touch screens.
- **☁️ Cloud Object Storage:** Connects to **Cloudflare R2**, **Supabase Storage**, **AWS S3**, or **Google Cloud Storage** via standard S3 protocol. Files are permanently stored in the cloud rather than on your local device.
- **🛡️ Private & Secure:**
  - Login authentication with bcrypt password hashing and JWT sessions.
  - Files are stored in private buckets and streamed through an authenticated endpoint (`/api/files/:id/content`) so strangers cannot access files via public URLs.
  - All storage and AI API keys remain strictly on the backend server.
- **🔍 Dual-Search Capabilities:**
  - **Keyword & Full-Text Search:** Instant sub-string and token search with highlighted match snippets across filenames, PDF contents, Word documents, text files, and OCR image text.
  - **AI Grounded Assistant (RAG):** Ask natural language questions like *"Find the photo of my certificate"* or *"Which PDF mentions my internship?"*. The AI only answers from your uploaded vault files and cites exact sources.
- **📄 Multi-Format Text & OCR Extraction:**
  - **PDFs:** Multi-page text extraction (`pdf-parse`).
  - **Word Docs:** Word `.docx` parsing (`mammoth`).
  - **Images & Photos:** OCR text extraction (`tesseract.js` and Gemini Vision).
  - **Notes & Markdown:** Built-in personal note-taking tool.
- **📝 Tasks & Reminders:**
  - Create, edit, complete, and delete tasks with notes, due dates, timezone selection, and customizable reminder offsets (at due time, 5m before, 15m before, 1h before, custom minutes).
  - Dual viewing modes: categorized task list (All, Pending, Completed, Overdue, Today) and calendar-style upcoming agenda view.
  - Native Web Push Notifications delivered to all logged-in devices (laptops and mobile phones) even when the tab is closed.
  - Resilient backend scheduler running every minute, plus an authenticated cron endpoint (`/api/tasks/cron/reminders`) for serverless deployments.
- **⚡ Zero-Pretend Transparency:** Live status indicators for Cloud Storage, Database, AI services, and Web Push. If cloud or VAPID keys are not yet configured, the system transparently uses local defaults and provides setup instructions.

---

## 🚀 Quick Start

### 1. Start the Server
```bash
npm start
```
The server will start on `http://localhost:3000` (or `PORT` specified in `.env`).

### 2. Access from Laptop
Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

### 3. Access from Phone
1. Connect your phone to the same Wi-Fi network as your laptop.
2. Find your laptop's local IP address (`ipconfig` on Windows or `ifconfig` on macOS/Linux).
3. On your phone's browser, visit: `http://<your-laptop-ip>:3000`.
4. Sign in to your vault to upload photos directly from your camera, view notes, and receive push notifications on your phone!

---

## ⚙️ Environment Variables & Configuration (.env)

Edit the `.env` file in the project root to configure cloud services, AI, database, and push notifications:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-random-secure-secret-key-here

# ------------------------------------------------------------------------------
# 1. DATABASE (SQLite WASM Local or Neon Serverless PostgreSQL)
# ------------------------------------------------------------------------------
# Leave empty for local SQLite WASM, or set Neon connection string:
# DATABASE_URL=postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require

# ------------------------------------------------------------------------------
# 2. WEB PUSH NOTIFICATIONS (VAPID)
# ------------------------------------------------------------------------------
# Generate your own keys: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com

# ------------------------------------------------------------------------------
# 3. SCHEDULED CRON JOB (For serverless deployments)
# ------------------------------------------------------------------------------
CRON_SECRET=your-secret-token-for-cron-endpoint

# ------------------------------------------------------------------------------
# 4. CLOUD STORAGE (Choose Cloudflare R2, Supabase, or AWS S3)
# ------------------------------------------------------------------------------
# Option A: Cloudflare R2 (Recommended: 10GB free/mo, $0 egress fees)
STORAGE_PROVIDER=s3
S3_BUCKET=my-personal-ai-vault
S3_REGION=auto
S3_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<your-r2-access-key-id>
S3_SECRET_ACCESS_KEY=<your-r2-secret-access-key>

# ------------------------------------------------------------------------------
# 5. AI RETRIEVAL (Google Gemini or OpenAI)
# ------------------------------------------------------------------------------
# Option A: Google Gemini (Recommended: 100% Free tier, 1500 req/day)
# Get key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-3.8-flash

# Option B: OpenAI (Alternative)
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini
```

---

## 🔔 Push Notifications & Scheduling in Deployment

### Generating VAPID Keys
Web push uses standard RFC 8292 VAPID encryption. If no keys are set in `.env`, the server automatically generates and persists a local key pair in `data/vapid_keys.json` for effortless development.

To generate permanent production VAPID keys:
```bash
npx web-push generate-vapid-keys
```
Copy the Public Key and Private Key into your `.env` file.

### Scheduling Reminders

1. **Long-Running Server (Node.js / Docker / VPS / Local):**
   - The built-in background scheduler ([server/services/scheduler.js](file:///c:/Users/aksha/localstorage/Desktop/MyStorage/server/services/scheduler.js)) automatically executes every 60 seconds on server boot. No additional setup is required.

2. **Serverless Deployment (Vercel / AWS Lambda / Render / Cloudflare):**
   - In serverless environments where persistent background intervals don't stay alive, invoke the scheduled HTTP endpoint once every minute:
     ```http
     POST https://your-domain.com/api/tasks/cron/reminders
     Authorization: Bearer <CRON_SECRET>
     ```
   - Alternatively, pass the query parameter: `https://your-domain.com/api/tasks/cron/reminders?secret=<CRON_SECRET>`
   - This endpoint can be triggered by **Vercel Cron Jobs**, **GitHub Actions**, **AWS EventBridge**, or any free webhook scheduler (such as cron-job.org).

---

## 📁 Project Structure

```
MyStorage/
├── .env.example             # Configuration template
├── .env                     # Active environment variables
├── package.json             # Dependencies and scripts
├── SETUP_GUIDE.md           # Step-by-step cloud & AI setup manual
├── README.md                # Project documentation
│
├── server/
│   ├── index.js             # Express server entry point & scheduler boot
│   ├── config.js            # Configuration & diagnostics
│   ├── db.js                # SQLite WASM + Postgres unified models (files, notes, tasks, push)
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── services/
│   │   ├── storage.js       # S3-compatible cloud object storage service
│   │   ├── extractor.js     # Text parser for PDF, DOCX, text, and OCR
│   │   ├── ai.js            # Grounded RAG AI retrieval engine
│   │   ├── push.js          # VAPID Web Push notification service
│   │   └── scheduler.js     # 60-second reminder background interval job
│   └── routes/
│       ├── auth.js          # Registration & login endpoints
│       ├── files.js         # Upload, secure streaming & deletion
│       ├── notes.js         # Personal note creation & update
│       ├── search.js        # Full-text search & AI search endpoints
│       ├── tasks.js         # Task CRUD, filters, completion toggle & cron endpoint
│       ├── push.js          # Push subscription management & test dispatch
│       └── status.js        # Real-time service connection diagnostics
│
├── migrations/
│   ├── 001_initial_neon.sql # Neon PostgreSQL schema (users, files, notes)
│   └── 002_tasks_reminders.sql # Neon PostgreSQL schema (tasks, push_subscriptions)
│
└── public/
    ├── index.html           # Responsive Single Page Application
    ├── service-worker.js    # Service worker with push notification handler
    ├── css/
    │   └── style.css        # Dark glassmorphic design system
    └── js/
        ├── api.js           # Client API library (files, notes, tasks, push)
        └── app.js           # UI logic, task filters, calendar view & Web Push workflow
```

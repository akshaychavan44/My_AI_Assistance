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
- **⚡ Zero-Pretend Transparency:** Live status indicators for Cloud Storage, Database, and AI services. If cloud keys are not yet configured, the system transparently indicates its local staging status and setup steps.

---

## 🚀 Quick Start

### 1. Start the Server
```bash
npm start
```
The server will start on `http://localhost:3000`.

### 2. Access from Laptop
Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

### 3. Access from Phone
1. Connect your phone to the same Wi-Fi network as your laptop.
2. Find your laptop's local IP address (`ipconfig` on Windows or `ifconfig` on macOS/Linux).
3. On your phone's browser, visit: `http://<your-laptop-ip>:3000`.
4. Sign in to your vault to upload photos directly from your camera or files.

---

## ⚙️ Cloud Services & AI Configuration (.env)

Edit the `.env` file in the project root to connect your cloud services:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-random-secure-secret-key-here

# ------------------------------------------------------------------------------
# 1. CLOUD STORAGE (Choose Cloudflare R2, Supabase, or AWS S3)
# ------------------------------------------------------------------------------
# Option A: Cloudflare R2 (Recommended: 10GB free/mo, $0 egress fees)
STORAGE_PROVIDER=s3
S3_BUCKET=my-personal-ai-vault
S3_REGION=auto
S3_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<your-r2-access-key-id>
S3_SECRET_ACCESS_KEY=<your-r2-secret-access-key>

# ------------------------------------------------------------------------------
# 2. AI RETRIEVAL (Google Gemini or OpenAI)
# ------------------------------------------------------------------------------
# Option A: Google Gemini (Recommended: 100% Free tier, 1500 req/day)
# Get key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-1.5-flash

# Option B: OpenAI (Alternative)
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini
```

---

## 💰 100% Free Forever Blueprint ($0.00 / month)

Your vault is designed to run completely free without any credit card or ongoing charges:

| Component | 100% Free Solution | Free Allowance | Ongoing Cost |
| :--- | :--- | :--- | :--- |
| **🧠 AI Search & Grounded Assistant** | **Google Gemini 1.5 Flash** | **1,500 queries / day** via Google AI Studio | **$0.00 / month (FREE)** |
| **☁️ Cloud Object Storage** | **Cloudflare R2** | **10 GB storage free** + $0 egress fees | **$0.00 / month (FREE)** |
| **💾 Database & Search Index** | **Built-in SQLite WASM + FTS5** | Unlimited notes, files & metadata | **$0.00 (FREE)** |
| **👁️ Document OCR & Vision** | **Built-in Tesseract.js & Gemini** | Unlimited document text extraction | **$0.00 (FREE)** |
| **📱 Mobile & Laptop Access** | **Local Wi-Fi Network** | Unlimited devices | **$0.00 (FREE)** |
| **TOTAL MONTHLY COST** | | | **$0.00 / month** |

For detailed step-by-step setup guides, refer to [SETUP_GUIDE.md](file:///c:/Users/aksha/OneDrive/Desktop/MyStorage/SETUP_GUIDE.md).

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
│   ├── index.js             # Express server entry point
│   ├── config.js            # Configuration & diagnostics
│   ├── db.js                # SQLite WASM + FTS5 database engine
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── services/
│   │   ├── storage.js       # S3-compatible cloud object storage service
│   │   ├── extractor.js     # Text parser for PDF, DOCX, text, and OCR
│   │   └── ai.js            # Grounded RAG AI retrieval engine
│   └── routes/
│       ├── auth.js          # Registration & login endpoints
│       ├── files.js         # Upload, secure streaming & deletion
│       ├── notes.js         # Personal note creation & update
│       ├── search.js        # Full-text search & AI search endpoints
│       └── status.js        # Real-time service connection diagnostics
│
└── public/
    ├── index.html           # Responsive Single Page Application
    ├── css/
    │   └── style.css        # Dark glassmorphic design system
    └── js/
        ├── api.js           # Client API library
        └── app.js           # UI logic, search, uploads, AI citations & preview
```

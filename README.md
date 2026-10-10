# 🇪🇹 EthioDV-FillTrack

> **Ethiopian Diversity Visa (DV-2027) Digital Assistance & Tracking Platform**

EthioDV-FillTrack is a full-stack Progressive Web App (PWA) designed to solve the accessibility bottleneck for Ethiopian applicants entering the United States Diversity Visa (DV-2027) lottery. Since official US filing sites (`dvprogram.state.gov`) lack local currency support, EthioDV-FillTrack bridges the gap by providing localized Ethiopian payment rails (Telebirr & Commercial Bank of Ethiopia) with automated AI verification and high-security operator filing stations.

---

## ⚡ Key Features

- **Official DS-5501 Spec Replica**: Complete 14-field primary applicant form + Part 2 (Spouse & Children) validations according to U.S. State Department requirements.
- **Local Payment Rails (Telebirr & CBE)**: Flat 1,000 ETB fee. No foreign credit card required.
- **Gemini Vision AI Receipt Scanner**: Automated OCR parsing of Telebirr and CBE transaction receipts with fraud detection and instant transaction code extraction.
- **Operator Filing Station**: Split-screen workstation with 1-click clipboard macros, photo download, and confirmation number validation (`2027...`).
- **Telegram Admin & Alerts Bot**: Real-time push alerts on new payments, filing notifications, and on-demand Daily Executive Business Reports.
- **Multi-Language Support**: Seamless toggle between Amharic (አማርኛ) and English.
- **Google 1-Click OAuth & Email OTP**: Fast applicant sign-in with automatic role recognition for administrators and operators.
- **Military-Grade Security**: Field-Level Encryption (FLE) for sensitive passport/ID data and TOTP 2FA for staff.

---

## 🏗️ Architecture

```
Dvfilltrack/
├── api/                  # Express REST API Backend
│   ├── src/
│   │   ├── config/       # Environment, MongoDB & Cloudinary config
│   │   ├── controllers/  # Route handlers
│   │   ├── middleware/   # JWT Auth & Staff RBAC
│   │   ├── models/       # Mongoose schemas (Entry, Payment, User, Staff)
│   │   ├── routes/       # Auth, Entries, Payments, Admin, Uploads
│   │   ├── services/     # Gemini OCR, Telegram Bot, Resend Email, Cloudinary
│   │   └── utils/        # Crypto, TOTP & Validators
│   └── index.js          # Server entry & Vercel serverless export
├── client/               # React 18 + Vite Frontend
│   ├── src/
│   │   ├── components/   # UI components & Copy helpers
│   │   ├── pages/        # DV Form, Payment, Tracker, Admin, Operator
│   │   ├── services/     # API client & File upload helpers
│   │   └── i18n/         # Amharic & English translations
│   └── vite.config.js    # Vite PWA configuration
├── vercel.json           # Monorepo deployment config
└── package.json          # Monorepo root workspaces
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js 18+ & npm
- MongoDB Atlas cluster URI (Free M0)
- Cloudinary credentials (Free account)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/4545bk/EthioDV.git
cd EthioDV

# Install monorepo dependencies
npm install
```

### 3. Environment Variables
Copy the `.env.example` templates in both `api` and `client`:

```bash
# Backend environment setup
cp api/.env.example api/.env

# Frontend environment setup
cp client/.env.example client/.env
```

Configure your secrets in `api/.env`:
- `MONGODB_URI`: Your MongoDB Atlas connection string.
- `JWT_SECRET`: Random 32+ character string.
- `FLE_MASTER_KEY`: 32-byte hex encryption key.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Cloudinary API keys.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`: Telegram alert credentials.
- `GEMINI_API_KEY`: Google AI Studio API key for receipt OCR.
- `RESEND_API_KEY`: Resend transactional email API key.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth 2.0 credentials.

### 4. Running the Dev Servers
```bash
# Run both API (Port 5000) and Client (Port 5173)
npm run dev:api & npm run dev
```

---

## 🌐 Production Deployment

### Option 1: Vercel (Recommended Monorepo)
1. Push this repository to GitHub (`main` branch).
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import the `EthioDV` repository.
4. Add all environment variables from `api/.env.example` in Vercel **Project Settings > Environment Variables**.
5. Add `VITE_GOOGLE_CLIENT_ID` for the client.
6. Click **Deploy**. Vercel will build the frontend and serve the backend serverless endpoints automatically using `vercel.json`.

### Option 2: Render / Railway
- Deploy backend `api/` as a Web Service (`npm run start --workspace=api`).
- Deploy frontend `client/` as a Static Site (`npm run build --workspace=client`).

---

## 🛡️ Disclaimer

EthioDV-FillTrack is an independent application assistance service and is **NOT** affiliated with, endorsed by, or operated by the United States Government or the U.S. Department of State. Official DV Lottery entry is accessible directly at [dvprogram.state.gov](https://dvprogram.state.gov).

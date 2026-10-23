# EthioDV-FillTrack: Master Technical & Business Documentation
**Official System Specification, Architecture, Business Plan, User Journeys, and Admin Command Center Guide**

---

## 1. Executive Summary & Business Plan

### 1.1 The Core Opportunity & Problem Space in Ethiopia
Every year during October and November, the United States Department of State opens the official Diversity Visa (DV) lottery program (e.g., DV-2027), awarding up to 55,000 permanent resident immigrant visas (Green Cards) to eligible applicants from countries with historically low immigration rates to the United States. Ethiopia is one of the highest-demand participating countries in the world, with hundreds of thousands of citizens eagerly applying every year.

However, aspiring applicants in Ethiopia encounter severe, systemic barriers that lead to staggering disqualification rates (>40%) before applications are even evaluated:
1. **Stringent Biometric Photo Specifications:** The U.S. State Department requires strict 2x2 inch (600x600 px) color photographs, plain white/off-white background, neutral expression, no glasses, no digital alterations, and strict 50–69% head height ratio. Most local photo studios in Ethiopia lack exact calibration tools, resulting in silent automatic disqualifications.
2. **Language and Technical Complexity:** The official State Department portal (`dvprogram.state.gov`) is entirely in English, complex for non-native speakers, has confusing derivative rules (listing all biological/adopted children under 21, previous marriages, chargeability rules), and lacks save-for-later capabilities.
3. **Severe Network Congestion & Infrastructure Failure:** During the 35-day window, the official U.S. servers crash repeatedly due to global traffic overload. In Ethiopia, frequent power outages and slow internet connections cause sessions to time out mid-application, leaving thousands unable to complete their submission before the deadline.
4. **Payment Isolation:** Many third-party international services require foreign Visa/Mastercard credit cards in USD, which Ethiopian citizens cannot easily obtain or fund due to foreign exchange currency restrictions.

### 1.2 The EthioDV-FillTrack Solution
**EthioDV-FillTrack** is an enterprise-grade, high-availability Diversity Visa application preparation, validation, and manual filing assistance service designed specifically for the Ethiopian market. 

* **Asynchronous / Offline-Tolerant Intake:** Applicants can register, complete their detailed dossier at their own pace in Amharic or English, save drafts, and verify biometrics weeks before the official rush.
* **Intelligent Biometric Cropping & Validation:** Built-in photo crop guides validate aspect ratio, resolution, face centering, and lighting before submission.
* **Localized Ethiopian Payment Rails:** Native support for Ethiopia's dominant domestic financial rails: **Telebirr** and **Commercial Bank of Ethiopia (CBE / CBE Birr)**.
* **AI Vision OCR Receipt Verification:** Integrated Google Gemini AI Vision scans transaction screenshots in real-time, verifying transaction codes, amounts, and dates automatically.
* **Orchestrated Queueing & Filing Station:** Applications are stored securely with military-grade Field-Level Encryption (FLE). During the official filing window, authorized operators use a specialized split-screen Filing Station to execute error-free submissions to `dvprogram.state.gov` with guaranteed 1-click copy helpers and anti-collision locking.
* **Official Proof & Delivery:** Once filed, the operator uploads the official State Department confirmation certificate screenshot and enters the 16-character confirmation number (e.g., `2027XXXXXXXXXXXX`), which is instantly delivered to the user via Email, Telegram, and downloadable PDF.

### 1.3 Monetization & Business Model
* **Service Fee:** 1,000 ETB (Ethiopian Birr) per primary application dossier (inclusive of all derivatives/children).
* **Transparent Pricing:** No hidden fees, no subscription traps, and no foreign currency markups.
* **100% Money-Back Guarantee:** If EthioDV fails to submit an applicant's verified dossier during the official window due to technical failure, a full refund is issued under our published Refund Policy.
* **High-Volume Unit Economics:** With an operational target of 160 processed applications per day per operator station, the platform easily scales to thousands of paid submissions per season.

### 1.4 Ethical & Legal Compliance
EthioDV-FillTrack strictly maintains compliance with international legal standards and U.S. State Department guidance:
* **Prominent Non-Affiliation Disclosure:** Displayed on every single public page, footer, modal, and receipt:
  > *"EthioDV-FillTrack is an independent application assistance service and is NOT affiliated with, endorsed by, or operated by the United States Government or the U.S. Department of State. The official Diversity Visa lottery entry is free of charge at dvprogram.state.gov. Our fee is solely for form preparation, document verification, and manual filing assistance."*
* **Zero Guarantee of Visa Issuance:** Clear communication that selection is a purely random computer-generated lottery conducted solely by the U.S. government.

---

## 2. Organization, Roles & Support Infrastructure

| Role / Entity | Scope & Responsibilities | Access Level |
| :--- | :--- | :--- |
| **SuperAdmin** (`Yohannes Molla`) | System administration, financial auditing, payment approval/rejection, user deletion, phone directory CSV exports, staff onboarding, daily Telegram reports, settings management. | Full unrestricted access with mandatory TOTP 2FA. |
| **Operator / Staff** | Filing Station operations, claiming queued applications, verifying applicant photos, filing on official portal, uploading confirmation screenshots, issuing official confirmation numbers. | Filing Station, application queue, and decrypted applicant dossiers. |
| **Applicant / End User** | Account creation, form entry wizard, photo upload, payment submission, status tracking, PDF dossier download, Telegram bot alerts. | Self-service portal restricted to own account data. |
| **Customer Support Team** | 24/7 dedicated telephone assistance (`0949478933`), Telegram support via `@DV2027EthioDv_Bot`, and walk-in office assistance in Addis Ababa, Ethiopia. | Tier 1 escalation to operators and superadmins. |

---

## 3. Technology Stack & System Architecture

```
                          +-------------------------------------------------------+
                          |              Client (React 18 + Vite PWA)             |
                          |  - Multi-theme (Dark/Light)  - Responsive Mobile UI   |
                          |  - Amharic / English (i18n)  - Offline Service Worker |
                          +---------------------------+---------------------------+
                                                      |
                                        REST APIs / JSON / JWT
                                                      |
                                                      v
+-----------------------------------------------------+-------------------------------------------------------+
|                                    Express.js API Backend (Node.js)                                         |
|  +--------------------+  +----------------------+  +---------------------+  +----------------------------+  |
|  | Auth & RBAC        |  | Application Pipeline |  | Payment Engine      |  | Operator Filing Engine     |  |
|  | - JWT Tokens       |  | - Field Encryption   |  | - Telebirr / CBE    |  | - Distributed Lock (30m)  |  |
|  | - Google OAuth 2.0 |  | - Photo Cropper      |  | - Gemini Vision AI  |  | - 1-Click Copy Helpers    |  |
|  | - TOTP 2FA (Staff) |  | - Duplicate Detect   |  | - Anti-Fraud Tx     |  | - Confirmation Delivery    |  |
|  +--------------------+  +----------------------+  +---------------------+  +----------------------------+  |
+-----------------------------------------------------+-------------------------------------------------------+
        |                     |                       |                        |                      |
        v                     v                       v                        v                      v
+---------------+     +---------------+       +---------------+        +---------------+      +---------------+
| MongoDB Atlas |     | Storage (R2 / |       | Google Gemini |        | Resend Email  |      | Telegram Bot  |
| M0 Cluster    |     | Cloudinary)   |       | Vision AI     |        | Transactional |      | API Worker &  |
| Encrypted FLE |     | Presigned S3  |       | OCR Scanning  |        | Templates     |      | Webhook Event |
+---------------+     +---------------+       +---------------+        +---------------+      +---------------+
```

### 3.1 Backend Architecture (`/api`)
* **Core Runtime:** Node.js (ES Modules `import/export`) on Express.js.
* **Database & ORM:** MongoDB Atlas via Mongoose. Configured with connection pooling, replica sets, and strict schema validation.
* **Security & Encryption:**
  * **Field-Level Encryption (FLE):** Sensitive PII (Passports, Phone numbers, Mailing addresses, Confirmation numbers) are encrypted at rest using AES-256-CBC with individual initialization vectors (`crypto.js`).
  * **Deterministic Search Hashes:** SHA-256 indexing hashes allow fast indexing and lookup without exposing plaintext PII.
  * **Identity Duplicate Detection:** SHA-256 hash composed of `lastName + firstName + birthYear + birthMonth + birthDay` prevents accidental or fraudulent duplicate filings that lead to automatic State Department disqualification.
* **External Integrations:**
  * **Cloudflare R2 / Cloudinary:** High-performance presigned media uploads and secure proxy downloads.
  * **Google Gemini AI Vision:** Multimodal model scans Telebirr and CBE transaction screenshots, parsing sender numbers, amounts, dates, and reference codes.
  * **Resend API:** Transactional email delivery for OTP codes, submission receipts, official confirmation certificates, and payment reminders.
  * **Telegram Bot API:** `@DV2027EthioDv_Bot` runs dual long-polling worker and webhook handlers.

### 3.2 Frontend Architecture (`/client`)
* **Framework:** React 18 with Vite 5.
* **PWA & Mobile Ready:** Configured with `vite-plugin-pwa`, web app manifest, offline service worker, and responsive layouts.
* **Design System:** Custom CSS design system featuring:
  * Rich dark and light modes with seamless persistence in `localStorage`.
  * Google Fonts typography (Outfit, Inter).
  * Lucide-React iconographic suite.
  * Accessibility-focused contrast ratios and keyboard navigability.

---

## 4. End-to-End User Experience & Journey

### 4.1 Discovery & Landing Experience
1. **Dynamic Urgency & Countdown:** High-visibility countdown timer tracking the exact deadline to DV-2027 close.
2. **Social Proof Toast Notifications:** Real-time subtle toasts notify visitors when applicants from Addis Ababa, Hawassa, Bahir Dar, or Dire Dawa submit applications, building trust.
3. **Multi-Language Support:** Instant toggle between Amharic (አማርኛ) and English.
4. **Photo Compliance Guide:** Interactive visual guide detailing 2x2 photo requirements, common mistakes (shadows, eyeglasses, selfie angles), and accepted standards.
5. **Floating Customer Support Widget:** 1-click access to direct phone dialing (`0949478933`) and official Telegram bot chat.

### 4.2 Authentication & Onboarding
* **1-Click Google Sign-In:** Instant authentication using Google OAuth 2.0 without remembering passwords.
* **Standard Email & Password Registration:** Secure registration with password complexity enforcement.
* **Passwordless Email OTP Fallback:** Secure 6-digit one-time passcode sent directly to email.

### 4.3 The Multi-Step DV Application Wizard (`/apply`)
The intuitive 9-step wizard mirrors the official State Department Form DS-5501 while providing localized guidance and real-time field validation:
* **Step 1: Primary Entrant Identity:** Full legal name (Last/Family name, First name, Middle name or "No Middle Name" checkbox), Gender (Male/Female), Date of Birth (Year, Month, Day), Birth City (or "Birth City Unknown"), Birth Country.
* **Step 2: Country of Eligibility:** Default to Ethiopia with optional alternate chargeability claim (e.g., claiming spouse's or parents' country of birth).
* **Step 3: Biometric Photograph:** Upload photograph with interactive cropping tool, aspect ratio lock (1:1), and quality validation.
* **Step 4: Mailing Address:** In Care Of (optional), Address Line 1 & Line 2, City/Town, District/County/Province/State, Postal Code / Zip Code, Country.
* **Step 5: Contact Information:** Country where you live today, optional phone number, email address with confirmation validation.
* **Step 6: Education Level:** Highest education level achieved (from Primary Only to Doctorate Degree) with clear explanations of minimum qualification requirements (high school diploma or 2 years qualifying work experience).
* **Step 7: Marital Status:** Detailed selection (Unmarried, Married to Non-U.S. Citizen, Married to U.S. Citizen, Divorced, Widowed, Legally Separated) with clear warnings that failure to list a legal spouse results in immediate disqualification.
* **Step 8: Number of Children:** Input count of unmarried children under 21 years old (0 to 20).
* **Step 9: Derivative Dossiers:** Dynamically renders full forms and photo upload slots for spouse and each registered child.
* **Review & Submit:** Summary review modal before final submission. Upon submission, a unique reference code is issued (e.g., `#DV27-K3RKY6`).

### 4.4 Payment & Receipt Submission (`/payment/:id`)
1. **Payment Options Displayed:**
   * **Telebirr:** Direct account/phone number and QR code.
   * **Commercial Bank of Ethiopia (CBE):** Official account name and number.
   * **CBE Birr:** Mobile banking instructions.
2. **Transaction Code Input:** Entrant inputs the 10-12 character reference code received via SMS.
3. **Screenshot Upload & AI OCR Scanning:** Entrant uploads the transaction screenshot. Google Gemini Vision OCR analyzes the image, automatically extracting the transaction code and amount for comparison.
4. **Instant Queue Placement:** The entry is placed into the queue with status `PAYMENT_PENDING` and assigned an audit-tracked timestamp.

### 4.5 User Dashboard & Status Tracking (`/dashboard` & `/status`)
* **Personalized Status Cards:** Real-time status badge (`DRAFT`, `PAYMENT_PENDING`, `IN_REVIEW`, `QUEUED`, `FILING_IN_PROGRESS`, `CONFIRMED`).
* **Unpaid Reminder Banner:** Prominent reminder with direct pay button if an application has not yet been paid.
* **Printable PDF Dossier Download:** 1-click download of the complete application summary.
* **Deep-Link to Telegram:** "Connect Telegram" button links the user's account to `@DV2027EthioDv_Bot` for instant notifications.
* **Official Confirmation Certificate:** Once filed, the official 16-character confirmation number and official State Department screenshot appear directly on the dashboard.

---

## 5. Comprehensive Admin Command Center Guide

The Admin Command Center (`AdminDashboardPage.jsx`) provides enterprise controls for managing thousands of applications, verifying payments, running filing operations, and analyzing business growth.

### 5.1 Top Navigation Bar
* **EthioDV Brand Link:** Clicking the EthioDV logo or title navigates directly to the live public landing page in a clean view.
* **Theme Toggle Button:** Seamless switch between Dark and Light mode.
* **Notification Bell:** Displays system status and pending review counts.
* **Admin Profile Badge:** Displays current authenticated staff member (e.g., `Yohannes Molla` with `Superadmin` or `Operator` badge).
* **Logout Button:** Securely invalidates session tokens and redirects to staff login.

### 5.2 Header Metrics & Timeframe Controls
* **Global Metric Cards:**
  1. **Total Applicants:** Real-time count of all registered entries in the database.
  2. **Pending Reviews:** Applications awaiting payment verification or staff review.
  3. **Verified & Queued:** Paid and validated entries ready for filing.
  4. **Official Submissions:** Entries filed with official U.S. confirmation numbers.
* **Timeframe Filter Selector:**
  * Options: **Today**, **Last 7 Days**, **Last 15 Days**, **Last 30 Days**, **All Time**.
  * Dynamically recalculates metrics and trends across the entire dashboard.
* **Daily Filing Capacity Progress Bar:**
  * Tracks daily filing volume against the targeted operational capacity (e.g., `42 / 160 entries filed today`).
* **Quick Operational Action Buttons:**
  * **Send Daily Telegram Report:** Instantly triggers an executive briefing to the admin Telegram channel containing daily applicant totals, revenue, and queue depth.
  * **Send Unpaid Payment Reminders:** Automatically dispatches automated email and Telegram reminder alerts to applicants with completed forms who have not yet paid.

---

### 5.3 Detailed Breakdown of Admin Tabs & Features

#### Tab 1: Overview
* High-level operational cockpit with visual trends and queue velocity.
* **Recent Activity Feed:** Real-time live log of new registrations, payments submitted, payments approved, and entries filed. Filterable by *Today*, *Yesterday*, and *This Week*.

#### Tab 2: Filing Station (Operator Workspace)
The Filing Station is the core processing engine where authorized operators file validated applications on the official `dvprogram.state.gov` portal:
* **Anti-Collision Lock System:**
  * When an operator clicks **"Claim Next Entry"**, the system automatically selects the highest-priority queued application (sorted deterministically by `paymentApprovedAt` and `createdAt`).
  * The entry is locked for 30 minutes to prevent other operators from filing the same person simultaneously.
  * A live countdown timer shows the remaining lock time.
* **Dossier View & 1-Click Copy Helpers:**
  * Displays entrant full legal name, gender, birth date, birth city, and country of eligibility.
  * Every single data field (Last Name, First Name, Middle Name, Address Line 1, City, Postal Code, etc.) features an instant **1-Click Copy Button** that copies the exact formatted text to the clipboard for pasting into the official portal.
  * Embedded high-resolution photo preview with direct download link.
  * Complete derivative dossiers for spouse and children with individual 1-click copy fields and photos.
* **Completion & Confirmation Flow:**
  1. Operator submits the entry on `dvprogram.state.gov`.
  2. Official submission success screen appears on the official portal.
  3. Operator copies the 16-character confirmation number (e.g., `20271O1ROXXXXXX`) and pastes it into the **Confirmation Number** input field.
  4. Operator attaches the official confirmation screenshot.
  5. Operator clicks **"Complete & Issue Confirmation"**.
  6. The system encrypts the confirmation number, transitions entry status to `CONFIRMED`, and immediately dispatches an automated notification email and Telegram message to the applicant with their official confirmation certificate and screenshot.
* **Release Lock:** If an operator needs to step away, clicking **"Release Entry"** safely returns the application to the general queue without data loss.

#### Tab 3: Applicants & Submissions ("Tickets")
A comprehensive, searchable, filterable data grid of all client applications:
* **Sub-Filters:**
  * **All Applications**
  * **Pending Payment / In Review**
  * **In Queue / Verified**
  * **Submitted & Confirmed**
* **Instant Search:** Real-time search across Applicant Name, Email Address, and Reference Code (`#DV27-...`).
* **Table Columns:**
  * **Checkbox Selector:** Multi-row selection for batch operations.
  * **Ref Code:** Clickable reference code with 1-click copy badge.
  * **Applicant Name & Details:** Profile avatar, full name, email address, gender, and registration origin badge (**Google OAuth** vs **Manual Email**).
  * **Priority Pill:** High Priority vs Normal Priority based on queue algorithm.
  * **Status Badge:** Live status with distinct color indicators.
  * **Registered Date & Time:** Formatted timestamp (e.g., `10/23/2026 11:09 AM`).
* **Row Action Buttons:**
  1. **Form PDF Download (`Form PDF`):** Generates an instant, multi-page printable application dossier formatted for official review, complete with embedded applicant photos, family details, and barcode/reference header.
  2. **Photo Download (.jpg):** Downloads the primary applicant's high-resolution photograph through a dedicated backend proxy endpoint that forces `Content-Type: image/jpeg` and a `.jpg` extension, guaranteeing no operating system misidentifies it as a Word or binary file.
  3. **View Full Form (Eye Icon):** Opens the `AdminFullFormModal` displaying the complete decrypted dossier, address, passport data, education history, spouse dossier, and child dossiers. From this modal, the admin can print the full dossier or batch-download all photos (primary, spouse, and children) in sequence.
  4. **Delete Entry (Trash Icon):** Opens the `AdminDeleteConfirmModal` requiring explicit confirmation. Deletion permanently removes the entry, purges associated form data, and records an immutable audit log entry.

#### Tab 4: Clients & User Directory
* Dedicated client account management interface.
* **Filters:** Filter by **All Clients**, **Paid Clients** (users with verified payments or confirmed entries), and **Normal Clients** (unpaid registrations).
* **Search:** Filter by user email or name.
* **Actions:** View entry count per user, registration date, authentication method, and administrative deletion.

#### Tab 5: Phone Numbers & Lead Directory
High-performance directory designed for conversion outreach and SMS/calling campaigns:
* **Intelligent Phone Aggregation:** Aggregates phone numbers collected across both form dossiers (mailing/contact details) and payment submissions (Telebirr/CBE sender numbers).
* **Filters:**
  * **All Records**
  * **Has Phone Number**
  * **Paid Users**
  * **Unpaid Users** (prime candidates for phone/SMS conversion follow-up)
* **Search:** Filter by Phone Number, Name, Email, or Reference Code.
* **Direct Actions:**
  * **1-Click Copy Phone:** Copies clean phone number to clipboard.
  * **Click-to-Call Link:** Native `tel:` link for direct dialing from mobile or desktop VoIP.
  * **Export to CSV:** 1-click export of the entire filtered phone directory for external CRM or bulk SMS broadcasting.

#### Tab 6: Payment Verification & AI OCR Review
* Gallery of submitted payment receipts awaiting review.
* Displays transaction screenshot, claimed reference code, provider (Telebirr / CBE), and sender name.
* **Gemini AI Vision OCR Comparison:** Displays the AI-detected transaction code, detected amount in Birr, and confidence score alongside the user's claimed code.
* **Approve Payment:** 1-click approval marks payment `APPROVED`, updates entry status to `QUEUED`, sets `paymentApprovedAt` timestamp, and sends confirmation notification.
* **Reject Payment:** Opens rejection modal to input reason (e.g., "Duplicate transaction code", "Amount less than 1,000 ETB", "Unclear screenshot"), notifying the user to resubmit.

#### Tab 7: Reports & Operations Analytics
* Comprehensive revenue and operational breakdown.
* Total revenue generated in ETB.
* Conversion funnel analysis (Registered -> Form Completed -> Payment Submitted -> Approved -> Filed).
* Payment provider distribution (Telebirr vs CBE vs CBE Birr).

#### Tab 8: Staff Security & Two-Factor Authentication (2FA)
* Enterprise security management for administrative staff.
* **TOTP Authenticator Integration:** Generates standard Base32 secret key and QR code compatible with Google Authenticator, Microsoft Authenticator, and 1Password.
* Enforces two-factor token verification on staff login.

---

## 6. Official Telegram Bot Specification (`@DV2027EthioDv_Bot`)

The official Telegram bot serves as a 24/7 automated assistant and notification pipeline for Ethiopian applicants.

### 6.1 Bot Profile & Setup
* **Bot Username:** `@DV2027EthioDv_Bot`
* **Bot Name:** `DV2027EthioDv` (ID: `8641658422`)
* **Official Support Telephone:** `0949478933`
* **Operating Hours:** 24/7 ክፍት (Customer Support)
* **Headquarters:** አዲስ አበባ፣ ኢትዮጵያ (Addis Ababa, Ethiopia)

### 6.2 Bot Commands & Interactive Menu
| Command | Title (Amharic & English) | Function & Behavior |
| :--- | :--- | :--- |
| `/start` | ቦቱን ያስጀምሩ / Start Bot | Displays rich welcome greeting with 5 interactive inline keyboard buttons: Open Website, Check Status, Call Support, Requirements, and FAQ. Supports deep-linking (`/start link_<userId>`) to sync Telegram chat ID with web account. |
| `/status` | የማመልከቻዎን ሁኔታ ይመልከቱ / Check Status | Allows users to check their application status by typing `/status <REF_CODE>` or simply pasting their reference code (e.g., `#DV27-K3RKY6`). Performs real-time MongoDB query and returns applicant name, current status, queue rank, confirmation number, and payment instructions. |
| `/support` | የደንበኞች ድጋፍ / Support | Displays all official customer support contact details, phone number `0949478933`, office location, and a direct `tel:` call button. |
| `/faq` | በተደጋጋሚ የሚጠየቁ ጥያቄዎች / FAQ | Detailed Amharic and English answers regarding DV-2027 rules, eligibility, photo guidelines, and delivery timelines. |

### 6.3 Dual Execution Engine (Worker & Webhook)
* **Local / Standalone Mode:** [telegramBotWorker.js](file:///c:/Users/Biruh/Desktop/Dvfilltrack/api/src/services/telegramBotWorker.js) runs background long-polling (`getUpdates`) with automatic exponential backoff, allowing the bot to respond live in local development or standalone server environments without requiring a public reverse proxy.
* **Production Webhook Mode:** [webhooks.js](file:///c:/Users/Biruh/Desktop/Dvfilltrack/api/src/routes/webhooks.js) processes incoming Telegram webhook events via `POST /api/v1/webhooks/telegram` when a public domain is configured.

---

## 7. Data Models & Database Schemas

### 7.1 `Entry` Model (`Entry.js`)
* `userId`: ObjectId reference to `User`.
* `uniqueReference`: Uppercase 11-char unique identifier (e.g., `#DV27-K3RKY6`).
* `status`: `DRAFT` | `SUBMITTED` | `PAYMENT_PENDING` | `PAYMENT_REJECTED` | `QUEUED` | `FILING_IN_PROGRESS` | `NEEDS_REVISION` | `FILED` | `CONFIRMED` | `REFUND_PENDING` | `REFUNDED` | `CANCELLED`.
* `paymentApprovedAt`: Timestamp determining strict queue priority rank.
* `lockedBy`: ObjectId reference to `Staff` currently filing the entry.
* `lockedAt` & `lockExpiresAt`: 30-minute anti-collision lock expiration.
* `confirmationNumberEncrypted` & `confirmationNumberHash`: AES-256 encrypted official State Department confirmation number with SHA-256 search hash.
* `officialSubmissionScreenshotKey`: Storage key for official confirmation screenshot.
* `filedBy` & `filedAt`: Staff attribution and completion timestamp.
* `identityHash`: SHA-256 hash of `lastName + firstName + birthYear + birthMonth + birthDay` preventing duplicate filings.

### 7.2 `FormData` Model (`FormData.js`)
* `entryId`: ObjectId reference to `Entry`.
* `primary`: Primary entrant details:
  * Legal Name (Last Name, First Name, Middle Name, No Middle Name boolean).
  * Biometrics (Gender, Birth Year/Month/Day, Birth City, Birth Country, Photo Storage Key).
  * Eligibility (Eligibility Country, Alternate Chargeability explanation).
  * Encrypted PII (Passport details, Mailing Address, Phone number, Email address).
  * Education Level (10 standardized educational tiers).
  * Marital Status & Children Count.
* `spouse`: Derivative spouse dossier (Name, Gender, Birth Date, Birth City, Birth Country, Photo Key).
* `children`: Array of up to 20 derivative child dossiers.

### 7.3 `Payment` Model (`Payment.js`)
* `entryId`: ObjectId reference to `Entry`.
* `userId`: ObjectId reference to `User`.
* `amountETBCents`: Integer amount in cents (default `100000` = 1,000 ETB).
* `provider`: `TELEBIRR` | `CBE_TRANSFER` | `CBE_BIRR`.
* `claimedTransactionCode`: Unique transaction reference submitted by user.
* `senderName`: Name on sending bank account.
* `receiptFileKey`: Storage key for receipt screenshot image.
* `status`: `PENDING_VERIFICATION` | `APPROVED` | `REJECTED`.
* `rejectionReason`: Text explanation if rejected.
* `ocrTxCode`, `ocrAmount`, `ocrBank`, `ocrConfidence`, `ocrVerified`: Google Gemini AI Vision OCR parsed metadata.

### 7.4 `User` Model (`User.js`)
* `email`: Unique lowercase email address.
* `emailVerified`: Boolean verification flag.
* `passwordHash`: Bcrypt hashed password.
* `googleId`: Google OAuth 2.0 unique subject identifier.
* `authProvider`: `email` | `google` | `telegram` | `otp`.
* `telegramId`, `telegramChatId`, `telegramUsername`: Linked Telegram account metadata.
* `preferredLanguage`: `am` (Amharic) or `en` (English).
* `role`: `applicant`.

### 7.5 `Staff` Model (`Staff.js`)
* `username`: Unique staff handle.
* `email`: Staff email.
* `passwordHash`: Bcrypt password hash.
* `role`: `operator` | `superadmin`.
* `totpSecret`: Base32 secret key for 2FA authenticator apps.
* `totpEnabled`: Boolean toggle.
* `isActive`: Administrative account active flag.

### 7.6 `AuditLog` Model (`AuditLog.js`)
* Immutable append-only compliance log.
* `actorId`, `actorUsername`, `actorRole`: Staff member who performed the action.
* `action`: `APPROVE_PAYMENT` | `REJECT_PAYMENT` | `CLAIM_ENTRY` | `RELEASE_ENTRY` | `MARK_FILED` | `VIEW_PII` | `PROCESS_REFUND` | `UPDATE_SETTINGS`.
* `targetEntity` & `targetId`: Target record.
* `ipAddress` & `userAgent`: Client network signature.
* `metadata`: Contextual action payload.

---

## 8. Deployment, Environment & Operations Runbook

### 8.1 Required Environment Variables (`api/.env`)
```bash
# Server & Client Ports
PORT=5000
NODE_ENV=production
CLIENT_URL=https://ethiodv.com
APP_URL=https://api.ethiodv.com

# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ethiodv?retryWrites=true&w=majority

# Security Secrets (min 32 chars)
JWT_SECRET=super_secret_jwt_encryption_key_min_32_characters
FLE_MASTER_KEY=32_byte_hex_field_level_encryption_key

# Cloud Storage (Cloudinary or Cloudflare R2)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Telegram Bot API
TELEGRAM_BOT_TOKEN=8641658422:AAGJ0tCYMUZynsD5JhUhN-ygolXlsCcLpL0
TELEGRAM_ADMIN_CHAT_ID=your_telegram_admin_chat_id
TELEGRAM_WEBHOOK_SECRET=ethiodv_tg_webhook_secret

# Transactional Email (Resend)
RESEND_API_KEY=re_your_resend_api_key
FROM_EMAIL=EthioDV-FillTrack <onboarding@resend.dev>

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Google Gemini AI Vision (Receipt OCR)
GEMINI_API_KEY=your_gemini_api_key

# Business Defaults
DEFAULT_PRICE_ETB=1000
MAX_DAILY_ENTRIES=160
```

### 8.2 Operational Scripts
* **Start API Server:** `npm run dev` (in `/api`) or `node index.js`. Automatically initializes background Telegram polling listener.
* **Standalone Telegram Bot Runner:** `npm run bot` (in `/api`) runs `node src/scripts/runBot.js`.
* **Client Development Server:** `npm run dev` (in `/client`).
* **Client Production Build:** `npm run build` (in `/client`). Output generated in `client/dist`.

---
*Document Version: 2.4.0 — Certified for EthioDV-FillTrack DV-2027 Production Operations.*

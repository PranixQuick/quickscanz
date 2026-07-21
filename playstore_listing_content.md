# Play Store Listing Content & Submission Guide — QuickScanZ

This document provides copy-paste ready text, metadata, content rating answers, and data safety form details for uploading **QuickScanZ Premium** to the Google Play Developer Console.

---

## 1. Store Listing Metadata

### App Title (28 / 30 chars)
```text
QuickScanZ: Warranty Wallet
```

### Short Description (78 / 80 chars)
```text
Organize warranties, store invoices, and get AI claim assistance instantly.
```

### Full Description (3,410 / 4,000 chars)
```text
Never lose a warranty, bill, or receipt again! QuickScanZ Premium is your all-in-one smart warranty wallet and post-purchase intelligence platform designed to store invoices, track expiration dates, analyze product lifecycles, and assist you with AI-guided warranty claims.

Key Features:

📸 INSTANT CAMERA BILL & WARRANTY SCANNER
Say goodbye to messy paper files and faded receipts. Snap a quick photo of any invoice or warranty card, and our AI-powered OCR automatically extracts the brand name, product title, purchase date, warranty period, and price.

🔔 EXPIRY REMINDERS & NOTIFICATIONS
Get timely push notifications before your product warranties expire. Receive early alerts so you can claim free repairs, extended coverage, or maintenance before time runs out.

🤖 AARIA AI WARRANTY & CLAIM ASSISTANT
Need to make a warranty claim? Ask Aaria, your voice-enabled AI assistant. Aaria analyzes your warranty coverage, drafts claim steps, generates custom claim templates, and guides you step-by-step through merchant or manufacturer support policies.

⚖️ COMPARE-TO-BUY V2 (LIVE PRICE & RATING INSIGHTS)
Thinking of upgrading an appliance or gadget? Select any product in your wallet and enter a new candidate model. QuickScanZ fetches real-time market prices and user ratings across major platforms like Amazon and Flipkart for top comparable models, providing a clear "Pranix AI Better Buy" recommendation.

🔐 BIOMETRIC SECURITY & PRIVACY
Keep your financial records and invoices private. Secure your digital wallet with device-native Fingerprint and Face Unlock biometrics. Your data is encrypted in transit and at rest.

🌐 MULTI-CURRENCY & INTERNATIONAL SMS OTP
Support for INR (₹), USD ($), and EUR (€) pricing tiers with Razorpay PCI DSS Level 1 certified checkout. Sign in seamlessly with international phone numbers (+91, +1, +44, +971, +61, +65, +49, +966) or Google OAuth.

---

Why Choose QuickScanZ?
• Zero Hassle: Scan once, store forever in your cloud vault.
• Energy & Lifecycle Monitor: Track utility cost per day and estimated resale value over time.
• Complete Privacy: Your personal identity documents and invoices are never sold to data brokers or third parties. Fully compliant with DPDP Act 2023.

Download QuickScanZ Premium today and take complete control of your products, warranties, and post-purchase rights!
```

---

## 2. Release Notes ("What's New")

### What's New Text (422 / 500 chars)
```text
Welcome to QuickScanZ Premium v0.1.1!

• Instant Camera OCR: Scan receipts and warranty cards automatically with your phone camera.
• Aaria Voice AI: Ask Aaria warranty questions using hands-free voice commands.
• Biometric Lock: Protect your invoice vault with native Fingerprint and Face ID unlock.
• Compare-to-Buy v2: View live Amazon and Flipkart market prices and ratings for top alternative products with AI recommendations.
• International SMS OTP support.
```

---

## 3. Google Play Content Rating Questionnaire (IARC)

| Category / Question | Founder Answer | Codebase Justification |
| :--- | :--- | :--- |
| **Category Selection** | **Utility / Tools / Productivity** | Core app function is personal document management and warranty tracking. |
| **Violence, Gore, Hate Speech** | **No** | Utility tool with zero violent content. |
| **Sexuality & Nudity** | **No** | Contains no adult or sexual content. |
| **Language & Profanity** | **No** | Clean interface and curated AI responses. |
| **Controlled Substances & Gambling** | **No** | No reference to alcohol, tobacco, drugs, or gambling. |
| **User Generated Content (UGC)** | **No** | Users upload personal invoices to their private account; there is no public social feed, sharing board, or user interaction. |
| **Shares User Location** | **No** | App does not request or track GPS/Location permissions (`ACCESS_FINE_LOCATION`). |
| **Digital Purchases** | **Yes** | Offers Pro subscription upgrades via web checkout link. |

**Expected Content Rating Result:** **Everyone / PEGI 3 / USK 0**

---

## 4. Google Play Data Safety Form

### Data Collection & Usage Matrix

| Data Type | Collected? | Shared? | Purpose | Security / Encryption |
| :--- | :--- | :--- | :--- | :--- |
| **Name & Email Address** | **Yes** | No | Account authentication, customer support, and user profile creation. | Encrypted in transit (TLS 1.3) and at rest (PostgreSQL RLS). |
| **Phone Number** | **Optional** | No | SMS OTP multi-factor authentication (if user chooses Phone OTP). | Encrypted in transit and at rest. |
| **Purchase History & Prices** | **Yes** | No | Product tracking, utility cost-per-day calculation, and warranty lifecycle analytics. | Stored in private user vault. |
| **Payment & Financial Info** | **No (Direct)** | No | Subscription payments are processed directly by Razorpay (PCI DSS Level 1 certified). Credit/debit card numbers are **never** collected or stored by QuickScanZ. | Handled via Razorpay SSL Checkout. |
| **Photos & Images** | **Yes** | No | Scanning receipts, bills, and warranty cards via camera OCR. Images are stored in user's private storage bucket. | HTTPS upload to private Supabase storage. |
| **Audio Recordings** | **Yes (Ephemeral)** | No | Voice queries sent to Aaria AI Assistant (`/api/voice/listen`). Processed in-memory for speech-to-text; **not** stored permanently. | Encrypted TLS request. |
| **Biometric Data** | **No** | No | App uses `expo-local-authentication`. Fingerprint/Face templates remain strictly inside the local device hardware enclave (Android KeyStore) and are **never** sent to any server. | Local Hardware Security Module. |
| **Device ID / Push Token** | **Yes** | Yes (OneSignal) | Delivering warranty expiration alerts and push notification reminders. | Encrypted push payload. |
| **App Diagnostics & Crashes** | **Yes** | Yes (Sentry) | Crash reporting, performance monitoring, and debugging app errors. | Anonymized crash logs. |

### Data Safety Declaration Statements:
1. **Data Encrypted in Transit**: **Yes** (All data transferred over HTTPS / TLS 1.3).
2. **Data Deletion Request Available**: **Yes** (Users can delete products in-app or request full account erasure at [https://www.quickscanz.com/delete-account](https://www.quickscanz.com/delete-account) or via `privacy@quickscanz.com`).
3. **Data Sharing Policy**: **No personal data or document images are sold to data brokers or third parties.**

---

## 5. Live Privacy Policy & App Store Links

* **Live Privacy Policy URL**: `https://www.quickscanz.com/privacy-policy` *(Verified active on web app, includes DPDP Act 2023 compliance, AI processing disclosure, and contact details)*
* **Account Deletion Request URL**: `https://www.quickscanz.com/delete-account`
* **Developer Contact Email**: `privacy@quickscanz.com` / `support@pranixailabs.com`
* **Developer Entity Name**: Pranix AI Labs Pvt Ltd, Hyderabad, India

# SyncFit Enterprise Documentation Portal

Welcome to the central documentation portal for **SyncFit**, an enterprise-grade multi-tenant gym management, turnstile QR code access control, and cross-platform member ecosystem.

---

## 📚 Documentation Index

| Document | Description |
| :--- | :--- |
| **[Project Overview](PROJECT_OVERVIEW.md)** | Product vision, core capabilities, multi-tenant gym identity model, cross-platform architecture, and technology stack. |
| **[Database Schema Reference](DATABASE_SCHEMA.md)** | Complete PostgreSQL database reference: Mermaid Entity-Relationship (ER) diagram, Prisma models, field dictionaries, enums, indexes, and multi-tenant schema strategy. |
| **[Backend Architecture & Engineering](BACKEND_ARCHITECTURE.md)** | Technical deep-dive: Clean 5-layer architecture, request-response sequence diagrams, OpenTelemetry tracing, Firebase Admin Auth, and full REST API endpoint specifications. |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v20+ or v24+
- **PostgreSQL**: Running locally on port `5432` with database `app` (or configured in `backend/.env`)
- **Expo Go**: Installed on iOS or Android physical device (or Android Emulator / iOS Simulator)

---

### Step 1: Database Setup (Prisma ORM)
```bash
cd backend
npm install
npx prisma db push
npx prisma generate
```
*(Optional: Open visual database editor)*
```bash
npx prisma studio
```

---

### Step 2: Start the Backend Service
The backend runs on `http://localhost:8080` with hot-reloading:
```bash
cd backend
npm run dev
```
Verify the backend is healthy:
```bash
curl http://localhost:8080/health
# Output: {"status":"OK","timestamp":"..."}
```

---

### Step 3: Start the Web Admin Portal
The React 19 + Vite dashboard runs on `http://localhost:5173`:
```bash
cd frontend
npm install
npm run dev
```
- Open [http://localhost:5173](http://localhost:5173) in your browser.
- **Gym Owner Sign Up**: Click **"Register Gym Facility"** to create a new gym and receive an **Alphanumeric Gym ID** (e.g. `SPAR-4531`).
- **Facility QR Pass**: Visit the **Facility QR Pass** tab to view, customize, and print high-resolution turnstile passes.

---

### Step 4: Start the Mobile Member App (Expo Go)
```bash
cd mobile-app
npm install
npm run android   # For Android emulator
# OR
npm start         # For Expo Go QR code on physical devices
```
- **Login Screen**: Enter your facility's **Gym ID** (e.g., `SYNCLINK-MAIN` or your newly registered Gym ID), **Email**, and **Password**.
- **QR Scanner**: Tap **Scan Facility QR Pass** to scan the turnstile pass and check in/out.

---

## 🔑 Multi-Tenant Architecture & Password Reset Summary (Option 1)

SyncFit decouples gym membership from global email uniqueness:
1. **Gym Registration**: Every gym registered on the web portal receives a unique alphanumeric Gym ID (e.g. `SYNC-8F2B`, `SPAR-4531`).
2. **Gym-Scoped Plus-Addressing (Option 1)**: Members are stored in PostgreSQL and Firebase Auth using RFC 5233 sub-addressing (`<username>+<cleanGymCode>@<domain>`), while preserving their original contact email and phone in `User.rawEmail` and `User.phone`.
3. **Native Firebase Password Reset**: When a member requests a password reset, Firebase Auth sends the reset link directly to `<username>+<cleanGymCode>@<domain>`, which standard email providers (Gmail, Outlook, iCloud) deliver straight into the member's real inbox with zero external SMTP microservices needed.
4. **Cross-Gym Freedom**: If a member leaves one gym and joins another facility using SyncFit, the new gym onboards them with their existing email and phone number without conflicts. The member simply inputs the new gym's ID on the mobile login screen.

---

## 🌐 Network Configuration for Physical Devices
When developing with physical devices via Expo Go:
- The mobile app dynamically detects the host machine's LAN IP (`192.168.1.5`) via `Constants.expoConfig?.hostUri`.
- Backend requests are dispatched directly to `http://192.168.1.5:8080` with an automatic 4.5-second `AbortController` timeout to prevent hanging.
- Ensure your mobile device is connected to the same Wi-Fi network as your development machine.

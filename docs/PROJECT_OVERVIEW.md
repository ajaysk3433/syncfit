# SyncFit Enterprise: Project Overview & Architecture Guide

Welcome to **SyncFit**, an enterprise-grade, multi-tenant gym and fitness facility management ecosystem. SyncFit bridges the gap between gym owners, front desk operations, hardware turnstiles, and mobile gym members with real-time QR code check-ins, automated attendance tracking, and cross-gym membership isolation.

---

## 1. Executive Summary

SyncFit is engineered to solve modern challenges in fitness club administration and member experience:
- **For Gym Owners & Managers**: A web portal to administer gym facilities, monitor real-time floor occupancy, generate high-resolution QR entry stations (A4 posters, desk acrylic stands, sticker decals), onboard members, manage tiered plans, and track attendance analytics.
- **For Gym Members**: A mobile application (iOS & Android via React Native and Expo Go) enabling member login, camera QR code check-in/out, live in-gym elapsed workout timers, membership status verification, and attendance logs.
- **For Multi-Tenant Operations**: Independent alphanumeric Gym ID provisioning (e.g., `SYNC-8F2B`, `SPAR-4531`), allowing members to belong to multiple gyms using the **exact same personal email and phone number** without database or authentication conflicts.

---

## 2. Core Capabilities

### 2.1 Multi-Tenant Gym Identity
- Every gym facility registered on SyncFit receives a unique, human-readable alphanumeric **Gym ID** (e.g., `SYNC-8F2B`, `SPAR-4531`).
- Gym owners display this Gym ID to members and on wall posters.
- When logging in via the mobile app, members provide their **Gym ID**, **Email**, and **Password**.
- If a member leaves Gym A and joins Gym B, Gym B onboards them with their existing email and phone number. The member simply switches their Gym ID during login to access their new facility as a new, independent member.

### 2.2 Facility QR Code Access System
- **Web QR Station**: Generates standardized, cryptographically signed QR payloads (`SYNCLINK_GYM_ACCESS`).
- **Flexible Print Formats**: High-contrast B&W exports for A4 Turnstile Posters, Counter Desk Stands, and Decal Stickers, ready for 300 DPI physical printing or PDF export.
- **Camera-Based Check-In / Check-Out**: Members scan the facility QR code using the mobile app's built-in camera. The system automatically toggles their status (checking in if outside, checking out if inside).
- **Simulated Test Scanner**: Built-in test scanner mode allows instant verification in emulators and environments without physical cameras.

### 2.3 Real-Time Attendance & Occupancy
- Live count of currently active members on the gym floor.
- Percentage capacity indicators against facility limits.
- Precise session tracking with automated workout duration calculations and checkout logging.

### 2.4 Tiered Membership Lifecycle
- Flexible membership tiers: **STANDARD**, **PREMIUM**, and **VIP**.
- Automated plan assignment, auto-renewal flags, cancellation handling, and pause/resume states.
- Automated database plan bootstrap for instant local setup.

### 2.5 Option 1: Native Password Reset Delivery (RFC 5233 Sub-Addressing)
- **Direct Mailbox Routing**: SyncFit provisions gym-scoped Firebase accounts using plus-addressing:
  $$\text{scopedEmail} = \text{username} + \text{cleanGymCode} @ \text{domain}$$
  *Example*: `alex+spar4531@gmail.com` for a member at Spartan Fitness (`SPAR-4531`).
- **Direct-to-Inbox Delivery**: Standard mail servers (Gmail, Outlook, iCloud, ProtonMail) automatically strip `+tag` labels upon receiving mail. When Firebase Auth sends a password reset email to `alex+spar4531@gmail.com`, it arrives directly in `alex@gmail.com`'s primary inbox.
- **Zero External SMTP Overhead**: All cryptographic tokens, reset link dispatches, expiration checks, and password reset web interfaces are handled natively by Firebase Auth.
- **Mobile Password Reset Modal**: Members tap **"Forgot Password?"** on the mobile login screen, verify their Gym ID and registered email, and trigger an automated reset email without needing staff intervention.
- **Web Owner Reset**: Gym owners and administrators can also trigger password resets from the web portal login card.

---

## 3. Technology Stack

| Domain | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend Runtime** | Node.js | v20+ / v24 | Scalable asynchronous execution |
| **Backend Language** | TypeScript | v5.9+ | Static typing, interface contracts |
| **Server Framework** | Express.js | v5 (alpha) | RESTful API routing and middleware pipeline |
| **Database & ORM** | PostgreSQL + Prisma ORM | Prisma v7.10 | Relational database, type-safe migrations & queries |
| **Authentication** | Firebase Admin SDK + Firebase Auth | v12+ | JWT verification, cloud auth identity provider |
| **Telemetry & Tracing**| OpenTelemetry + Jaeger / OTLP | v0.211+ | Distributed span tracing (`withSpan`) & monitoring |
| **Logging** | Winston Logger | v3.19+ | Structured JSON application logging |
| **Web Frontend** | React + Vite | React 19, Vite 8 | Single-Page Application for gym administrators |
| **Styling** | Vanilla CSS Design System | Custom CSS | Dark glassmorphism, responsive layout, print styles |
| **Mobile App** | React Native + Expo Go | React Native 0.86, Expo 57 | Cross-platform member app (iOS & Android) |
| **Mobile Camera** | `expo-camera` | v57 | Native camera stream with barcode scanning |
| **Mobile Storage** | `@react-native-async-storage` | v2.2 | Offline caching for API URLs and active Gym ID |

---

## 4. High-Level System Architecture

```mermaid
graph TD
    subgraph Clients["Client Layer"]
        WebAdmin["Web Admin Portal<br/>(React 19 + Vite)<br/>Port: 5173"]
        MobileApp["Member Mobile App<br/>(React Native / Expo Go)<br/>Port: 8081"]
    end

    subgraph External["External Services"]
        FirebaseAuth["Firebase Authentication<br/>(Cloud Auth Service)"]
        OTLPEndpoint["OTLP / Jaeger Collector<br/>(Telemetry Endpoint)"]
    end

    subgraph BackendApp["SyncFit Backend (Express + TypeScript) - Port: 8080"]
        Middlewares["Middleware Pipeline<br/>Auth • Zod Validation • OpenTelemetry • CORS"]
        Controllers["Controllers<br/>Auth • Gym • Members • Attendance • Plans"]
        Services["Domain Services<br/>Business Logic & Gym-Scoped Scoping"]
        Repositories["Data Repositories<br/>Prisma Queries & Transactions"]
    end

    subgraph Data["Persistence Layer"]
        PostgresDB[("PostgreSQL Database<br/>(Prisma Client v7)<br/>Port: 5432")]
    end

    WebAdmin -->|REST + Bearer Token| Middlewares
    MobileApp -->|REST + Bearer Token| Middlewares
    WebAdmin -.->|Owner Auth| FirebaseAuth
    MobileApp -.->|Gym-Scoped Auth| FirebaseAuth
    Middlewares --> Controllers
    Controllers --> Services
    Services --> Repositories
    Repositories --> PostgresDB
    Services -.->|Token Verification & User Provisioning| FirebaseAuth
    Middlewares -.->|Export Spans| OTLPEndpoint
```

---

## 5. Directory Structure Overview

```
syncfit/
├── backend/                  # Express.js REST API with TypeScript & Prisma
│   ├── prisma/
│   │   └── schema.prisma     # PostgreSQL relational schema
│   ├── src/
│   │   ├── attendance/       # Check-in, check-out, QR scan, occupancy
│   │   ├── auth/             # User sign-up, login, Firebase JWT verification
│   │   ├── core/             # Configs, errors, logs, middlewares, telemetry
│   │   ├── gym/              # Facility provisioning, QR payload, gym lookup
│   │   ├── members/          # Member profiles, onboarding, family relations
│   │   ├── membership-plans/ # Tiered plans and subscription assignments
│   │   └── index.ts          # Server bootstrap and route mounting
│   └── package.json
│
├── frontend/                 # React 19 Single-Page Admin Application
│   ├── src/
│   │   ├── api/              # Axios-free Fetch API client wrappers
│   │   ├── components/       # UI components (attendance, members, modals)
│   │   ├── context/          # AuthContext, ToastContext
│   │   ├── pages/            # Dashboard, Members, Gym QR Station, Login
│   │   ├── styles/           # Design system tokens and print layout
│   │   └── App.jsx           # React Router DOM configuration
│   └── package.json
│
├── mobile-app/               # React Native Member Application (Expo 57)
│   ├── src/
│   │   ├── app/              # Expo Router tabs (Home / Explore)
│   │   ├── components/       # LoginScreen (with Password Reset Modal), QRScannerModal
│   │   ├── config/           # Firebase client initialization
│   │   ├── context/          # AuthContext with multi-tenant Gym ID & reset logic
│   │   └── services/         # API service with Metro host auto-discovery
│   └── package.json
│
└── docs/                     # Comprehensive technical documentation
    ├── README.md             # Documentation portal index
    ├── PROJECT_OVERVIEW.md   # Product overview & Option 1 mechanics (this document)
    ├── DATABASE_SCHEMA.md    # Complete database schema reference
    └── BACKEND_ARCHITECTURE.md# Backend layers, flows, and API reference
```

---

## 6. Multi-Tenant Password Reset Architecture (Option 1 Deep Dive)

SyncFit utilizes **Option 1 (RFC 5233 Plus-Addressing)** to bridge Firebase Authentication and multi-tenant facility isolation without requiring an in-house SMTP microservice.

### 6.1 The Challenge: Multi-Gym Isolation vs. Global Uniqueness
In a fitness platform, members frequently change gyms or maintain memberships at multiple facilities (e.g., home gym and office gym). 
- If Firebase Auth used the member's raw email (`alex@gmail.com`), Gym B could not register Alex because Firebase Auth enforces global email uniqueness across the entire project.
- If Gym B prefixed the email as `gymb_alex@gmail.com`, Firebase Auth could not deliver a password reset email because `gymb_alex@gmail.com` is a non-existent email address.

### 6.2 The Option 1 Solution: Sub-Addressing
Under **RFC 5233**, modern mail servers (Gmail, Outlook, iCloud, ProtonMail) support plus-tagging:
$$\text{alex+spar4531@gmail.com} \longrightarrow \text{Delivered to inbox of } \textbf{alex@gmail.com}$$

### 6.3 Complete Flowchart

```mermaid
sequenceDiagram
    autonumber
    actor Member as Member (Mobile App)
    participant UI as LoginScreen.tsx Modal
    participant AuthCtx as Mobile AuthContext
    participant FB as Firebase Auth Service
    participant MailServer as Email Provider (Gmail/Outlook)
    participant Inbox as Member's Real Inbox

    Member->>UI: Taps "Forgot Password?"
    UI->>UI: Enters Gym ID (SPAR-4531) & Email (alex@gmail.com)
    UI->>AuthCtx: sendPasswordReset("SPAR-4531", "alex@gmail.com")
    AuthCtx->>AuthCtx: Compute plus-scoped email: alex+spar4531@gmail.com
    AuthCtx->>FB: sendPasswordResetEmail(auth, "alex+spar4531@gmail.com")
    FB->>FB: Generates cryptographic one-time token & action link
    FB->>MailServer: Dispatches reset email to alex+spar4531@gmail.com
    MailServer->>MailServer: Strips '+spar4531' per RFC 5233
    MailServer->>Inbox: Delivers message to alex@gmail.com
    Inbox-->>Member: Notification: "Reset your SyncFit password"
    Member->>FB: Clicks secure link & enters new password
    FB->>FB: Updates credentials for alex+spar4531@gmail.com
    Member->>UI: Signs in with Gym ID, Email, and new password
    UI-->>Member: Successfully authenticated into SPAR-4531
```

### 6.4 Key Technical Advantages
1. **Zero SMTP Infrastructure**: No need to configure, monitor, or pay for external transactional email services (e.g., SendGrid, Mailgun, Amazon SES).
2. **Built-in Security**: Tokens are generated, signed, and expired by Google's secure authentication infrastructure with automatic rate-limiting protection (`auth/too-many-requests`).
3. **Full Backward Compatibility**: The mobile client handles fallback cascades for accounts created with legacy prefixes (`spar4531_alex@gmail.com`) or direct email (`admin@syncfit.com`).


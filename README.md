# BhumiDrishti (भूमिदृष्टि) — Multilingual Land Records Digitization & Verification Platform

**Smart India Hackathon (SIH) — Problem Statement ID 26018**  
**Organization:** Ministry of Rural Development | **Department:** Department of Land Resources (DoLR)  
**Theme:** Smart Automation | **Stack:** MongoDB, Express.js, React.js, Node.js (MERN)

---

## 1. Problem & Solution Overview

India's legacy land records (Khata/Khatauni registers, Khasra cadastral sheets, mutation orders, and deeds) exist primarily as degraded paper registers and legacy scans in regional Indian scripts (Hindi, Marathi, Telugu, etc.). 

**BhumiDrishti** provides an end-to-end automated digitization, validation, and human-in-the-loop verification ecosystem:
1. **Multilingual Ingestion:** Single & bulk upload of scans, PDFs, and historical registers with OCR language hints.
2. **Pluggable OCR & NLP Field Classification:** Extracts landowner details, survey/khasra/khata numbers, plot area, village/tehsil/district, land classification, mutation records, and registration details.
3. **Confidence Scoring & Flagging:** Computes field-level and overall extraction confidence (0–100%), auto-flagging low-confidence or anomalous records.
4. **Automated Business Rules & Duplicate Detection:** Deterministic composite key (`district + tehsil + village + surveyNumber`) matching combined with fuzzy Levenshtein landowner name similarity to prevent duplicate land titles.
5. **Cross-Database Verification:** Pluggable adapter interface cross-checking against state LRMS and central DILRMP registries.
6. **Human-Assisted Verification Workspace:** High-confidence records fast-track to approval; flagged or uncertain records route to revenue officers (Patwari/Tehsildar) with side-by-side scan view and field-level corrections.
7. **AI Learning Loop:** Every human correction is recorded to a `Feedback` collection to calibrate confidence thresholds and retrain future NER models.
8. **GIS Cadastral Mapping:** Stores GeoJSON plot polygons and exposes endpoints for cadastral map visualizers and regional progress heatmaps.
9. **Role-Based Access Control (RBAC):** Jurisdiction-scoped queries ensuring village/tehsil/district officers access only their assigned revenue jurisdictions.
10. **External Integration API:** Scoped, API-key authenticated endpoints for LRMS, DILRMP, and GIS platforms with automatic PII masking.
11. **Interactive Dashboards & Audit Trails:** Real-time metrics on processing volume, accuracy trends, error distributions, and append-only immutable audit logging.

---

## 2. Architecture & Modules

```
bhumidrishti/
├── docker-compose.yml               # MongoDB, Redis, MinIO, Server, Worker
├── server/                          # Fully implemented Express.js backend
│   ├── src/
│   │   ├── config/                  # DB, environment, domain constants
│   │   ├── models/                  # User, Document, LandRecord, VerificationTask, Feedback, AuditLog, ApiClient, SystemConfig
│   │   ├── routes/                  # auth, users, documents, records, verification, dashboard, admin, integration, gis
│   │   ├── controllers/             # Business controllers matching Section 8 contracts
│   │   ├── services/                # validationEngine, duplicateDetectionService, auditService, storageService, queueService
│   │   ├── adapters/
│   │   │   ├── ocr/                 # Tesseract.js Indic/English OCR adapter
│   │   │   ├── nlpClassifier/       # Multilingual rule-based field classifier
│   │   │   └── externalRegistry/    # Mock LRMS & DILRMP cross-check adapters
│   │   ├── middlewares/             # auth (JWT), rbac (role + jurisdiction), apiKey, validation (Zod), errorHandler
│   │   ├── jobs/                    # BullMQ extraction queue & worker pipeline
│   │   ├── swagger/                 # OpenAPI 3.0 specification & Swagger UI
│   │   └── server.js                # HTTP Server entry point
│   ├── worker.js                    # Background worker process entry point
│   ├── scripts/seed.js              # Comprehensive demo database seeder (70 realistic records across 3 states)
│   └── tests/                       # Jest + Supertest integration test suite
│
└── client/                          # React frontend outline scaffold
    ├── src/
    │   ├── services/api.js          # Complete, typed API client wrapper mirroring backend contracts
    │   ├── pages/                   # 10 Screen stubs with TODO annotations
    │   ├── App.jsx                  # React Router skeleton
    │   └── main.jsx
    └── FRONTEND_TODO.md             # Screen-by-screen Phase 2 UI implementation guide
```

---

## 3. Quickstart & Running Locally

### Prerequisites
- Node.js >= 18.0.0
- MongoDB running locally on port 27017 (or via Docker)

### Step 1: Start and Seed the Backend
```bash
# Navigate to server
cd server

# Install dependencies
npm install

# Seed demo data (creates role users, system configs, and 70 multi-state land records)
npm run seed

# Run automated test suites (19 unit/integration tests)
npm test

# Start the Express API server
npm start
```
The server will boot at:
- **API Base URL:** `http://localhost:5000/api/v1`
- **Interactive Swagger Docs:** `http://localhost:5000/api-docs`
- **OpenAPI JSON Spec:** `http://localhost:5000/api-docs.json`
- **Health Check:** `http://localhost:5000/health`

### Step 2: Running the Frontend Shell
```bash
# Navigate to client
cd client

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
The client shell boots at `http://localhost:3000`.

---

## 4. Default Seeded Credentials

| Role | Email | Password | Assigned Jurisdiction |
|---|---|---|---|
| **Super Admin** | `admin@bhumidrishti.gov.in` | `Admin@123` | National / Global |
| **State Admin** | `stateadmin@bhumidrishti.gov.in` | `StateAdmin@123` | Maharashtra State |
| **District Officer** | `district.pune@bhumidrishti.gov.in` | `District@123` | District Pune |
| **Verifier (Patwari)** | `verifier.pune@bhumidrishti.gov.in` | `Verifier@123` | Haveli Tehsil, Pune |
| **DEO (Operator)** | `deo.pune@bhumidrishti.gov.in` | `Deo@123` | Wagholi Village, Pune |
| **External API Key** | `bhd_sih2026_dilrmp_test_key_master` | N/A (Header: `x-api-key`) | All Regions (`read:records`, `read:dashboard`, `read:pii`, `read:gis`) |

---

## 5. API Endpoints Reference

All endpoints return standard envelopes: `{ success: boolean, message: string, data: any, meta?: any }`.

### Authentication (`/api/v1/auth`)
- `POST /auth/login` — Email & password login -> returns access (15m) and refresh (7d) tokens
- `POST /auth/refresh` — Issue new access token using refresh token
- `POST /auth/logout` — Invalidate session and write audit trail
- `GET /auth/me` — Authenticated user profile

### Documents (`/api/v1/documents`)
- `POST /documents/upload` — Single scan / PDF multipart upload, hash deduplication & background extraction queue
- `POST /documents/bulk-upload` — Multi-file batch upload (up to 20 files)
- `GET /documents` — Paginated list of uploaded files with processing statuses
- `GET /documents/:id` — Document metadata
- `GET /documents/:id/file` — Stream original scan / PDF

### Land Records (`/api/v1/records`)
- `GET /records` — Paginated, filtered (district, tehsil, village, status, survey no, owner name)
- `GET /records/:id` — Full structured record with confidence scores and cross-checks
- `PATCH /records/:id` — Field-level update with **optimistic concurrency control** (`version`) and automatic **Feedback collection logging**
- `POST /records/:id/approve` — Transition record to `VALIDATED`
- `POST /records/:id/reject` — Transition record to `REJECTED`
- `POST /records/:id/publish` — Publish validated record to open public registry
- `GET /records/:id/duplicates` — Check for composite key & fuzzy name duplicate matches
- `GET /records/:id/audit` — Immutable audit history for the record
- `GET /records/export` — Export records in CSV or JSON format

### Verification Queue (`/api/v1/verification`)
- `GET /verification/queue` — Prioritized tasks (`URGENT`, `HIGH`, `MEDIUM`) for human review
- `POST /verification/:taskId/claim` — Claim task for verification
- `POST /verification/:taskId/complete` — Mark task resolved

### Dashboards & Analytics (`/api/v1/dashboard`)
- `GET /dashboard/summary` — Total documents, accuracy %, status distribution, pending count
- `GET /dashboard/by-region?level=state|district` — State & district breakdown
- `GET /dashboard/error-stats` — Field-level correction frequency from feedback loop
- `GET /dashboard/trend?range=30` — Daily processing volume & accuracy trend

### GIS & Cadastral Mapping (`/api/v1/gis`)
- `GET /gis/plots` — GeoJSON FeatureCollection of plot boundaries for map rendering
- `PATCH /gis/records/:id/geo` — Update or attach plot GeoJSON polygon

### External Integration API (`/api/v1/integration`) — Authenticated via `x-api-key`
- `GET /integration/records` — Query validated/published records with automatic PII masking
- `GET /integration/records/:surveyNumber` — Fetch record by survey number
- `GET /integration/gis/plots` — GeoJSON plot boundaries for external GIS platforms

### Admin Console (`/api/v1/admin`)
- `GET /admin/config` & `PATCH /admin/config` — Dynamic confidence thresholds & language settings
- `GET /admin/audit-logs` — Global immutable audit logs
- `GET /admin/api-clients` & `POST /admin/api-clients` — API key provisioning

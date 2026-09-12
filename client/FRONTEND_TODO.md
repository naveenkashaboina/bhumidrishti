# BhumiDrishti — Frontend Implementation Guide (Phase 2 Roadmap)

This document is the handoff guide for implementing the React UI in Phase 2.
Every screen from Master Prompt Section 10.2 is detailed here with its associated backend endpoints, accessible roles, and UX requirements from Section 10.3.

All backend API methods are already implemented, typed, and available in [`client/src/services/api.js`](./src/services/api.js).
Database is populated with 70 realistic land records across Maharashtra, Uttar Pradesh, and Rajasthan, ready for live querying.

---

## Screen-by-Screen Specifications

### 1. Login Page (`pages/LoginPage.jsx`)
- **Route:** `/login`
- **Accessible Roles:** Public (unauthenticated)
- **Backend Endpoints:**
  - `POST /api/v1/auth/login` -> `authApi.login({ email, password })`
- **Key UX Requirements:**
  - Clean government portal aesthetics (Emblem of India / Ministry of Rural Development branding).
  - Quick-fill credentials widget for SIH hackathon demonstration (Super Admin, District Officer, Verifier, DEO).
  - Language toggle (English, हिन्दी).
  - Redirect on login to role-specific default view:
    - `DEO` -> `/deo-dashboard`
    - `VERIFIER` -> `/verification-workspace`
    - `DISTRICT_OFFICER` / `STATE_ADMIN` / `SUPER_ADMIN` -> `/analytics`

---

### 2. DEO Dashboard ("My Uploads") (`pages/DeoDashboardPage.jsx`)
- **Route:** `/deo-dashboard`
- **Accessible Roles:** `DEO`, `SUPER_ADMIN`
- **Backend Endpoints:**
  - `POST /api/v1/documents/upload` -> `documentsApi.uploadSingle(formData)`
  - `GET /api/v1/documents` -> `documentsApi.getDocuments({ page, limit, status })`
  - `GET /api/v1/documents/:id/file` -> `documentsApi.getFileUrl(id)`
- **Key UX Requirements:**
  - Drag-and-drop file upload zone (`react-dropzone`) supporting PDF, JPG, PNG, TIFF.
  - Dropdowns for State, District, Tehsil, and Village (pre-populated from logged-in user's jurisdiction).
  - Language tag selector (e.g. Hindi, English, Marathi).
  - Processing status indicators: `UPLOADED` (amber), `PROCESSING` (blue spinner), `PROCESSED` (green checkmark), `FAILED` (red alert).
  - Thumbnail preview and download link for uploaded scans.

---

### 3. Bulk Upload Wizard (`pages/BulkWizardPage.jsx`)
- **Route:** `/bulk-upload`
- **Accessible Roles:** `DEO`, `DISTRICT_OFFICER`, `SUPER_ADMIN`
- **Backend Endpoints:**
  - `POST /api/v1/documents/bulk-upload` -> `documentsApi.uploadBulk(formData)`
- **Key UX Requirements:**
  - Batch upload zone supporting up to 20 files simultaneously.
  - Bulk jurisdiction tagger applying location to all files in batch.
  - Per-file upload progress bar and queue status tracker.

---

### 4. Verification Workspace (Core UX Screen) (`pages/VerificationWorkspacePage.jsx`)
- **Route:** `/verification-workspace`
- **Accessible Roles:** `VERIFIER`, `DISTRICT_OFFICER`, `STATE_ADMIN`, `SUPER_ADMIN`
- **Backend Endpoints:**
  - `GET /api/v1/verification/queue` -> `verificationApi.getQueue({ page, status, priority, myTasks })`
  - `POST /api/v1/verification/:taskId/claim` -> `verificationApi.claimTask(taskId)`
  - `GET /api/v1/records/:id` -> `recordsApi.getRecordById(id)`
  - `PATCH /api/v1/records/:id` -> `recordsApi.updateRecord(id, updates)` *(requires optimistic version)*
  - `POST /api/v1/records/:id/approve` -> `recordsApi.approveRecord(id)`
  - `POST /api/v1/records/:id/reject` -> `recordsApi.rejectRecord(id, { reason })`
  - `GET /api/v1/records/:id/duplicates` -> `recordsApi.getDuplicates(id)`
- **Key UX Requirements (Section 10.3):**
  - **Split View Layout:**
    - Left 50%: Original document viewer with zoom, pan, and rotate controls (`react-pdf` / high-res image).
    - Right 50%: Form with editable extracted fields.
  - **Color-Coded Confidence Badges:**
    - Green (>= 80%): High certainty
    - Amber (60–79%): Moderate certainty
    - Red (< 60%): Low certainty / uncertain field
  - **Auto-Highlighted Flags:** Fields with extraction discrepancies or validation warnings automatically receive red/yellow border and tooltip reason.
  - **Bilingual Field Labels:** English + Hindi on every field (e.g., *Survey Number / सर्वे संख्या*, *Khasra Number / खसरा संख्या*, *Owner Name / काश्तकार का नाम*).
  - **Optimistic Concurrency:** Handles `409 Conflict` gracefully with a banner if another officer updated the record simultaneously.
  - **Learning Loop:** Saving any correction automatically persists to `Feedback` collection behind the scenes.

---

### 5. Record Detail & Audit Trail View (`pages/RecordDetailPage.jsx`)
- **Route:** `/records/:id`
- **Accessible Roles:** All Authenticated Roles
- **Backend Endpoints:**
  - `GET /api/v1/records/:id` -> `recordsApi.getRecordById(id)`
  - `GET /api/v1/records/:id/audit` -> `recordsApi.getRecordAudit(id)`
  - `POST /api/v1/records/:id/publish` -> `recordsApi.publishRecord(id)`
- **Key UX Requirements:**
  - Clean tabular display of ownership register, plot area, mutation history, and registration metadata.
  - Cross-check verification status badges (State LRMS Match & DILRMP ULPIN).
  - Interactive chronological timeline of audit log entries showing timestamps, actor, action, and before/after diffs.
  - "Publish to Open Registry" button for District Officers.

---

### 6. Search & Records List (`pages/RecordsListPage.jsx`)
- **Route:** `/records`
- **Accessible Roles:** All Authenticated Roles (scoped to jurisdiction)
- **Backend Endpoints:**
  - `GET /api/v1/records` -> `recordsApi.getRecords(params)`
  - `GET /api/v1/records/export` -> `recordsApi.exportRecords(params)`
- **Key UX Requirements:**
  - Comprehensive filtering drawer: District, Tehsil, Village, Status, Survey No, Owner Name, Min Confidence.
  - Responsive table with status pill badges (`PUBLISHED`, `VALIDATED`, `NEEDS_VERIFICATION`, etc.).
  - CSV / JSON export trigger button with immediate file download.

---

### 7. GIS Cadastral Map View (`pages/GisMapViewPage.jsx`)
- **Route:** `/gis-map`
- **Accessible Roles:** All Authenticated Roles
- **Backend Endpoints:**
  - `GET /api/v1/gis/plots` -> `gisApi.getPlots({ district, tehsil, village, status })`
  - `PATCH /api/v1/gis/records/:id/geo` -> `gisApi.updatePlotBoundary(id, { geo })`
- **Key UX Requirements:**
  - Interactive Leaflet map container with OpenStreetMap / Satellite base layers.
  - GeoJSON polygon rendering of plot boundaries with color coding:
    - Green = Published
    - Blue = Validated
    - Amber = Needs Verification
  - Click popup on parcel showing landowner name, survey number, plot area, and direct link to record detail.
  - District-wise digitization progress heatmap overlay.

---

### 8. Analytics & Progress Dashboards (`pages/AnalyticsDashboardPage.jsx`)
- **Route:** `/analytics`
- **Accessible Roles:** All Authenticated Roles
- **Backend Endpoints:**
  - `GET /api/v1/dashboard/summary` -> `dashboardApi.getSummary()`
  - `GET /api/v1/dashboard/by-region` -> `dashboardApi.getByRegion('district' | 'state')`
  - `GET /api/v1/dashboard/error-stats` -> `dashboardApi.getErrorStats()`
  - `GET /api/v1/dashboard/trend` -> `dashboardApi.getTrend(30)`
- **Key UX Requirements:**
  - 4 Key Metric Cards: Total Processed, Overall Accuracy %, Published Count, Pending Queue.
  - Recharts Visualizations:
    - Status Breakdown Donut Chart
    - 30-Day Digitization Volume & Accuracy Trend Area Chart
    - Top Corrected Fields Bar Chart (demonstrating model learning from feedback)
    - District-wise Progress Bar Chart

---

### 9. Admin Console (`pages/AdminConsolePage.jsx`)
- **Route:** `/admin`
- **Accessible Roles:** `SUPER_ADMIN`, `STATE_ADMIN`
- **Backend Endpoints:**
  - `GET /api/v1/users` -> `usersApi.getUsers(params)`
  - `POST /api/v1/users` -> `usersApi.createUser(data)`
  - `GET /api/v1/admin/config` -> `adminApi.getConfig()`
  - `PATCH /api/v1/admin/config` -> `adminApi.updateConfig(data)`
  - `GET /api/v1/admin/api-clients` -> `adminApi.getApiClients()`
  - `POST /api/v1/admin/api-clients` -> `adminApi.createApiClient(data)`
  - `GET /api/v1/admin/audit-logs` -> `adminApi.getAuditLogs(params)`
- **Key UX Requirements:**
  - Tabbed interface: User Management, Dynamic Thresholds, External API Keys, Global Audit Log.
  - Sliders for overall & field confidence thresholds.
  - Key generator modal displaying newly generated API key with copy-to-clipboard button.

---

### 10. Citizen Lookup (`pages/CitizenLookupPage.jsx`)
- **Route:** `/citizen-lookup`
- **Accessible Roles:** Public (unauthenticated)
- **Backend Endpoints:**
  - `GET /api/v1/records?surveyNumber=...&status=PUBLISHED`
- **Key UX Requirements:**
  - Simple, clean public portal search by District + Survey / Khasra Number.
  - Read-only status card showing digitization status without exposing private PII (Aadhaar, internal flags).

---

## Quick Testing Credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@bhumidrishti.gov.in` | `Admin@123` |
| State Admin (Maharashtra) | `stateadmin@bhumidrishti.gov.in` | `StateAdmin@123` |
| District Officer (Pune) | `district.pune@bhumidrishti.gov.in` | `District@123` |
| Verifier (Pune / Haveli) | `verifier.pune@bhumidrishti.gov.in` | `Verifier@123` |
| DEO (Wagholi Village) | `deo.pune@bhumidrishti.gov.in` | `Deo@123` |
| External API Key | `bhd_sih2026_dilrmp_test_key_master` | Pass as `x-api-key` header |

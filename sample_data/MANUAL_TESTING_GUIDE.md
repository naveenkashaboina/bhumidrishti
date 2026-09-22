# BhumiDrishti — Manual Testing Guide & Sample Data

Use this guide to test the live platform step-by-step using both **pre-seeded database records** and **new sample document uploads**.

---

## 1. Demo Login Credentials

You can log in to [https://bhumidrishti.vercel.app](https://bhumidrishti.vercel.app) with any of these accounts (or click the quick-fill buttons on the login page):

| Role | Email | Password | Assigned Jurisdiction |
|---|---|---|---|
| **District Officer** | `district.pune@bhumidrishti.gov.in` | `District@123` | Maharashtra / Pune |
| **Verifier (Patwari)** | `verifier.pune@bhumidrishti.gov.in` | `Verifier@123` | Maharashtra / Pune / Haveli |
| **DEO (Operator)** | `deo.pune@bhumidrishti.gov.in` | `Deo@123` | Maharashtra / Pune / Wagholi |
| **Super Admin** | `admin@bhumidrishti.gov.in` | `Admin@123` | National (All States) |
| **State Admin** | `stateadmin@bhumidrishti.gov.in` | `StateAdmin@123` | Maharashtra State |

---

## 2. Pre-Seeded Sample Records to Search & Query

The database already contains **70 realistic land records** ready for querying across 3 states:

### A. Maharashtra (Pune District)
* **Tehsils:** Haveli, Baramati, Shirur, Mulshi
* **Villages:** Wagholi, Hadapsar, Loni Kalbhor, Saswad, Pirangut, Kharadi
* **Sample Survey Numbers:** `101/1`, `102/2`, `103/3`, `104/4`, `105/1`
* **Sample Khasra Numbers:** `401`, `402`, `403`, `404`, `405`
* **Sample Landowners:**
  * `Rameshwar Tukaram Patil`
  * `दिनेश विठ्ठल भोसले`
  * `Sunita Suresh Kulkarni`
  * `आनंदराव दत्तात्रेय शिंदे`
  * `Prakash Jagannath More`

### B. Uttar Pradesh (Varanasi District)
* **Tehsils:** Sadar, Pindra, Rohaniya
* **Villages:** Shivpur, Sarnath, Chunar, Ramnagar, Cholapur, Lohta
* **Sample Survey Numbers:** `131/1`, `132/2`, `133/3`, `134/4`
* **Sample Khasra Numbers:** `431`, `432`, `433`, `434`
* **Sample Landowners:**
  * `सुरेश कुमार यादव`
  * `Harish Chandra Chaubey`
  * `विमलेश कुमार त्रिपाठी`
  * `Mohd. Arshad Khan`

### C. Rajasthan (Jaipur District)
* **Tehsils:** Sanganer, Amer, Chomu, Bassi
* **Villages:** Bagru, Kukas, Bassi, Achrol, Jatwara
* **Sample Survey Numbers:** `151/1`, `152/2`, `153/3`
* **Sample Khasra Numbers:** `451`, `452`, `453`
* **Sample Landowners:**
  * `Rajendra Singh Rathore`
  * `महेन्द्र कुमार मीणा`
  * `Gopal Lal Sharma`
  * `कैलाश चन्द कुमावत`

---

## 3. Step-by-Step Test Scenarios

### Test Case 1: Search & Filter Land Records
1. Log in as **District Officer** (`district.pune@bhumidrishti.gov.in`).
2. Go to **Records** (`/records`).
3. In the search box, search for: `Rameshwar` or survey number `101/1`.
4. Test the filters:
   * Select **Status** -> `PUBLISHED` or `NEEDS_VERIFICATION`.
   * Filter by Tehsil -> `Haveli`.
5. Click **Export CSV** or **Export JSON** to test record downloading.
6. Click any record row to open the full **Record Detail** page (`/records/:id`) to inspect ownership shares, mutation history, and audit timeline.

---

### Test Case 2: Public Citizen Title Verification (No Login Required)
1. Open [https://bhumidrishti.vercel.app/citizen-lookup](https://bhumidrishti.vercel.app/citizen-lookup) in an Incognito/Private window.
2. Select **District:** `Pune`.
3. Enter **Survey Number:** `101/1`.
4. Click **Search Record**.
5. **Expected Result:**
   * Record card appears showing:
     * Status: `PUBLISHED`
     * Owner Name: `Rameshwar Tukaram Patil`
     * Plot Area: e.g. `1.25 acres`
     * Notice: Sensitive government flags, Aadhaar numbers, and verifier remarks are safely hidden.

---

### Test Case 3: Interactive Cadastral GIS Map
1. Log in as **District Officer** or **Super Admin**.
2. Click **GIS Map** (`/gis-map`).
3. Select **District:** `Pune` and **Tehsil:** `Haveli`.
4. **Expected Result:**
   * Interactive Leaflet satellite/street map loads with colored parcel polygons:
     * 🟢 **Green:** Published
     * 🔵 **Blue:** Validated
     * 🟡 **Amber:** Needs Verification
5. Click any parcel polygon on the map to see a popup with Survey No, Owner Name, Plot Area, and a direct link to the record file.

---

### Test Case 4: Revenue Officer Verification Workspace (Human-in-the-Loop)
1. Log in as **Verifier** (`verifier.pune@bhumidrishti.gov.in`).
2. Click **Verification Workspace** (`/verification-workspace`).
3. Select any task from the queue marked `NEEDS_VERIFICATION`.
4. Click **Claim Task**.
5. **Expected Result:**
   * Split-screen workspace opens:
     * **Left:** High-resolution document viewer with Zoom In, Zoom Out, and Rotate buttons.
     * **Right:** Editable form with bilingual English/Hindi labels.
     * **Confidence Badges:** Each field has a color-coded confidence pill (🟢 ≥80%, 🟡 60-79%, 🔴 <60%).
6. Try editing an extracted field (e.g., add a middle name or adjust area).
7. Click **Approve Record** or **Mark Resolved**.
8. The correction is saved, and behind the scenes, an entry is written into the `Feedback` collection to train future models!

---

### Test Case 5: Ingestion & Upload of a New Document
1. Log in as **DEO** (`deo.pune@bhumidrishti.gov.in`).
2. Go to **DEO Dashboard** (`/deo-dashboard`).
3. Under the Upload section, select:
   * **State:** `Maharashtra`
   * **District:** `Pune`
   * **Tehsil:** `Haveli`
   * **Village:** `Wagholi`
4. Drag and drop any of the sample files created in `sample_data/`:
   * [sample_1_pune_maharashtra.txt](file:///c:/ATP/BhumiDrishti/sample_data/sample_1_pune_maharashtra.txt)
   * [sample_2_varanasi_up.txt](file:///c:/ATP/BhumiDrishti/sample_data/sample_2_varanasi_up.txt)
   * [sample_3_jaipur_rajasthan.txt](file:///c:/ATP/BhumiDrishti/sample_data/sample_3_jaipur_rajasthan.txt)
   *(Or any JPG/PNG scan of a document)*.
5. Click **Upload & Process**.
6. **Expected Result:**
   * The file uploads to the backend.
   * Status moves: `UPLOADED` -> `PROCESSING` -> `PROCESSED`.
   * Extracted fields appear in the system!

---

### Test Case 6: System Analytics & Error Insights
1. Log in as **State Admin** or **Super Admin** (`admin@bhumidrishti.gov.in`).
2. Go to **Analytics** (`/analytics`).
3. Check the 4 KPI metric cards:
   * Total Processed Documents
   * Overall Accuracy Rate %
   * Published Land Titles
   * Pending Queue Count
4. View the **Status Breakdown Donut Chart**, **30-Day Digitization Volume Chart**, and **Top Corrected Fields Bar Chart** (demonstrating the system learning from officer feedback).

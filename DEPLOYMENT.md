# BhumiDrishti (भूमिदृष्टि) — Render & Vercel Deployment Guide

This guide walks you through deploying the **Express.js API Backend on Render** and the **React (Vite) Frontend on Vercel**.

---

## Part 1: Deploy Backend to Render

### Prerequisites:
- A free account on [Render.com](https://render.com)
- A cloud MongoDB database (Free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

### Step 1: Create MongoDB Atlas Database
1. Create a free cluster on MongoDB Atlas.
2. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) so Render can connect.
3. Under **Database Access**, create a user and password.
4. Click **Connect** → **Drivers (Node.js)** and copy your connection string:
   `mongodb+srv://<username>:<password>@cluster.mongodb.net/bhumidrishti?retryWrites=true&w=majority`

### Step 2: Deploy Web Service on Render
1. Go to the [Render Dashboard](https://dashboard.render.com/) and click **New +** → **Web Service**.
2. Connect your GitHub repository containing BhumiDrishti.
3. Configure the service settings:
   - **Name**: `bhumidrishti-api`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
4. Add the following **Environment Variables** in the Render Dashboard:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `10000` | Port automatically routed by Render |
   | `MONGODB_URI` | *Your Atlas connection string* | Remote MongoDB Atlas URI |
   | `JWT_SECRET` | *Random 32+ character string* | Access token secret |
   | `JWT_REFRESH_SECRET` | *Random 32+ character string* | Refresh token secret |
   | `ENABLE_REDIS_QUEUE` | `false` | In-memory async pipeline (no paid Redis needed) |
   | `OCR_PROVIDER` | `tesseract` | Indic OCR engine |
   | `EXTERNAL_REGISTRY_MODE` | `mock` | Cross-check registry adapter mode (`mock` or `live`) |
   | `CORS_ORIGIN` | `https://*.vercel.app` | Allows your Vercel frontend |

5. Click **Create Web Service**.
6. Once deployed, note your service URL (e.g., `https://bhumidrishti-api.onrender.com`).
7. Verify health: Visit `https://bhumidrishti-api.onrender.com/health` in your browser (should return `status: "UP"`).

### Step 3: Seed the Database on Render
In your Render Dashboard:
1. Go to your `bhumidrishti-api` service → Click **Shell** (Terminal tab).
2. Run:
   ```bash
   npm run seed
   ```
   This will initialize your remote Atlas database with 70 cadastral records, users, and system configs!

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Import Project to Vercel
1. Go to [Vercel Dashboard](https://vercel.com) and click **Add New…** → **Project**.
2. Select your BhumiDrishti Git repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `client` (or leave as root; `vercel.json` will handle either).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 2: Set Environment Variable
Under **Environment Variables**, add:
- **Key**: `VITE_API_URL`
- **Value**: `https://<your-render-app>.onrender.com/api/v1` *(Make sure to include `/api/v1`)*

### Step 3: Deploy
1. Click **Deploy**.
2. Vercel will bundle the Vite React app in under 30 seconds and provide your live URL (e.g. `https://bhumidrishti.vercel.app`).
3. SPA routing, page refreshes, and deep links (`/analytics`, `/records`, `/verification-workspace`, etc.) are automatically handled by the pre-configured `client/vercel.json`.

---

## Part 3: Verification After Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Log in using any demo account:
   - **District Officer**: `district.pune@bhumidrishti.gov.in` / `District@123`
   - **Verifier**: `verifier.pune@bhumidrishti.gov.in` / `Verifier@123`
   - **Super Admin**: `admin@bhumidrishti.gov.in` / `Admin@123`
3. Navigate to **Analytics**, **Records**, **GIS Map**, and **Verification Workspace** to verify live connection to Render & Atlas!

# 🚀 Complete Zero-Cost ($0.00) Deployment Guide

This guide will walk you through hosting the entire **AI Travel Agent** platform live on the internet **100% free forever** with no credit card required.

---

## 🏗️ Architecture & Zero-Cost Breakdown

| Component | Free Host | Plan | Monthly Cost |
| :--- | :--- | :--- | :--- |
| **Frontend** | [Vercel](https://vercel.com) | Hobby (Global Edge CDN, SSL, CI/CD) | **$0.00** |
| **Backend** | [Render](https://render.com) | Free Web Service (FastAPI / Uvicorn) | **$0.00** |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/atlas) | M0 Sandbox (512 MB, Cloud Replica Set) | **$0.00** |
| **AI LLM** | [Google AI Studio](https://aistudio.google.com) | Gemini 2.0 Flash / 1.5 Flash (15 RPM free) | **$0.00** |
| **Weather** | [OpenWeatherMap](https://openweathermap.org) | Free OneCall / Current (1,000 calls/day) | **$0.00** |
| **Routing** | [OpenRouteService](https://openrouteservice.org) | Free Tier (2,000 requests/day) | **$0.00** |
| **Total** | | | **$0.00 / month** |

---

## 📋 Prerequisites
1. A free [GitHub](https://github.com) account.
2. Push your project code to a GitHub repository:
   ```bash
   git add .
   git commit -m "feat: optimized ai travel agent with public sharing & calendar sync"
   git push origin main
   ```

---

## Step 1: Free Cloud Database (MongoDB Atlas) ⏱️ 3 Minutes

1. Sign up for free at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Choose **Create a Deployment** and select the **M0 Free** cluster tier (AWS or Google Cloud, nearest region).
3. Under **Security Quickstart**:
   - Create a database user (e.g., username `travel_admin` and set a secure password).
   - Under **Where would you like to connect from?**, choose **Allow Access from Anywhere** (`0.0.0.0/0`).
4. Click **Create User** and **Finish and Close**.
5. Go to **Database** -> click **Connect** -> select **Drivers** (Python).
6. Copy your connection string URI:
   ```text
   mongodb+srv://travel_admin:<password>@cluster0.abcde.mongodb.net/ai_travel_agent?retryWrites=true&w=majority
   ```
   *(Replace `<password>` with your database user password).*

---

## Step 2: Free Backend Deployment (Render.com) ⏱️ 4 Minutes

1. Sign up for free at [render.com](https://render.com) using your GitHub account.
2. In the Render Dashboard, click **New +** -> **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your repository.
4. Fill in the deployment settings:
   - **Name**: `ai-travel-backend` (or your choice)
   - **Region**: Closest to your database region (e.g. Frankfurt, Oregon, Singapore)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
5. Scroll down to **Environment Variables** and add:

| Key | Value |
| :--- | :--- |
| `PYTHON_VERSION` | `3.11.9` |
| `MONGODB_URL` | Your MongoDB Atlas connection URI from Step 1 |
| `DATABASE_NAME` | `ai_travel_agent` |
| `SECRET_KEY` | Any random 32-character string (e.g., `4f9b8c2d1e0a7f5b3c8e1d2a4f6b8c0e`) |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `120` |
| `GEMINI_API_KEY` | Your Google Gemini API Key from [aistudio.google.com](https://aistudio.google.com) |
| `GEMINI_MODEL` | `gemini-2.0-flash` |
| `OPENWEATHER_API_KEY` | Your OpenWeatherMap API Key |
| `OPENROUTESERVICE_API_KEY` | Your OpenRouteService API Key |
| `FRONTEND_ORIGINS` | `*` |

6. Click **Deploy Web Service**.
7. Once deployed, Render will provide a free HTTPS URL, for example:
   ```text
   https://ai-travel-backend.onrender.com
   ```
8. Verify backend is live by opening:
   `https://ai-travel-backend.onrender.com/api/health`
   You should receive: `{"status": "ok", "api": "AI Travel Agent API", "mongodb": true}`.

---

## Step 3: Free Frontend Deployment (Vercel) ⏱️ 3 Minutes

1. Sign up for free at [vercel.com](https://vercel.com) using GitHub.
2. In the Vercel Dashboard, click **Add New...** -> **Project**.
3. Select your GitHub repository and click **Import**.
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click `Edit` and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables** and add:

| Key | Value |
| :--- | :--- |
| `VITE_API_URL` | `https://ai-travel-backend.onrender.com/api` (Replace with your Render backend URL from Step 2) |

6. Click **Deploy**.
7. In ~30 seconds, your site will be live at:
   ```text
   https://your-project-name.vercel.app
   ```
8. The provided `frontend/vercel.json` automatically takes care of Single Page App (SPA) client-side routing so refreshing `/dashboard`, `/plan`, or `/trips/share/:id` will never return 404!

---

## Step 4: Verification & Smoke Test

1. Visit your live Vercel URL: `https://your-project-name.vercel.app`.
2. Register a new user account.
3. Plan a new trip:
   - Try the **1-click dream templates** (e.g. Bali, Tokyo, Rome).
   - Click **Generate AI Itinerary**.
4. Test new features:
   - **Public Sharing**: Click **Share Trip** and open the link in an incognito window without logging in.
   - **Calendar Export**: Click **Add to Calendar (.ics)** and import into Google or Apple Calendar.
   - **PDF Export**: Download and view the PDF report.
   - **Activity Tracker**: Check off activities on the itinerary and watch the progress bar update.
   - **Live Booking**: Click Google Flights, Skyscanner, or Booking.com directly from the transport tab.

---

## 💡 Pro-Tip: Keeping Render's Free Backend Always Awake

Free web services on Render go to sleep after 15 minutes of inactivity and take ~30-40 seconds to spin up on cold requests.

To keep your app responding instantly 24/7 at **$0 cost**:
1. Go to [cron-job.org](https://cron-job.org) or [uptimerobot.com](https://uptimerobot.com) (both 100% free).
2. Create a ping monitor:
   - **URL**: `https://ai-travel-backend.onrender.com/api/health`
   - **Interval**: Every 10 minutes
3. This keeps your backend warm 24/7 without ever paying a penny!

---

## 🎉 You're Live!
Your full-stack AI Travel Agent is now running in production at **$0.00 / month**!

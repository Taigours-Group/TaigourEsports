# Taigour E-Sports 3.0 Web Platform

Welcome to the **Taigour E-Sports 3.0 Web** repository! This document explains the purpose of the project, how its architecture works, and how a new developer can quickly start contributing to the codebase.

---

## 🎯 Why We Made This Project
Taigour E-Sports is Nepal's premier esports tournament platform. We built this platform to provide a seamless, premium, and reliable experience for gamers across the region.
The core goals are:
- Allow users to effortlessly browse and register for large-scale gaming tournaments (e.g., PUBG, Free Fire).
- Provide a visually stunning UI with modern glassmorphism, animations, and premium aesthetics.
- Offer secure wallets, user profiles, live leaderboards, and real-time streaming integrations.
- Handle high-traffic events using a scalable backend queue system, ensuring 200+ concurrent registrations don't crash the database.

---

## 🏗 Architecture & Tech Stack

This project is a decoupled Full-Stack Web Application relying on the following stack:

- **Frontend:** React.js (Vite), Tailwind CSS, Framer Motion (for dynamic UI animations), and React Router DOM.
- **Backend:** Node.js with Express.js.
- **Database / Auth / Storage:** Supabase (PostgreSQL, Supabase Auth, Supabase Storage).
- **Deployment Strategy:** 
  - Frontend built and served as static files (`dist`) through Express.
  - Backend deployed as a web service binding to `0.0.0.0:PORT`.
  - Supabase handles persistent database states remotely.

### High-Level Workflows

#### 1. Tournament Registration (Queue-Based System)
To handle burst traffic gracefully, registration implements a **Queue-Based Polling System**:
1. User clicks "Register" and submits team/player files.
2. Images are immediately uploaded directly to Supabase Storage by the client.
3. The client hits the `/api/team-register` Node.js endpoint with the file URLs and team data.
4. Instead of hitting the DB, the server places the request in an **In-Memory Queue** and returns a `ticket_id` to the client.
5. A background async worker processes the queue sequentially, preventing race conditions or slot overflows in the database.
6. The client polls `/api/registration-status/:ticket_id` to show a real-time UI ("In Queue" -> "Processing" -> "Success").

#### 2. Performance & Security
- **Caching**: Public read-heavy API endpoints (`/api/tournaments`, `/api/leaderboard`, `/api/streams`) are cached in memory for 60 seconds.
- **Rate Limiting**: Global requests are limited to 300 per 15 minutes. Registration is strictly limited to 5 attempts per IP per 10 minutes to prevent abuse.
- **Content Security**: Helmet is configured to allow `iframe` embedding (e.g., Twitch/YouTube streams) while restricting malicious origins.

---

## 💻 API Reference

Below are the primary backend endpoints available in `server.js`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tournaments` | GET | Fetches all available tournaments (Cached 60s). |
| `/api/leaderboard` | GET | Fetches top teams and their points (Cached 60s). |
| `/api/streams` | GET | Fetches active live streams (Cached 60s). |
| `/api/team-register` | POST | Submits a team registration to the Queue. Returns a `ticket_id`. |
| `/api/registration-status/:ticket_id` | GET | Returns the real-time status of a queued registration. |
| `/api/purchase-request` | POST | Submits a wallet top-up or membership purchase request. |

*(Note: Admin endpoints and stream interaction APIs are protected by rate limits and Role-Based Access Control).*

---

## 🛠 How to Run Locally

### 1. Prerequisites
- **Node.js**: v18+ recommended.
- **Supabase**: A Supabase project with the provided `schema.sql` (found in `supabase/schema.sql`) executed in its SQL editor.

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
PORT=10000
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
ADMIN_JWT_SECRET=your_jwt_secret
ADMIN_PASSWORD=your_secure_admin_key
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Start Development Server
This project uses `concurrently` to run both the Vite client and Express server simultaneously.
```bash
npm install
npm run dev
```
- The backend will start on `http://localhost:10000`.
- The Vite frontend will start on `http://localhost:3000` and proxy API calls to the backend.

### 4. Build for Production
```bash
npm run build
npm run server
```
*In production, Express automatically serves the static Vite build from the `dist/` directory.*

---

## 🗂 Directory Structure
- `/components`: Reusable UI elements (cards, forms, Modals).
- `/pages`: Full-page views tied to specific routes.
- `/services`: Abstractions for Supabase DB interactions (`dbService.js`) and API calls.
- `/public`: Static public assets.
- `server.js`: The Express backend handling routing, queues, rate limiting, and security.
- `supabase/schema.sql`: The consolidated SQL file to initialize the entire database schema on a fresh Supabase instance.

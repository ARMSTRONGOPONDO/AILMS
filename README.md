# AI-Powered Learning Management System (AI-LMS)

A robust, multimodal LMS built with Next.js 14, MongoDB, and Google Gemini AI.

## 🚀 Features

- **Multimodal Lessons:** Support for Text, PDF, DOCX, and Video (with AI summaries).
- **AI-Powered Quiz Generator:** Tutors can auto-generate and edit multiple-choice quizzes from lesson content.
- **Academic AI Tutor:** Context-aware, persistent chatbot that helps students understand course material.
- **Smart Dashboards:**
  - **Student:** Track progress, continue learning, and see quiz performance.
  - **Tutor:** Monitor class performance, identify "at-risk" students, and manage course content.
  - **Admin:** System-wide overview and user management.
- **Notification System:** Real-time (polling) alerts for enrollments, quiz submissions, and new content.
- **Secure Auth:** Role-based access control with NextAuth and bcryptjs hashing.

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** MongoDB (Mongoose ORM)
- **AI:** Google Gemini API
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Validation:** Zod

## 📦 Run Locally

### 1) Prerequisites

- Node.js 18+ (or 20+ recommended)
- npm 9+
- MongoDB running locally (default: `mongodb://localhost:27017`)
- A valid Google Gemini API key

### 2) Clone and install

```bash
git clone https://github.com/ARMSTRONGOPONDO/AILMS.git
cd AILMS
npm install
```

### 3) Configure environment variables

Create `.env.local` in the project root:

```env
MONGODB_URI=mongodb://localhost:27017/ai_lms
NEXTAUTH_SECRET=replace_with_a_long_random_secret
GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_GRADING_MODEL=gemini-flash-latest
GEMINI_TEST_MODEL=gemini-flash-latest
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
MISTRAL_API_KEY=your_mistral_api_key
SITE_URL=http://localhost:3000
```

Notes:
- In development, `NEXTAUTH_URL` is set automatically by the custom dev launcher (`scripts/dev.js`) to match the selected port.
- For production, always set `NEXTAUTH_URL` to your deployed domain (for example `https://yourdomain.com`).
- `GROQ_API_KEY`, `OPENROUTER_API_KEY`, and `MISTRAL_API_KEY` are optional fallback providers; include them if you want multi-provider AI failover.

### 4) Start MongoDB

If you do not have MongoDB installed yet:

- MongoDB Community Server (database): [Download](https://www.mongodb.com/try/download/community)
- MongoDB Compass (GUI): [Download](https://www.mongodb.com/try/download/compass)

Windows quick setup:
- Install MongoDB Community Server and select the option to run MongoDB as a Windows Service.
- Install MongoDB Compass, open it, and connect to `mongodb://localhost:27017` to verify your local server is running.

If MongoDB is installed as a service (Windows PowerShell as Admin):

```powershell
Start-Service MongoDB
Get-Service MongoDB
```

You should see `Status: Running` before starting the app.

### 5) (Optional) Seed sample data

```bash
npx tsx src/utils/seed.ts
```

### 6) Start the app

```bash
npm run dev
```

The app uses dynamic port selection in development (starts from `3000` and picks the next free port automatically).  
Use the URL printed in the terminal, for example:

- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:3002`

### 7) Login / access

- Open `/login` and sign in with an existing user.
- If you seeded data, use seeded credentials.
- If login fails with `401` + DB connection errors, check that MongoDB is running and `MONGODB_URI` is correct.

## 🏗️ Project Structure

- `/src/app`: Next.js App Router (Pages & API Routes)
- `/src/components`: Reusable UI components
- `/src/hooks`: Custom React hooks
- `/src/lib`: Database, AI, and utility wrappers
- `/src/models`: Mongoose database schemas
- `/src/utils`: Helper functions (migration, seeding, sanitization)

## 🛡️ Production Readiness

- **Standardized API Handling:** Integrated `apiHandler` for consistent error responses.
- **Input Validation:** Strict Zod schemas for all critical API inputs.
- **Security:** In-app HTML sanitization and auth rate-limiting.
- **Performance:** Optimized image loading and lazy loading of non-critical assets.
- **Global Error Handling:** Custom `error.tsx` and Error Boundary support.

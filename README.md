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

## 📦 Setup Instructions

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/ai_lms
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   GEMINI_API_KEY=your_google_gemini_api_key
   ```
4. **Seed the database (Optional):**
   ```bash
   npx tsx src/utils/seed.ts
   ```
5. **Run the development server:**
   ```bash
   npm run dev
   ```

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

# TaskFlow — Task Manager MVP

A responsive task manager built with **Next.js + TypeScript**, designed for GitHub and Vercel. Create tasks, set start/due dates, assign priority and status, update progress, and keep a timestamped progress-update history.

## Included
- Create, edit and delete tasks
- Start date, due date, priority and status
- Progress tracking from 0–100%
- Timestamped progress notes on each task
- Dashboard totals and average progress
- Search and status filters
- Responsive desktop/mobile layout
- Demo mode using browser local storage
- Optional Supabase authentication + cloud database with per-user Row Level Security

## Run locally
1. Install Node.js 20 or later.
2. Extract this ZIP and open the folder in a terminal.
3. Run:
   ```bash
   npm install
   npm run dev
   ```
4. Open http://localhost:3000

Without Supabase environment variables the app starts in **demo mode**. Demo tasks are stored only in that browser; they are not synced to other devices.

## Enable cloud sync (recommended before deployment)
1. Create a project at https://supabase.com.
2. In Supabase, open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it.
3. In Supabase, open **Project Settings → API** and copy the Project URL and anon/public key.
4. Copy `.env.example` to `.env.local`, then fill in:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   ```
5. In Supabase **Authentication → URL Configuration**, add your local URL (`http://localhost:3000`) to the allowed redirect URLs.
6. Restart `npm run dev`. Create an account from the sign-in screen.

The app uses Supabase Auth and Row Level Security. Each signed-in user can access only their own tasks and associated updates. Never put a Supabase `service_role` key in this app or in a `NEXT_PUBLIC_` variable.

## Deploy with GitHub + Vercel
1. Create a new GitHub repository.
2. Extract the ZIP and push the project files:
   ```bash
   git init
   git add .
   git commit -m "Initial TaskFlow app"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```
3. Sign in to https://vercel.com and choose **Add New → Project**.
4. Import the GitHub repository. Vercel detects Next.js automatically.
5. In Vercel **Project → Settings → Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Deploy. In Supabase Authentication → URL Configuration, add your Vercel domain (for example `https://your-app.vercel.app`) to the allowed redirect URLs.

After pushing future changes to the connected GitHub branch, Vercel will automatically redeploy.

## Notes / next improvements
- This is a practical MVP, not a full project-management suite.
- Email notifications, recurring reminders, task assignment, team workspaces, file attachments and calendar integrations are not included yet.
- For production, configure Supabase email confirmation and SMTP, backups, and your preferred password/security policies.

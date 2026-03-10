# Dental College Management Portal

A comprehensive portal for dental colleges featuring distinct teacher (Admin) and student dashboards.

## Features

- **Teacher Dashboard (Admin)**:
  - Class management (shared across all teachers).
  - Student progress tracking and portal access management.
  - Task and Quiz assignment with automated sorting (newest first).
  - Marks management with CSV export capabilities.
  - Global "Assign Task of the Day" system.

- **Student Dashboard**:
  - Daily Task/Quest tracking.
  - Gamified progress with XP, Levels, and Streaks.
  - Course content and assignment management.
  - Real-time notifications for grades and new tasks.
  - Redesigned profile with deep performance analytics.

- **Technical Stack**:
  - **Frontend**: React (Vite) with Tailwind CSS and Shadcn UI.
  - **Backend**: Supabase Edge Functions (Hono/Deno).
  - **Database**: Supabase Auth + Deno KV for rapid state management.
  - **Deployment**: Vercel (Frontend) and Supabase (Functions).

## Recent Changes

- **Fixed Student Dashboard Layout**: Resolved issue where main content was hidden behind sidebar by:
  - Removed `w-full` constraint from flex container to prevent width conflicts
  - Updated sidebar height to use `lg:h-full` on desktop instead of `lg:h-auto`
  - Changed main content area to use `min-w-0` for proper flex behavior and preventing content overlap
  - Now both sidebar and main screen are properly visible side-by-side on desktop
- Redesigned Student Profile to match Admin Settings aesthetic.
- Fixed CORS issues in Edge Functions.
- Implemented shared classes logic using Deno KV prefix scanning.
- Unified "Quest" terminology to "Task" for better UX.
- Optimized student list fetching for mobile performance.

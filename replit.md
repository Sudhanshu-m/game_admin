# Dental College Portal - Admin Panel for Teachers

## Overview
A React-based web application serving as a portal for a dental college. It provides two main portals:
- **Admin Portal** - For teachers and administrators to manage student records, marks, assignments, and tasks
- **Student Portal** - For dental college students to view grades, track experience points, view tasks, and receive notifications

## Tech Stack
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS (via index.css)
- **UI Components**: Radix UI primitives + shadcn/ui pattern
- **Backend/Database**: Supabase (external service)
- **Charts**: Recharts

## Project Structure
```
├── index.html          # Entry HTML
├── vite.config.ts      # Vite configuration (port 5000, host 0.0.0.0)
├── tsconfig.json       # TypeScript config
├── package.json        # Dependencies
├── src/
│   ├── main.tsx        # App entry point
│   ├── App.tsx         # Main app with routing logic
│   ├── StudentApp.tsx  # Student portal app
│   ├── index.css       # Global styles (Tailwind)
│   ├── components/     # React components
│   │   ├── ui/         # Reusable UI components (shadcn/ui)
│   │   ├── figma/      # Figma-derived components
│   │   └── *.tsx       # Feature components
│   ├── supabase/       # Supabase functions
│   ├── utils/          # Utility functions
│   └── styles/         # Additional styles
└── build/              # Production build output
```

## Running
- Development: `npm run dev` (runs on port 5000)
- Build: `npm run build` (outputs to `build/`)

## Deployment
- Static deployment using the `build` directory

## Recent Changes
- 2026-02-07: Initial Replit setup - configured Vite for port 5000, host 0.0.0.0, allowedHosts

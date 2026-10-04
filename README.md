# Daywell — Personal command center

Version 1 is a tablet-first Today dashboard built with Next.js App Router, TypeScript, Tailwind CSS 4, and Lucide icons. No authentication, database, AI, or external integrations are included.

## Run locally

Requires Node.js 20.9+ and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. To use your Android tablet on the same Wi-Fi, open `http://<your-computer-LAN-IP>:3000`. Your firewall must allow that connection. The development server listens on all interfaces; use a trusted network.

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

## Architecture

- `app/`: App Router pages, root layout, metadata, global responsive styles, and web app manifest.
- `app/[section]/`: validated routes for Tasks, Work, Fitness, Content, Projects, Money, Home, and Journal.
- `components/app-shell.tsx`: responsive navigation, theme controls, shared mock state, and Quick Capture.
- `components/today-dashboard.tsx`: greeting, progress, current focus, next task, priorities, energy, and timeline.
- `components/task-components.tsx`: reusable panels, category tags, task rows, and completion controls.
- `components/section-page.tsx`: lightweight navigation destinations, including filtered task lists.
- `lib/tasks.ts`: typed task contract, category definitions, navigation, and realistic mock-data factory.
- `public/`: application icon.

The desktop and tablet sidebar gives way to bottom navigation and a full menu on phones. Landscape tablets use two dashboard columns; narrower tablets stack the main cards. CSS variables provide dark and light themes. Touch controls generally have 44px targets, keyboard focus indicators, and accessible names.

## V1 behavior

Tasks are generated using the browser's local date. The greeting refreshes every 30 seconds. Task completion updates progress, priorities, and focus immediately. Right Now is the earliest unfinished scheduled task; Up Next is the following task. These are an actionable queue, not a live calendar or time-tracking system. Unscheduled captures appear after scheduled tasks. Top priorities are the three seeded high-priority tasks.

Quick Capture adds a task for today with title, optional description, category, priority, optional time, and estimated duration. Task and energy state remain available across client-side navigation. All state is in memory and resets on a page refresh. Tasks are reseeded when the local date changes. Theme is also session-only. Energy selection displays a pace reminder; it does not automatically reschedule tasks. Journal is an explicit future-version placeholder.

The task model contains `id`, `title`, `description`, `category`, `priority`, `completed`, `scheduledDate`, `scheduledTime`, `estimatedMinutes`, `recurring`, and `createdAt`. A recurring flag is displayed but does not generate future occurrences.

## PWA and future development

The manifest, standalone display mode, theme metadata, and scalable icon lay the groundwork for a PWA. This version does **not** include a service worker, offline caching, push notifications, or guaranteed browser installability. Production PWA features require HTTPS, a suitable caching strategy, and device testing; Raster 192px/512px and Apple touch icons are included for broader device support.

For Supabase later, move task loading and mutations behind a data-access layer, add authentication and row-level security, and replace the mock factory without changing the task presentation components. No secrets or integration scaffolding are required for this version.

For future Vercel deployment, import this application directory as the project root, use the Next.js preset, and retain the default `npm run build` command. No environment variables are required. Deployment is intentionally deferred.

## Verification

Lint, TypeScript checking, and the production build pass. Browser checks cover task completion, progress and focus updates, Quick Capture, energy selection, light mode, and Tasks navigation. Layouts were inspected at 390px phone, 800px portrait tablet, and 1024px landscape tablet widths without horizontal overflow. These are browser checks, not physical Lenovo/iPhone device tests.

The production dependency audit reports zero vulnerabilities. The development-only Next.js ESLint dependency chain currently reports a braces advisory (GHSA-vfj7-8cjw-p6xm); the current published braces version has no patched release. This does not affect the deployed runtime. Recheck when updating lint tooling.

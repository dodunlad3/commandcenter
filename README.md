# Daywell — Personal command center

Build 2 adds persistent task management to the existing tablet-first Today dashboard. The Next.js App Router, TypeScript, Tailwind CSS 4, Lucide icons, navigation, dark/light themes, and card design are preserved. No authentication, Supabase, AI, integrations, notifications, service workers, or automatic recurring-task generation are included.

## Run locally

Requires Node.js 20.9+ and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000 or http://127.0.0.1:3000. If port 3000 is occupied, Next.js prints the alternate development port. For the production server, select an available port explicitly:

```sh
npm run build
npm start -- --port 3002
```

To use the Lenovo Android tablet on the same Wi-Fi, open `http://<computer-LAN-IP>:3000`. Allow that port through the firewall on a trusted network. For development, add your computer's exact LAN IP/hostname to `allowedDevOrigins` in `next.config.ts` and restart the server. The production server does not require this development setting.

```sh
npm run test
npm run typecheck
npm run lint
npm run build
```

## Build 2 behavior

- Quick Capture creates tasks with title, description, category, priority, scheduled date, optional time, and estimated minutes.
- Tap a task's title or row to open details from Today, Tasks, or any category page. Details include all task fields, recurring status, completion status, and creation timestamp.
- Edit uses the same form and modal styling as Quick Capture. Edits retain the task's ID, creation timestamp, completion, and recurring flag.
- Delete asks for confirmation, with **Keep task** focused first. Deleted tasks stay deleted after refresh.
- Complete/reopen changes persist and immediately update all views.
- Tasks offers All tasks, Today, Completed, and Upcoming views, plus category, priority, and completion filters. Filters combine with the selected view; Reset filters returns to All tasks. Upcoming means unfinished tasks scheduled strictly after today. All tasks includes past tasks.
- Scheduled sorting orders date, then time ascending; tasks without times follow timed tasks on the same date. Priority sorting uses high, medium, low; creation-date sorting shows newest first. Deterministic tie breakers keep the lists stable.
- Today uses the browser's local calendar date. Only tasks scheduled for that date count toward progress, priorities, Right Now, Up Next, and the timeline. Right Now is the earliest unfinished task in today's queue; Up Next follows it. Midnight updates the visible day without replacing saved tasks. The clock refreshes every 30 seconds.
- Top 3 priorities shows up to three high-priority tasks scheduled for today. Recurring is informational; no future occurrences are generated.
- Category pages show all saved tasks in that category, with dates and times. Journal remains a future-build placeholder.
- Energy, theme, and task filters remain session-only preferences.

Validation requires a trimmed title of 1–160 characters, description of at most 4,000 characters, a known category/priority, a real calendar date, an optional valid 24-hour time, and whole-number duration of 1–1,440 minutes. Native form constraints and shared data-layer validation both apply.

## Persistence architecture

`lib/task-store.ts` is the only module that accesses localStorage. Its `TaskStore` interface exposes asynchronous `load`, `create`, `update`, `remove`, `toggle`, and `subscribe` methods. The current browser adapter reads the latest durable collection before each mutation, validates the data, and writes before reporting success. The provider updates its task list only after the write succeeds; a failed write never presents an unsaved change as saved. An injected storage getter enables deterministic tests without a browser.

The storage key is `daywell.tasks.v1`, containing `{ version: 1, tasks: Task[] }`. On first load **only when the key is absent**, the existing mock factory seeds eight sample tasks using the local date. Existing data, including an empty array after deleting every task, is preserved across refreshes, browser restarts, and date changes. Invalid JSON, duplicate IDs, malformed records, and unsupported schema versions are reported without overwriting the stored value. Storage-access or quota errors show an error and a Reload tasks button. Failed forms stay open with their values intact. No automatic data reset/recovery is attempted.

`components/task-provider.tsx` loads storage after mounting, making the server output and first browser render consistent. It owns shared task state, the live clock, and modal selection. The root layout retains the provider across client-side navigation. Other browser tabs on the same origin refresh via storage events. This is simple local persistence, not a transactional multi-tab database; truly simultaneous writes from separate tabs can still use last-write-wins behavior.

Storage is specific to the **browser profile, device, and origin (protocol + hostname + port)**. `localhost`, `127.0.0.1`, LAN addresses, different ports, and a future deployed URL each have separate collections. Closing/reopening a normal browser preserves tasks, but clearing site data or ending a private-browsing session can erase them. Local storage is not a backup or cross-device sync. Use one consistent URL for your daily workflow. Build 1's in-memory changes cannot be migrated after its page is gone because they were never saved.

To introduce Supabase later, implement `TaskStore` with authenticated database operations and subscriptions, then swap the provider's adapter. The task forms, details, dashboard, and task manager continue to use the same context/actions. Schema migrations should be explicit and preserve existing local data.

## Folder structure

- `app/`: App Router routes, layout, metadata, manifest, and responsive theme styles.
- `components/app-shell.tsx`: preserved sidebar, phone navigation, theme toggle, storage error banner, and shared modal host.
- `components/task-provider.tsx`: shared task/clock context and storage actions.
- `components/task-dialogs.tsx`: accessible native dialog, reusable capture/edit form, task details, and deletion confirmation.
- `components/task-manager.tsx`: task views, filters, and sorting controls.
- `components/task-components.tsx`: panels, category tags, clickable task rows, completion controls.
- `components/today-dashboard.tsx`: preserved dashboard, now driven by persisted tasks scheduled for today.
- `components/section-page.tsx`: category destinations and task-manager routing.
- `lib/tasks.ts`: centralized Task/TaskInput types, mock factory, validation, local-date formatting, and filter/sort utilities.
- `lib/task-store.ts`: versioned browser-storage adapter and replaceable persistence interface.
- `tests/task-store.test.mjs`: Node's built-in test runner covers persistence, mutations, validation, filtering, and failure cases. `npm run test` compiles only the library files into ignored `.task-tests/` before running the tests.
- `public/`: SVG, 192px/512px PNG, and Apple touch icons.

The existing portrait/landscape tablet and phone breakpoints are retained. Task controls use large touch targets, labeled native selects, keyboard focus states, native modal focus containment, Escape dismissal, and focus restoration on close. Editing and capture autofocus the title; deletion confirmation autofocuses the safe choice.

## Verification

Run the commands above before committing. The storage suite checks first-run-only initialization, empty collections, create/edit/delete/complete/reopen persistence, rejected input, corrupt/unsupported records, failed writes, independent adapters, SSR-safe construction, date filtering, and sorting. Browser verification covers capture, refresh persistence, task details, edit/reschedule, completion/reopen, deletion confirmation/cancellation, deletion persistence, combined filters, sorting, and phone/tablet layouts. These are browser checks, not physical Lenovo or iPhone tests.

## PWA and future deployment

The existing manifest, standalone display mode, theme metadata, and icons provide PWA groundwork. Offline caching, service workers, push notifications, and guaranteed installability remain deferred. Local task persistence does not make the application's code available offline.

For Vercel later, import this application directory as the project root and use the Next.js preset with `npm run build`. No environment variables are required in Build 2. Deployment is deferred.

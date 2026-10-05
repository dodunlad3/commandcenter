# Daywell — Personal command center

Build 3.5 adds alternating routines and persistent appearance settings alongside daily scheduling and weekly routines to the existing tablet-first Today dashboard and persistent task manager. The Next.js App Router, TypeScript, Tailwind CSS 4, Lucide icons, navigation, dark/light themes, and card design are preserved. No authentication, Supabase, AI, integrations, notifications, service workers, or automatic recurring-task generation are included.

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

## Task management (preserved from Build 2)

- Quick Capture creates tasks with title, description, category, priority, scheduled date, optional time, and estimated minutes.
- Tap a task's title or row to open details from Today, Tasks, or any category page. Details include all task fields, recurring status, completion status, and creation timestamp.
- Edit uses the same form and modal styling as Quick Capture. Edits retain the task's ID, creation timestamp, completion, and recurring flag.
- Delete asks for confirmation, with **Keep task** focused first. Deleted tasks stay deleted after refresh.
- Complete/reopen changes persist and immediately update all views.
- Tasks offers All tasks, Today, Completed, and Upcoming views, plus category, priority, and completion filters. Filters combine with the selected view; Reset filters returns to All tasks. Upcoming means unfinished tasks scheduled strictly after today. All tasks includes past tasks.
- Scheduled sorting orders date, then time ascending; tasks without times follow timed tasks on the same date. Priority sorting uses high, medium, low; creation-date sorting shows newest first. Deterministic tie breakers keep the lists stable.
- Today uses the browser's local calendar date. Only tasks scheduled for that date count toward progress, priorities, and the task timeline. Time-aware Right Now and Up Next are described below. Midnight updates the visible day without replacing saved tasks. The clock refreshes every 30 seconds and on focus/visibility changes after the device wakes.
- Top 3 priorities shows up to three high-priority tasks scheduled for today. Recurring is informational; no future occurrences are generated.
- Category pages show all saved tasks in that category, with dates and times. Journal remains a future-build placeholder.
- Energy and task filters remain session-only preferences. Theme and accent now persist.

Validation requires a trimmed title of 1–160 characters, description of at most 4,000 characters, a known category/priority, a real calendar date, an optional valid 24-hour time, and whole-number duration of 1–1,440 minutes. Native form constraints and shared data-layer validation both apply.

## Build 3: daily scheduling and weekly routines

**Tasks are accomplishments; routines are time structure.** A commute or Work block is a ScheduleBlock, never a generated Task, and never counts toward task completion progress. Existing task records and the `daywell.tasks.v1` schema remain intact.

The new **Schedule** navigation destination (`/schedule`) has Weekly routine, Specific date, and Alternating routines views. All seven weekdays are visible as cards, with timed blocks sorted chronologically and untimed blocks in a separate Flexible area. Use a day's large + button to add a block, or tap a block to edit its title, description, category, timing, and start/end. Remove asks for confirmation with Keep block focused first. Flexible blocks have no start/end times. Timed blocks must end after they start on the same local day; represent overnight routines as separate blocks on the two weekdays. Overlapping routine blocks are allowed; open-window calculation merges occupied ranges. No drag-and-drop is needed.

First-run schedule defaults contain only:

- Monday–Friday: Commute to Work 6:00–7:00 AM, Work 7:00 AM–3:30 PM, Commute Home 3:30–4:30 PM, all in work.
- Monday/Wednesday/Friday: flexible Full-body workout.
- Tuesday/Thursday: flexible Run — minimum 1.5 miles.
- Saturday/Sunday: no blocks.

Every default is editable/removable. No meals, content, bedtime, weekends, or social plans are added to routine templates. Existing sample **tasks** remain available on first task-store initialization, independently of routine defaults.

### Date-only changes

**Edit today** switches Schedule to the current local date. Specific date also supports any valid date. Add creates a date-only block. Editing/removing a template block from a date view (or Today) first asks where the change applies: **this date only**, **the weekly routine**, or **the every-other-week routine** when one applies. The editor clearly labels the chosen scope. Editing a date-only addition stays date-only. Weekly editing loads the actual template values, so a one-day replacement is not accidentally promoted to the recurring routine.

Overrides contain additions, replacements keyed by routine block ID, and removed IDs. They are patches, not copied days: unrelated weekly updates flow through, while explicit date replacements/removals remain. Removing a weekly block removes its related patches; date additions stay. Reset date-only changes asks for confirmation before discarding that date's additions/edits/removals. Weekly edits apply wherever the template is calculated, including past dates without overrides; they are not historical snapshots.

### Time-aware Today

- Right Now chooses an unfinished task within its scheduled start + estimated-duration window, then an active timed routine. Otherwise it previews the next event with **Coming up**, or shows an open window.
- Start is inclusive; end is exclusive. If tasks overlap, the most recently started active task wins, with priority and ID breaking ties. Overlapping routines use the most recently started block. An active task may carry over midnight; it still belongs to its original date for task progress.
- Up Next compares the next unfinished timed task today with the next timed routine today. The earlier start wins; a tie favors the task. Completed, expired, and untimed tasks and flexible routines never masquerade as upcoming timed events. Tomorrow's events belong to tomorrow's view.
- Still open lists unfinished timed tasks whose estimated windows have ended, including earlier dates, with complete and details/edit/reschedule controls. It shows up to three and links to Tasks for the rest. Untimed tasks have no estimated start window and do not become overdue by this rule.
- The shape of your day merges timed tasks and timed routines chronologically, labels their kinds, highlights only active events, and puts flexible routines and untimed tasks below. Only today's tasks count toward daily progress; routine blocks have no completion state.
- Open space shows unoccupied ranges in the local day, without invented commitments. Schedule's expandable Open time uses routine gaps; Today's open space excludes both timed routines and task windows, including task windows carrying over midnight. Timeline gaps shorter than 15 minutes are omitted to reduce clutter.
- Low energy emphasizes high-priority untimed tasks and flexible fitness while de-emphasizing optional flexible items. Normal shows the standard day. Locked In suggests up to three unfinished untimed tasks scheduled today whose durations fit a remaining open window. These are optional duration-based suggestions, not task-to-routine assignments, and never move or delete data.
- A date change calculates the next weekday plus its override. No daily routine copies or task occurrences are generated, and previous tasks remain stored.

## Schedule persistence architecture

`lib/schedule.ts` centralizes ScheduleBlock, WeeklyRoutine, DateOverride, ScheduleData, validation, weekday/day resolution, flexible selectors, active/next routine selectors, and open-window calculation. `lib/agenda.ts` contains active/overdue/next task selectors, the combined timeline and Right Now/Up Next decisions, and non-destructive energy recommendations. `lib/date-time.ts` shares local date/time validation and formatting with tasks and routines; `lib/ids.ts` shares secure-context/LAN-compatible IDs.

`lib/schedule-store.ts` exposes asynchronous `load`, `create`, `update`, `remove`, `resetDate`, and `subscribe` behind ScheduleStore. Its browser adapter stores `{ version: 2, schedule: { routines, overrides, recurringOverrides } }` at `daywell.schedule.v1`. It reads the latest durable data before each mutation and saves before the provider publishes a successful change. First-run seeding occurs **only when the key is absent**. Empty routines stay empty. Invalid JSON, unsupported versions, invalid times/dates, duplicate IDs/weekdays/override dates, and malformed patches produce an error without silently overwriting saved data. Failed forms retain their values; the shell provides Reload schedule. No automatic reset is performed.

`components/schedule-provider.tsx` mounts storage after hydration and owns schedule state separately from tasks. The root layout preserves both providers across navigation; same-origin storage events refresh other tabs. A future Supabase adapter can implement ScheduleStore without changing the schedule forms or Today selectors. LocalStorage is still per browser/device/origin and uses last-write-wins across truly simultaneous tabs; it is not a backup or sync service.

## Persistence architecture

`lib/task-store.ts` is the only module that accesses task localStorage; schedule storage lives separately in `lib/schedule-store.ts`. Its `TaskStore` interface exposes asynchronous `load`, `create`, `update`, `remove`, `toggle`, and `subscribe` methods. The current browser adapter reads the latest durable collection before each mutation, validates the data, and writes before reporting success. The provider updates its task list only after the write succeeds; a failed write never presents an unsaved change as saved. An injected storage getter enables deterministic tests without a browser.

The storage key is `daywell.tasks.v1`, containing `{ version: 1, tasks: Task[] }`. On first load **only when the key is absent**, the existing mock factory seeds eight sample tasks using the local date. Existing data, including an empty array after deleting every task, is preserved across refreshes, browser restarts, and date changes. Invalid JSON, duplicate IDs, malformed records, and unsupported schema versions are reported without overwriting the stored value. Storage-access or quota errors show an error and a Reload tasks button. Failed forms stay open with their values intact. No automatic data reset/recovery is attempted.

`components/task-provider.tsx` loads storage after mounting, making the server output and first browser render consistent. It owns shared task state, the live clock, and modal selection. The root layout retains the provider across client-side navigation. Other browser tabs on the same origin refresh via storage events. This is simple local persistence, not a transactional multi-tab database; truly simultaneous writes from separate tabs can still use last-write-wins behavior.

Storage is specific to the **browser profile, device, and origin (protocol + hostname + port)**. `localhost`, `127.0.0.1`, LAN addresses, different ports, and a future deployed URL each have separate collections. Closing/reopening a normal browser preserves tasks, but clearing site data or ending a private-browsing session can erase them. Local storage is not a backup or cross-device sync. Use one consistent URL for your daily workflow. Build 1's in-memory changes cannot be migrated after its page is gone because they were never saved.

To introduce Supabase later, implement `TaskStore` with authenticated database operations and subscriptions, then swap the provider's adapter. The task forms, details, dashboard, and task manager continue to use the same context/actions. Schema migrations should be explicit and preserve existing local data.

## Folder structure

- `app/`: App Router routes, layout, metadata, manifest, and responsive theme styles.
- `components/app-shell.tsx`: preserved sidebar, phone navigation, theme toggle, storage error banner, and shared modal host.
- `components/task-provider.tsx`: shared task/clock context and storage actions.
- `components/modal.tsx`: shared native modal with Escape dismissal, focus containment, backdrop handling, and focus restoration.
- `components/task-dialogs.tsx`: reusable capture/edit form, task details, and deletion confirmation.
- `components/task-manager.tsx`: task views, filters, and sorting controls.
- `components/task-components.tsx`: panels, category tags, clickable task rows, completion controls.
- `components/today-dashboard.tsx`: preserved dashboard layout and task progress.
- `components/today-agenda.tsx`: time-aware cards, combined timeline, still-open tasks, and energy suggestions.
- `components/schedule-provider.tsx`, `schedule-page.tsx`, `schedule-dialogs.tsx`, `alternating-dialog.tsx`: independent schedule state, week/date/alternating views, and scoped editors.
- `components/settings-provider.tsx`, `settings-page.tsx`, `lib/settings.ts`, `settings-store.ts`: shared persisted appearance, selectable palettes, and prepaint application.
- `components/section-page.tsx`: category destinations and task-manager routing.
- `lib/tasks.ts`: centralized Task/TaskInput types, mock factory, validation, and filter/sort utilities.
- `lib/schedule.ts`, `schedule-store.ts`, `agenda.ts`, `date-time.ts`, `ids.ts`: routine domain, persistence, selectors, and shared utilities.
- `lib/task-store.ts`: versioned browser-storage adapter and replaceable persistence interface.
- `tests/task-store.test.mjs`, `tests/schedule.test.mjs`: Node's built-in test runner covers task/schedule persistence, mutations, overrides, time-aware selectors, validation, filtering, and failure cases. `npm run test` compiles only the library files into ignored `.task-tests/` before running the tests.
- `public/`: SVG, 192px/512px PNG, and Apple touch icons.

The existing portrait/landscape tablet and phone breakpoints are retained. Task controls use large touch targets, labeled native selects, keyboard focus states, native modal focus containment, Escape dismissal, and focus restoration on close. Editing and capture autofocus the title; deletion confirmation autofocuses the safe choice.

## Verification

Run the commands above before committing. The task and schedule suites check first-run-only initialization, empty collections, create/edit/delete/complete/reopen persistence, rejected input, corrupt/unsupported records, failed writes, independent adapters, SSR-safe construction, date filtering, sorting, weekly edits, date-only overrides, routine/task time windows, overdue detection, combined next events, flexible behavior, open-window merging, energy recommendations, and weekday/midnight resolution. Browser verification covers capture, refresh persistence, task details, edit/reschedule, completion/reopen, deletion confirmation/cancellation, deletion persistence, combined filters, sorting, and phone/tablet layouts. These are browser checks, not physical Lenovo or iPhone tests.

## PWA and future deployment

The existing manifest, standalone display mode, theme metadata, and icons provide PWA groundwork. Offline caching, service workers, push notifications, and guaranteed installability remain deferred. Local task persistence does not make the application's code available offline.

For Vercel later, import this application directory as the project root and use the Next.js preset with `npm run build`. No environment variables are required in Build 3.5. Deployment is deferred.

## Build 3.5: alternating routines

Schedule now includes **Alternating routines**. Choose Add alternating routine, give it a name and weekday, and choose a known occurrence as its anchor date. No remote Friday pattern is created automatically. Edit that version of the weekday to remove commutes or replace Work with Remote Work. Removed or replaced weekly blocks can be restored with Use weekly block. Name and anchor can be edited; changing weekday requires a new routine. Deletion confirms first.

Matching uses a signed calendar-day difference divisible by 14 and an exact weekday match. Dates before and after the anchor match; month/year boundaries and daylight saving changes do not affect the cycle. No ISO week parity or elapsed local timestamps are used. Each weekday allows one routine per alternating phase; overlapping rules in the same phase are rejected.

Resolution is **weekly routine → matching alternating routine → date-specific changes**. Specific date identifies the normal or alternating source and separately labels date-only changes. Editing an affected block offers explicit weekly, every-other-week, and date-only scopes, loading the actual values for that scope. Reset date-only changes returns to the repeating schedule, including any matching alternating routine. Removing an alternating routine restores weekly blocks and preserves explicit date edits, including edits to its added blocks.

### Safe schedule migration

The existing `daywell.schedule.v1` key is retained, but its envelope becomes version 2. A valid Build 3 version 1 record is copied exactly to `daywell.schedule.backup.v1` before migration. Existing routines and date patches are preserved, with `recurringOverrides: []`; no defaults replace user data. Migration runs once. If either write fails, the original version 1 record remains intact. Corrupt or unsupported data is reported and kept unchanged. Task storage is unaffected.

## Appearance settings

`/settings`, reached through the gear near the bottom of the sidebar or phone More menu, offers Dark/Light and six visual accent choices: Green (default), Blue, Purple, Red, Orange, and Yellow. Changes apply and save automatically. The sidebar theme shortcut shares the same state. Neutral surfaces and category colors retain their identity.

`lib/settings.ts` defines settings and both-theme palettes. Semantic accent, hover, foreground, soft, and border tokens drive buttons, navigation, selected controls, progress, agenda highlights, and focus states. Yellow uses dark text in dark mode and a deeper gold with white text in light mode. Palette tests verify normal-text contrast for buttons, hover states, and accent highlights in both themes.

`lib/settings-store.ts` owns `daywell.settings.v1`, validation, asynchronous load/update, and storage subscriptions. `components/settings-provider.tsx` supplies one shared source of truth. A read-only, validated head bootstrap sets root theme/accent attributes before painting; the provider hydrates consistently and loads the same record after mounting. Invalid records and failed writes are surfaced without overwriting saved preferences. Settings follow the same browser/device/origin persistence limits as tasks and schedules.

Additional tests in `tests/alternating.test.mjs` and `tests/settings.test.mjs` cover migration and failed writes, anchor/year/DST boundaries, precedence, rule CRUD, preserved weekly/date data, corrupt recurring records, settings persistence, prepaint validation, and palette contrast.

Production builds use Next.js’s supported Webpack builder (`next build --webpack`) because the restricted development environment prevents Turbopack’s internal CSS worker from binding a port. Application behavior and deployment remain standard Next.js.

Build 3.5 browser checks verified saved light/yellow preferences after refresh, the shared sidebar theme shortcut, alternating creation and block-edit persistence, matching/off-week source labels, and the three editing scopes loading the correct weekly values. Settings showed no horizontal overflow at 390px, 800px, 1024px, or 1440px, with no console errors. These checks use simulated viewports, not physical-device tests.

# Link Party — Review & Improvement Plan

GitHub issues derived from a full-app review conducted 2026-02-27.
Use the companion script `create-issues.sh` to file them all at once.

---

## A. Test Coverage Gaps

### 1. Add component tests for untested UI components

**Labels:** `test`, `coverage`

Only 3 of ~37 components have tests (~8% coverage). The following areas are completely untested:

- Modal components
- Profile components
- Notification components
- Landing page components
- Queue item components
- Party room UI components

**Acceptance criteria:**

- [ ] Each component group above has at least one test file
- [ ] Tests cover rendering, key user interactions, and edge states (empty, loading, error)

---

### 2. Add E2E tests for image upload, offline/sync, and keyboard navigation

**Labels:** `test`, `e2e`

Missing Playwright E2E scenarios:

- **Image upload flow** — select file, preview, upload, display in queue
- **Offline/sync** — disconnect, queue actions while offline, reconnect behavior
- **Accessibility/keyboard navigation** — tab order, focus management, screen reader basics

**Acceptance criteria:**

- [ ] E2E spec for image upload happy path
- [ ] E2E spec for offline indicator and reconnect
- [ ] E2E spec for keyboard-only navigation through core flows

---

### 3. Add unit tests for hooks: useImageUpload, useNotifications, useFocusTrap

**Labels:** `test`, `hooks`

These hooks have zero test coverage:

- `useImageUpload` — progress tracking, error handling, file validation
- `useNotifications` — permission request, subscription management
- `useFocusTrap` — focus cycling, escape key, mount/unmount cleanup

**Acceptance criteria:**

- [ ] Each hook has a dedicated `.test.ts` file
- [ ] Tests cover happy path, error states, and cleanup

---

### 4. Add tests for untested API routes

**Labels:** `test`, `api`

The following API routes have no test coverage:

- `party-members/leave`
- `invites/claim`
- `notifications` (CRUD)
- `cron/cleanup`
- `parties/friends-active`
- `parties/invite-friends`

**Acceptance criteria:**

- [ ] Each route has tests for success, auth failure, and validation errors
- [ ] Rate-limiting behavior tested where applicable

---

## B. Security Concerns

### 5. Fix RLS policy allowing anonymous read access to queue items

**Labels:** `security`, `database`

Queue items are readable by any anonymous user via an `OR auth.uid() IS NULL` bypass in the RLS policy. This was documented during initial development but never mitigated.

**Acceptance criteria:**

- [ ] New migration removes anonymous read access from `queue_items`
- [ ] RLS policy requires authenticated user + party membership for reads
- [ ] Existing functionality (TV mode, etc.) still works with updated policy

---

### 6. Replace in-memory rate limiting with a distributed solution

**Labels:** `security`, `infrastructure`

The current `rateLimit.ts` uses an in-memory `Map`. This breaks in Vercel serverless where each invocation is a separate instance — rate limits are never actually enforced across requests.

**Options:**

- Supabase table with `INSERT … ON CONFLICT` + expiry
- Upstash Redis (serverless-friendly)
- Vercel KV

**Acceptance criteria:**

- [ ] Rate limiting persists across serverless invocations
- [ ] Existing rate-limit call sites unchanged (swap implementation, not interface)

---

### 7. Add brute-force throttling on party join by code

**Labels:** `security`

Party join accepts a 6-character code with no per-code rate limiting. An attacker can enumerate valid codes by brute-forcing the join endpoint.

**Acceptance criteria:**

- [ ] Rate limit join attempts per IP and per code
- [ ] Exponential backoff or lockout after N failed attempts
- [ ] Failed attempts logged for monitoring

---

### 8. Fix CORS header inconsistency in edge function error responses

**Labels:** `security`, `edge-functions`

The Supabase edge function uses `Access-Control-Allow-Origin: *` on error responses while using origin-restricted headers on success responses. This inconsistency can leak error details to unauthorized origins.

**Acceptance criteria:**

- [ ] Error responses use the same origin-restricted CORS headers as success responses
- [ ] Shared helper function for CORS headers used in all response paths

---

### 9. Add per-code rate limiting to prevent party code enumeration

**Labels:** `security`

Even with general rate limiting, an attacker can slowly enumerate valid party codes. Per-code limiting tracks failed attempts against individual codes.

**Acceptance criteria:**

- [ ] Track failed join attempts per party code
- [ ] Temporarily lock a code after N consecutive failures
- [ ] Alert or log when lockout threshold is hit

---

## C. UX & Accessibility

### 10. Improve accessibility: focus-visible styles, keyboard drag-and-drop, non-color indicators

**Labels:** `accessibility`, `ux`

Current accessibility score is ~4/10. Key gaps:

- **No `focus-visible` styles** — keyboard users can't see what's focused
- **Drag-and-drop not keyboard-accessible** — `@dnd-kit` supports this but it's not wired up
- **Color-only status indicators** — no icons or text alternatives for color-blind users

**Acceptance criteria:**

- [ ] `focus-visible` ring on all interactive elements
- [ ] `@dnd-kit` keyboard sensors enabled (arrow keys to reorder, Enter/Space to grab)
- [ ] Status indicators include icons or text alongside color

---

### 11. Add offline queue buffering and sync-on-reconnect

**Labels:** `feature`, `offline`

Currently the app shows an offline indicator but does not buffer actions. Users lose any work done while disconnected.

**Acceptance criteria:**

- [ ] Queue actions (add, reorder, delete) buffered in IndexedDB/localStorage while offline
- [ ] Buffered actions replayed on reconnect using conflict resolution (`conflictResolver.ts`)
- [ ] User notified of sync result (success / conflicts)

---

### 12. Configure push notification delivery (APNs / FCM)

**Labels:** `feature`, `infrastructure`

Push notification infrastructure exists (tables, triggers, subscription UI) but no actual delivery is configured. Notifications are logged but never sent.

**Acceptance criteria:**

- [ ] FCM configured for web push (PWA)
- [ ] APNs configured for iOS (Capacitor)
- [ ] `notificationTriggers.ts` sends via the configured provider instead of just logging
- [ ] Unsubscribe / permission revocation handled gracefully

---

### 13. Enhance TV mode: auto-advance timer and queue count indicator

**Labels:** `feature`, `ux`

TV mode is manual-only — the host must click to advance. For passive use (e.g., a party slideshow) this is limiting.

**Acceptance criteria:**

- [ ] Optional auto-advance timer (configurable interval, default 30s)
- [ ] Queue count badge visible in TV mode (e.g., "3 of 12")
- [ ] Timer pause/resume control

---

### 14. Add loading skeletons for queue, members, and now-showing sections

**Labels:** `ux`, `polish`

Several sections flash empty or show a bare spinner on load. Skeleton placeholders improve perceived performance.

**Acceptance criteria:**

- [ ] Skeleton component for queue item list
- [ ] Skeleton component for member avatars/list
- [ ] Skeleton component for now-showing section
- [ ] Skeletons match the final layout dimensions to prevent layout shift

---

## D. Feature Opportunities

### 15. Add search and filter for the queue

**Labels:** `feature`, `ux`

As the queue grows, finding a specific item becomes difficult. Users need search and basic filtering.

**Acceptance criteria:**

- [ ] Text search across queue item titles and descriptions
- [ ] Filter by type (note, image, YouTube, link)
- [ ] Filter by submitter
- [ ] Search/filter UI does not interfere with drag-and-drop reordering

---

### 16. Add bulk operations: multi-select and bulk delete

**Labels:** `feature`, `ux`

Currently items can only be managed one at a time. Bulk operations are needed for queue cleanup.

**Acceptance criteria:**

- [ ] Multi-select mode (checkboxes or long-press on mobile)
- [ ] Bulk delete with confirmation
- [ ] Bulk move-to-top / move-to-bottom
- [ ] Select all / deselect all

---

### 17. Add party preview before joining

**Labels:** `feature`, `ux`

Users are asked to join a party with no visibility into what it is. A lightweight preview builds confidence.

**Acceptance criteria:**

- [ ] Preview shows party name, host name, member count, and queue count
- [ ] Preview accessible from the join page before entering the party code
- [ ] No sensitive content exposed (queue items not shown)

---

### 18. Add configurable party settings (queue limits, rate limits)

**Labels:** `feature`, `settings`

Queue limits and rate limits are hardcoded. Hosts should be able to tune these per party.

**Acceptance criteria:**

- [ ] Party settings UI for host (max queue size, items-per-member limit, rate limit interval)
- [ ] Settings stored in `parties` table (new migration)
- [ ] Defaults match current hardcoded values
- [ ] Non-hosts cannot modify settings

---

### 19. Add pagination to history page

**Labels:** `feature`, `ux`

The history page is capped at 10 results with no way to see older parties.

**Acceptance criteria:**

- [ ] Cursor-based or offset pagination
- [ ] "Load more" button or infinite scroll
- [ ] Total count displayed

---

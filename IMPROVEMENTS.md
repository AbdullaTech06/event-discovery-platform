# Suggested further changes for Gather

## Done in this pass
- **Removed duplicate/broken code** in `app.js` (old `loadEvents` and `window.onload` that referenced non-existent `eventContainer` and `viewDetails`).
- **Loading state**: Grid shows "Loading…" until events and RSVPs are loaded.
- **Semantic HTML**: Wrapped main content in `<main>` and added a skip link for accessibility.
- **Debounced search**: Search input is debounced (300ms) so the list doesn’t re-render on every keystroke.

---

## Security & config
- **Firebase config**: Your `firebaseConfig` in `app.js` contains real keys. For production:
  - Restrict API key by domain in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
  - Optionally move config to a separate file (e.g. `firebase-config.js`) and add it to `.gitignore`, with a `firebase-config.example.js` for other devs.
- **Firestore rules**: Replace test-mode rules with proper rules so only authenticated users can create/update/delete; keep events readable by everyone if needed.

---

## UX
- **Skeleton loaders**: Replace "Loading…" with card-shaped skeleton placeholders for a smoother feel.
- **Empty state for events**: When there are zero events (not just filtered), show a different message and a CTA to create the first event (when logged in).
- **Form validation**: Inline validation (e.g. required fields, date in future, URL format) with messages under each field instead of only toasts.
- **Loading on actions**: Disable "Log In" / "Create Account" / "Publish Event" and show a spinner while the request is in progress.
- **Image fallback**: If the event cover image fails to load, show a placeholder (e.g. category icon or gradient) instead of a broken area.

---

## Accessibility
- **Focus trap in modals**: When a modal opens, trap focus inside it and return focus to the trigger when it closes (e.g. "Post Event" or the card that was clicked).
- **Focus visible**: Ensure keyboard focus is clearly visible (e.g. `.btn:focus-visible`, `.chip:focus-visible`).
- **Live region for toasts**: Add `role="status"` and `aria-live="polite"` to the toasts container so screen readers announce new toasts.
- **Card as button/link**: Make each event card focusable and activatable with Enter (e.g. use a `<button>` or `<a>` with proper styling instead of `onclick` on a `div`).

---

## Performance
- **Firestore indexes**: If you add filters (e.g. by date range or category in the query), create the required composite indexes in Firestore.
- **Query only upcoming events**: Instead of loading all events and filtering in the client, use a Firestore query with `where('date', '>=', today)` and order by `date` to reduce reads and payload.
- **Lazy-load images**: Use `loading="lazy"` if you switch cover images to `<img>` tags, or keep CSS `background-image` and consider Intersection Observer for lazy loading.

---

## Code structure
- **Extract Firebase**: Put `firebaseConfig`, `initializeApp`, `auth`, and `db` in a small `firebase.js` (or `firebase-config.js`) and import from `app.js` so the main app file is easier to read.
- **Constants**: Move category list and emoji map to a shared constants object (or a small `constants.js`) so adding a category is a single change.
- **Event delegation**: Replace inline `onclick` handlers with a single delegated listener on the document (e.g. for cards, chips, buttons) and use `data-*` attributes for IDs/actions. This avoids attaching many handlers and makes it easier to add/remove content.
- **Single source of truth for modals**: Keep modal content in HTML (hidden by default) or in small template functions instead of building large HTML strings in JS.

---

## Features
- **Edit event**: Allow the creator to edit an event (same form as create, pre-filled); update the Firestore document.
- **My RSVPs**: In the user menu or a separate tab, list events the user has RSVP’d to.
- **Real-time updates**: Use `onSnapshot` for the events collection so new or updated events appear without a refresh.
- **Pagination or virtual list**: When the number of events grows, load a limited number (e.g. 20) and add "Load more" or infinite scroll.
- **Share event**: Copy link or open share dialog (Web Share API when available).

---

## DevEx & ops
- **Environment-based config**: Use different Firebase projects (or emulators) for dev vs prod; e.g. `firebaseConfig` from env or a config file that’s not committed.
- **Error logging**: Send caught errors to a service (e.g. Sentry) or at least log them in a structured way for debugging.
- **Offline**: Consider Firestore persistence so the app works offline and syncs when back online.

Pick the items that match your priorities (e.g. security first, then UX, then real-time) and implement them in small steps.

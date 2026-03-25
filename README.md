# React Cricket Player Directory

A React + Vite application that lists cricket players and provides a detailed profile page using the SportMonks Cricket API.

## What This Project Solves

- Browse players in a clean, paginated UI.
- Open individual player pages with stats and team data.
- Filter by country, role/position, and career tournament type.
- Keep list state in URL params for shareable links.
- Handle large API payloads using IndexedDB caching.
- Avoid browser CORS failures through proxy-based API routing.

## Tech Stack

- React 18
- Vite
- React Router
- Vanilla CSS (modular styles)
- ESLint
- Prettier

## Core Features

- All Players page
- Player Detail page
- Search by last name
- Sorting (first name, id, recently updated)
- Filters (country, position, tournament type)
- Pagination (12 players/page)
- Loading, empty, and error states
- Abort-safe data fetching (prevents stale updates during navigation)
- Retry + timeout logic for API calls
- IndexedDB cache with stale fallback

## Project Structure

```text
src/
  assets/
  components/
    AppHeader.jsx
    ErrorBoundary.jsx
    Pagination.jsx
    PlayerCard.jsx
    PlayersControls.jsx
  hooks/
    useDebouncedValue.js
  pages/
    PlayersPage.jsx
    PlayerDetailPage.jsx
  services/
    api.js
    playerCache.js
  styles/
    base.css
    layout.css
    players.css
    player-detail.css
    index.css
  utils/
    formatters.js
    playerUtils.js
  App.jsx
  main.jsx
```

## API Handling Strategy

### 1) CORS and Proxy Strategy

Direct browser calls to `https://cricket.sportmonks.com` can fail due to CORS.

To prevent that, this app uses a same-origin proxy path:

- App calls: `/api/sportmonks/...`
- Dev proxy (`vite.config.js`) forwards to: `https://cricket.sportmonks.com/api/v2.0/...`
- Vercel rewrites (`vercel.json`) do the same in production.

This keeps frontend code simple and avoids first-load failures from CORS blocks.

### 2) Retry + Timeout

`src/services/api.js` includes:

- request timeout guard
- retry for transient failures
- no retry for 4xx errors
- abort-aware behavior for route changes

### 3) Data Normalization

Raw SportMonks payloads are normalized into UI-friendly objects in `api.js`.

This includes:

- safe image URL handling
- country/position resolution
- team extraction
- career stat grouping (ODI/T20/Test)

## IndexedDB Cache and Storage

`src/services/playerCache.js` stores the normalized players dataset in IndexedDB.

- Database: `cricket-player-directory-cache`
- Store: `cacheEntries`
- Key: `players-dataset-v1`
- TTL: 12 hours

Behavior:

- If fresh cache exists: use cache immediately.
- If cache expired: fetch fresh data, then overwrite cache.
- If fresh fetch fails and stale cache exists: use stale cache as fallback.

Why this approach:

- Improves first meaningful render on repeat visits.
- Reduces repeated heavy payload downloads.
- Keeps app usable during temporary API instability.

## Environment Variables

Create `.env` in project root:

```env
VITE_SPORTMONKS_API_KEY=your_api_token_here
VITE_SPORTMONKS_API_BASE_URL=/api/sportmonks
```

Optional:

```env
VITE_MAX_PLAYERS_PAGES=30
```

Notes:

- Do not commit `.env`.
- Keep `VITE_SPORTMONKS_API_BASE_URL=/api/sportmonks` to avoid CORS issues.

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Add environment variables (`.env`)

3. Run development server

```bash
npm run dev
```

4. Open app

- Usually at `http://localhost:5173`

## Quality Commands

```bash
npm run lint
npm run build
```

## How to Verify Everything Works

1. Open `/` and confirm players are visible.
2. Apply filters and sorting.
3. Go to page 2+ and confirm pagination works.
4. Click a player card and confirm detail route opens.
5. Hard refresh on `/players/:id` and ensure page still works.
6. Stop internet briefly and confirm stale cache fallback behavior (if cache exists).

## Deployment (Assignment Flow)

### A) rtCamp Repository

1. Finalize code in rtCamp repo.
2. Raise PR in rtCamp repo.

### B) Personal Repository

1. Clone/copy same code to your personal GitHub repo.
2. Do not make code-level changes while transferring.
3. Give pod leader access to personal repo.

### C) Vercel

1. Connect personal GitHub repo to Vercel.
2. Add env variables:
   - `VITE_SPORTMONKS_API_KEY`
   - `VITE_SPORTMONKS_API_BASE_URL=/api/sportmonks`
3. Deploy.
4. Add deployed URL in rtCamp PR description.

## Important Config Files

- `vite.config.js`
  - local dev proxy for `/api/sportmonks`
- `vercel.json`
  - production rewrite for API proxy
  - SPA fallback rewrite to `index.html`
- `eslint.config.js`
  - lint rules
- `.prettierrc`
  - formatting rules

## Troubleshooting

### CORS Errors in Browser

Symptom:

- Network tab shows `CORS error` for SportMonks endpoints.

Fix:

- Ensure `VITE_SPORTMONKS_API_BASE_URL=/api/sportmonks`
- Restart dev server after env changes.
- Confirm proxy exists in `vite.config.js`.

### First Load Fails but Refresh Works

Possible causes:

- wrong base URL (direct SportMonks URL)
- API timeout on large payload

Fix:

- use proxy base URL
- keep retry/timeout defaults
- rely on IndexedDB fallback once cache is present

### Detail Route 404 on Refresh (Production)

Fix:

- ensure SPA rewrite exists in `vercel.json`:
  - `/(.*) -> /index.html`

## Current Limitations

- SportMonks `/players` can be large and expensive to fetch.
- Some filters/includes in API can be inconsistent depending on plan/data.
- Frontend-only architecture means API token is exposed in network requests.

## Future Improvements

- Smarter cache invalidation per endpoint instead of dataset-level TTL.
- Optional background refresh after initial cache render.
- Progressive loading / virtualized list for very large datasets.

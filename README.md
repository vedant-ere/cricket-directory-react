# React Cricket Player Information Directory

A React app that lists cricket players and shows player details using the SportMonks Cricket API.

## Tech

- React + Vite
- React Router
- Vanilla CSS
- ESLint + Prettier

## Features

- Players listing page
- 12 players per page pagination
- Search by last name (real-time debounced + submit)
- Filters
  - Country
  - Position
  - Career tournament type
- Sorting
  - First Name
  - ID
  - Recently Updated
  - Ascending / Descending
- URL query state sync for shareable links
- Single player details page
- API retries with timeout and graceful error states
- IndexedDB cache with stale fallback for large player datasets
- Dev/prod proxy setup to avoid SportMonks browser CORS issues

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_SPORTMONKS_API_KEY=your_api_key_here
VITE_SPORTMONKS_API_BASE_URL=/api/sportmonks
```

Notes:

- The API key should be kept in `.env` and never committed.
- In a frontend-only app, the key is still visible in browser network requests.
- A same-origin proxy path is used (`/api/sportmonks`) to avoid CORS failures in browser.

## Local Development

```bash
npm install
npm run dev
```

## Quality Checks

```bash
npm run lint
npm run build
```

## Deploy (Vercel)

- Add the same environment variables in Vercel project settings.
- `vercel.json` includes API proxy + SPA fallback rewrite for direct route loads.
- Deploy from your personal GitHub repository as per assignment flow.

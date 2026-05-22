# Video Player

React + TypeScript app powered by [Bun](https://bun.sh) and [Vite](https://vite.dev).

## Prerequisites

- [Bun](https://bun.sh/docs/installation) 1.3+

## Setup

```bash
bun install
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server with HMR |
| `bun run build` | Type-check and production build |
| `bun run preview` | Preview production build |
| `bun run lint` | Run ESLint |

## Project layout

```
src/
  main.tsx    # App entry
  App.tsx     # Root component
  index.css   # Global styles
```

Import from `src` using the `@/` alias, e.g. `import App from '@/App.tsx'`.

## Features

- **Import Folder** — each folder becomes its own playlist; videos are sorted in natural order (Ep1, Ep2, Ep10…)
- **Persistent storage** — playlist data saved as JSON in `localStorage`; folder access + thumbnails in IndexedDB (survives refresh)
- **Library** — view all imported playlists under **LIBRARY** or **RECENT**
- **Playback** — HTML5 video player with controls; auto-plays on select; advances to the next file when one ends
- **Relink** — if folder access expires, use **Relink Folder** to restore playback (Chrome/Edge keep access longer via directory handles)

## Tooling

- **Runtime & package manager:** Bun (`bun.lock`)
- **Bundler:** Vite 8
- **UI:** React 19
- **Language:** TypeScript 6

Supported formats: MP4, WebM, OGG, MOV, M4V, MKV, AVI, and other `video/*` types your browser can decode.

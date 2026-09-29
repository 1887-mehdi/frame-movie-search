# Frame — Movie Search

A polished, responsive movie discovery app built with React, TypeScript, and Vite. Search the TMDB catalogue, fill missing movie data and posters from OMDb, browse poster cards, open a film file with cast and crew details, and watch an available trailer.

## Features

- Debounced movie search with suggestions, loading skeletons, empty states, and retryable errors
- Film detail dialog with synopsis, release date, age rating, score comparisons, runtime, genres, director, writers, cast, countries, production, budget, box office, awards, and trailer
- Responsive layouts, keyboard search shortcut (`/`), reduced-motion support, and accessible controls
- Requests cancel when a newer search replaces them
- TMDB-first search with OMDb fallback and title/year deduplication
- Typed API service layers and focused React components

## Run locally

Use Node.js 20.19+ or 22.12+.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add your TMDB and OMDb API keys. Both services can be configured independently; TMDB remains primary and OMDb failures do not block TMDB results.
3. Start the app with `npm run dev`.

The development server prints its local address. For a production build, run `npm run typecheck` and `npm run build`; use `npm run preview` to view the build locally.

## Project structure

```text
public/media/       Local background video and poster fallback
src/app/            App shell and search state
src/components/     Movie cards and details dialog
src/services/       TMDB and OMDb clients, fallback matching, and mapping
src/types/          Shared movie types
src/styles.css      Responsive visual system
```

## API key and deployment

Create keys through [TMDB](https://www.themoviedb.org/settings/api) and [OMDb](https://www.omdbapi.com/apikey.aspx), then keep them in `.env.local`. Never commit `.env.local`. OMDb's free key currently has a daily request limit; check its official site for current limits.

Vite embeds `VITE_` values in the browser build, so a frontend API key is visible to visitors. Restrict the key where possible and use a server-side proxy for a production deployment that needs stronger protection. The original archive contained API key values in source files; replace/revoke those keys before using them again.

Movie information and artwork may be provided by [The Movie Database (TMDB)](https://www.themoviedb.org/) and [OMDb](https://www.omdbapi.com/). This project is not endorsed or certified by TMDB. OMDb states its contributions are licensed under CC BY-NC 4.0; review that license and the licenses for the bundled video and fallback image before publishing or using the project commercially.

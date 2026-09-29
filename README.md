# Frame — Movie Search

A polished, responsive movie discovery app built with React, TypeScript, and Vite. Search the TMDB catalogue, browse poster cards, open a film file with cast and crew details, and watch an available trailer.

## Features

- Debounced movie search with suggestions, loading skeletons, empty states, and retryable errors
- Film detail dialog with synopsis, score, runtime, genres, director, cast, and trailer
- Responsive layouts, keyboard search shortcut (`/`), reduced-motion support, and accessible controls
- Requests cancel when a newer search replaces them
- Typed TMDB service layer and focused React components

## Run locally

Use Node.js 20.19+ or 22.12+.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add your TMDB API key.
3. Start the app with `npm run dev`.

The development server prints its local address. For a production build, run `npm run typecheck` and `npm run build`; use `npm run preview` to view the build locally.

## Project structure

```text
public/media/       Local background video and poster fallback
src/app/            App shell and search state
src/components/     Movie cards and details dialog
src/services/       TMDB API client and response mapping
src/types/          Shared movie types
src/styles.css      Responsive visual system
```

## API key and deployment

Create a TMDB API key from your TMDB account and keep your local value in `.env.local`. Never commit `.env.local`.

Vite embeds `VITE_` values in the browser build, so a frontend API key is visible to visitors. Restrict the key where possible and use a server-side proxy for a production deployment that needs stronger protection. The original archive contained API key values in source files; replace/revoke those keys before using them again.

Movie information and artwork are provided by [The Movie Database (TMDB)](https://www.themoviedb.org/). This project is not endorsed or certified by TMDB. Review the licenses for the bundled video and fallback image before publishing a live deployment.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { MovieCard } from "../components/MovieCard";
import { MovieDetailsDialog } from "../components/MovieDetailsDialog";
import { searchMovies } from "../services/tmdb";
import type { MovieSearchState, MovieSummary } from "../types/movie";

const suggestions = [
  "Dune",
  "The Grand Budapest Hotel",
  "Spirited Away",
  "Interstellar",
];

export function App() {
  const [query, setQuery] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [movies, setMovies] = useState<MovieSummary[]>([]);
  const [status, setStatus] = useState<MovieSearchState>("idle");
  const [error, setError] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<MovieSummary | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey)
        return;
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      )
        return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setMovies([]);
      setError("");
      setStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setStatus("loading");
      setError("");
      searchMovies(trimmedQuery, controller.signal)
        .then((results) => {
          setMovies(results);
          setStatus(results.length ? "success" : "empty");
        })
        .catch((requestError: unknown) => {
          if (controller.signal.aborted) return;
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Something went wrong. Please try again.",
          );
          setStatus("error");
        });
    }, 420);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, retryKey]);

  const closeDetails = useCallback(() => setSelectedMovie(null), []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim().length < 2) {
      inputRef.current?.focus();
      return;
    }
    setRetryKey((key) => key + 1);
  }

  function chooseSuggestion(suggestion: string) {
    setQuery(suggestion);
    setRetryKey((key) => key + 1);
    inputRef.current?.focus();
  }

  function clearSearch() {
    setQuery("");
    inputRef.current?.focus();
  }

  return (
    <main className="app-shell">
      <div className="ambient-glow" aria-hidden="true" />
      <video
        className="background-film"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        poster="/media/poster-fallback.jpg"
      >
        <source src="/media/cinema-loop.mp4" type="video/mp4" />
      </video>
      <div className="background-film__shade" aria-hidden="true" />

      <div className="page-content" inert={Boolean(selectedMovie)}>
        <header className="site-header">
          <a className="brand" href="#top" aria-label="Frame home">
            <span className="brand__mark" aria-hidden="true">
              F
            </span>
            <span>
              FRAME<span className="brand__period">.</span>
            </span>
          </a>
          <span className="header-note">
            <span className="live-dot" /> YOUR NEXT FAVORITE STARTS HERE
          </span>
        </header>

        <section className="search-hero" id="top" aria-labelledby="page-title">
          <p className="eyebrow">
            <span className="eyebrow-line" /> THE MOVIE DISCOVERY DESK
          </p>
          <h1 id="page-title">
            Find your next
            <br />
            <em>favorite frame.</em>
          </h1>
          <p className="search-hero__copy">
            Every great movie night starts with one good search.
          </p>

          <form className="search-form" onSubmit={handleSubmit} role="search">
            <span className="search-form__icon" aria-hidden="true">
              ⌕
            </span>
            <label className="sr-only" htmlFor="movie-search">
              Search for a movie
            </label>
            <input
              ref={inputRef}
              id="movie-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a title, a feeling, a world…"
              autoComplete="off"
              aria-describedby="search-hint"
            />
            {query ? (
              <button
                className="search-form__clear"
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                ×
              </button>
            ) : null}
            <button
              className="search-form__submit"
              type="submit"
              aria-label="Search movies"
            >
              <span>Discover</span>
              <span aria-hidden="true">↗</span>
            </button>
          </form>
          <p className="search-hint" id="search-hint">
            Try a title or type <kbd>/</kbd> to search
          </p>

          {status === "idle" ? (
            <div className="suggestions" aria-label="Suggested movie searches">
              <span className="suggestions__label">A PLACE TO START</span>
              <div className="suggestions__items">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => chooseSuggestion(suggestion)}
                  >
                    {suggestion}
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {status !== "idle" || movies.length > 0 ? (
          <section
            className="results-section"
            aria-live="polite"
            aria-busy={status === "loading"}
          >
            <div className="results-heading">
              <div>
                <p className="eyebrow">
                  <span className="eyebrow-line" /> THE COLLECTION
                </p>
                <h2>
                  {status === "loading"
                    ? "Looking through the reels…"
                    : status === "error"
                      ? "A little intermission."
                      : status === "empty"
                        ? "No matches this time."
                        : "On the marquee."}
                </h2>
              </div>
              {status === "success" ? (
                <span className="result-count">
                  {movies.length} {movies.length === 1 ? "FILM" : "FILMS"} FOUND
                </span>
              ) : null}
            </div>

            {status === "loading" ? (
              <div className="movie-grid" aria-label="Loading movies">
                {Array.from({ length: 8 }, (_, index) => (
                  <div className="movie-skeleton" key={index}>
                    <div />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : null}

            {status === "success" ? (
              <div className="movie-grid">
                {movies.map((movie) => (
                  <MovieCard
                    key={`${movie.provider}:${movie.id}`}
                    movie={movie}
                    onSelect={setSelectedMovie}
                  />
                ))}
              </div>
            ) : null}

            {status === "empty" ? (
              <div className="empty-state">
                <span aria-hidden="true">⌕</span>
                <p>Try another title, or keep it short and sweet.</p>
              </div>
            ) : null}

            {status === "error" ? (
              <div className="error-state" role="alert">
                <span>{error}</span>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setRetryKey((key) => key + 1)}
                >
                  Try again <span aria-hidden="true">↗</span>
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        <footer className="site-footer">
          <span>MADE FOR THE LOVE OF A GOOD STORY</span>
          <span>
            FILM DATA BY{" "}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noreferrer"
            >
              TMDB
            </a>{" "}
            &amp;{" "}
            <a href="https://www.omdbapi.com/" target="_blank" rel="noreferrer">
              OMDb
            </a>
          </span>
        </footer>
      </div>

      {selectedMovie ? (
        <MovieDetailsDialog movie={selectedMovie} onClose={closeDetails} />
      ) : null}
    </main>
  );
}

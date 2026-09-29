import { useEffect, useRef, useState } from "react";
import { getImageUrl, getMovieDetails } from "../services/tmdb";
import type { MovieDetails, MovieSummary } from "../types/movie";

type MovieDetailsDialogProps = {
  movie: MovieSummary;
  onClose: () => void;
};

function formatRuntime(runtime: number | null) {
  if (!runtime) return "Runtime unavailable";
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  return [hours ? `${hours}h` : "", minutes ? `${minutes}m` : ""]
    .filter(Boolean)
    .join(" ");
}

export function MovieDetailsDialog({
  movie,
  onClose,
}: MovieDetailsDialogProps) {
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [error, setError] = useState("");
  const [trailerIsOpen, setTrailerIsOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setDetails(null);
    setError("");
    setTrailerIsOpen(false);
    document.body.classList.add("dialog-open");
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();

    getMovieDetails(movie.id, controller.signal)
      .then(setDetails)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load movie details.",
          );
        }
      });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), iframe, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      controller.abort();
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("dialog-open");
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [movie.id, onClose]);

  const backdrop = getImageUrl(
    details?.backdropPath ?? movie.backdropPath,
    "original",
  );
  const poster = getImageUrl(details?.posterPath ?? movie.posterPath, "w500");
  const trailer = details?.videos.results.find(
    (video) =>
      video.site === "YouTube" && video.type === "Trailer" && video.key,
  );
  const director = details?.credits.crew.find(
    (person) => person.job === "Director",
  );
  const cast = details?.credits.cast
    .slice(0, 5)
    .map((person) => person.name)
    .join(", ");

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={dialogRef}
        className="movie-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="movie-dialog-title"
      >
        <button
          ref={closeButtonRef}
          className="movie-dialog__close"
          type="button"
          onClick={onClose}
          aria-label="Close movie details"
        >
          ×
        </button>
        <div
          className="movie-dialog__hero"
          style={
            backdrop ? { backgroundImage: `url("${backdrop}")` } : undefined
          }
        >
          <div className="movie-dialog__hero-shade" />
          <div className="movie-dialog__hero-content">
            {poster ? (
              <img
                className="movie-dialog__poster"
                src={poster}
                alt={`${movie.title} poster`}
              />
            ) : null}
            <div className="movie-dialog__intro">
              <p className="eyebrow">
                FILM FILE · {movie.releaseDate.slice(0, 4) || "COMING SOON"}
              </p>
              <h2 id="movie-dialog-title">{details?.title ?? movie.title}</h2>
              <div className="movie-dialog__badges">
                <span>
                  ★{" "}
                  {details?.voteAverage.toFixed(1) ??
                    movie.voteAverage.toFixed(1)}
                </span>
                {details?.runtime ? (
                  <span>{formatRuntime(details.runtime)}</span>
                ) : null}
                {details?.genres.slice(0, 2).map((genre) => (
                  <span key={genre.id}>{genre.name}</span>
                ))}
              </div>
              <p className="movie-dialog__overview">
                {error
                  ? "Movie details could not be loaded."
                  : details?.overview ||
                    movie.overview ||
                    "No synopsis available yet."}
              </p>
              {trailer ? (
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => setTrailerIsOpen(true)}
                >
                  <span aria-hidden="true">▶</span> Watch trailer
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <div className="movie-dialog__body">
          {error ? (
            <p className="inline-error" role="alert">
              {error}
            </p>
          ) : null}
          {!details && !error ? (
            <p className="details-loading" role="status">
              Loading the full film file…
            </p>
          ) : null}
          {details ? (
            <div className="movie-dialog__facts">
              <div>
                <span>Director</span>
                <strong>{director?.name ?? "Not listed"}</strong>
              </div>
              <div>
                <span>Cast</span>
                <strong>{cast || "Not listed"}</strong>
              </div>
              <div>
                <span>Original language</span>
                <strong>
                  {details.originalLanguage.toUpperCase() || "Not listed"}
                </strong>
              </div>
              <div>
                <span>Audience score</span>
                <strong>{details.voteCount.toLocaleString()} votes</strong>
              </div>
            </div>
          ) : null}
          {trailerIsOpen && trailer ? (
            <div className="trailer-frame">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailer.key)}?autoplay=1&rel=0`}
                title={`${movie.title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

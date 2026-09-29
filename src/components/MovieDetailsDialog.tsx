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

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);
}

function formatMoney(value: number | null | undefined) {
  if (!value) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
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

    getMovieDetails(movie, controller.signal)
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
  }, [movie.id, movie.provider, onClose]);

  const backdrop = getImageUrl(
    details?.backdropPath ?? movie.backdropPath,
    "original",
  );
  const poster = getImageUrl(details?.posterPath ?? movie.posterPath, "w500");
  const trailer = details?.videos.results.find(
    (video) =>
      video.site === "YouTube" && video.type === "Trailer" && video.key,
  );
  const director =
    details?.director ||
    details?.credits.crew.find((person) => person.job === "Director")?.name;
  const cast =
    details?.castNames?.join(", ") ||
    details?.credits.cast
      .slice(0, 5)
      .map((person) => person.name)
      .join(", ");
  const ratings: string[] = [];
  if (details?.voteAverage) {
    ratings.push(
      `${movie.provider === "omdb" ? "IMDb" : "TMDB"} ${details.voteAverage.toFixed(1)}/10 (${details.voteCount.toLocaleString()} votes)`,
    );
  }
  for (const rating of details?.externalRatings ?? []) {
    if (!ratings.some((entry) => entry.startsWith(`${rating.source} `))) {
      ratings.push(`${rating.source} ${rating.value}`);
    }
  }

  const facts = (
    [
      ["Release date", formatDate(details?.releaseDate ?? movie.releaseDate)],
      ["Runtime", details?.runtime ? formatRuntime(details.runtime) : ""],
      ["Age rating", details?.rated ?? ""],
      ["Director", director ?? ""],
      ["Writers", details?.writers?.join(", ") ?? ""],
      ["Cast", cast ?? ""],
      ["Country", details?.countries?.join(", ") ?? ""],
      ["Original language", details?.originalLanguage ?? ""],
      ["Production", details?.productionCompanies?.join(", ") ?? ""],
      ["Status", details?.status ?? ""],
      ["Budget", formatMoney(details?.budget)],
      ["Box office", details?.boxOffice || formatMoney(details?.revenue)],
      ["Ratings", ratings.join(" · ")],
    ] as Array<[string, string]>
  ).filter(([, value]) => Boolean(value));

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
                FILM FILE · {movie.releaseDate.slice(0, 4) || "YEAR UNKNOWN"}
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
            <>
              {details.tagline ? (
                <p className="movie-dialog__tagline">“{details.tagline}”</p>
              ) : null}
              <div className="movie-dialog__facts">
                {facts.map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              {details.awards ? (
                <div className="movie-dialog__awards">
                  <span aria-hidden="true">✦</span>
                  <p>
                    <small>AWARDS &amp; RECOGNITION</small>
                    <strong>{details.awards}</strong>
                  </p>
                </div>
              ) : null}
              {details.imdbId ? (
                <a
                  className="movie-dialog__imdb-link"
                  href={`https://www.imdb.com/title/${encodeURIComponent(details.imdbId)}/`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on IMDb <span aria-hidden="true">↗</span>
                </a>
              ) : null}
            </>
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

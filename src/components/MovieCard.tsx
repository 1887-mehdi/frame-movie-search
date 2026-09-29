import type { MovieSummary } from "../types/movie";
import { getImageUrl } from "../services/tmdb";

type MovieCardProps = {
  movie: MovieSummary;
  onSelect: (movie: MovieSummary) => void;
};

export function MovieCard({ movie, onSelect }: MovieCardProps) {
  const poster = getImageUrl(movie.posterPath, "w342");
  const year = movie.releaseDate.slice(0, 4);

  return (
    <button
      className="movie-card"
      type="button"
      onClick={() => onSelect(movie)}
      aria-label={`View details for ${movie.title}${year ? ` (${year})` : ""}`}
    >
      <span className="movie-card__poster-wrap">
        {poster ? (
          <img
            className="movie-card__poster"
            src={poster}
            alt={`${movie.title} poster`}
            loading="lazy"
          />
        ) : (
          <span
            className="movie-card__no-poster"
            aria-label="Poster unavailable"
          >
            <span aria-hidden="true">▧</span>
            <small>NO POSTER</small>
          </span>
        )}
        <span className="movie-card__open" aria-hidden="true">
          ↗
        </span>
      </span>
      <span className="movie-card__meta">
        <span className="movie-card__title">{movie.title}</span>
        <span className="movie-card__subline">
          <span>{year || "Release date unknown"}</span>
          <span className="movie-card__rating">
            <span aria-hidden="true">★</span>{" "}
            {movie.voteAverage ? movie.voteAverage.toFixed(1) : "—"}
          </span>
        </span>
      </span>
    </button>
  );
}

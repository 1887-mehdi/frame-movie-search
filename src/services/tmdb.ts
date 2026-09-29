import type { MovieDetails, MovieSummary } from "../types/movie";
import { searchOmdbMovies, getOmdbMovieDetails } from "./omdb";

const API_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

function getApiKey() {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY?.trim();
  if (!apiKey || apiKey === "your_tmdb_api_key") {
    throw new Error(
      "Add your TMDB API key to .env.local to search for movies.",
    );
  }
  return apiKey;
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("api_key", getApiKey());

  const response = await fetch(url, { signal });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "TMDB rejected this API key. Check the key in .env.local.",
      );
    }
    if (response.status === 429) {
      throw new Error("Too many requests. Wait a moment and try again.");
    }
    throw new Error(
      `TMDB request failed (${response.status}). Please try again.`,
    );
  }
  return response.json() as Promise<T>;
}

type TmdbMovie = {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  vote_average: number;
  vote_count: number;
  overview: string;
  genre_ids?: number[];
  runtime?: number | null;
  original_language?: string;
  genres?: MovieDetails["genres"];
  credits?: MovieDetails["credits"];
  videos?: MovieDetails["videos"];
  imdb_id?: string | null;
};

function normalizeMovie(movie: TmdbMovie): MovieSummary {
  return {
    id: movie.id,
    provider: "tmdb",
    imdbId: movie.imdb_id ?? null,
    title: movie.title,
    originalTitle: movie.original_title,
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    releaseDate: movie.release_date ?? "",
    voteAverage: movie.vote_average,
    voteCount: movie.vote_count,
    overview: movie.overview,
    genreIds: movie.genre_ids ?? [],
  };
}

export async function searchMovies(query: string, signal?: AbortSignal) {
  const [tmdbResult, omdbResult] = await Promise.allSettled([
    request<{ results: TmdbMovie[] }>(
      `/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
      signal,
    ).then((data) => data.results.map(normalizeMovie)),
    searchOmdbMovies(query, signal),
  ]);
  if (signal?.aborted) throw new DOMException("Search canceled.", "AbortError");
  if (tmdbResult.status === "rejected" && omdbResult.status === "rejected") {
    throw tmdbResult.reason;
  }
  const tmdbMovies = tmdbResult.status === "fulfilled" ? tmdbResult.value : [];
  const omdbMovies = omdbResult.status === "fulfilled" ? omdbResult.value : [];

  const matchedOmdbIds = new Set<string>();
  const enrichedTmdb = tmdbMovies.map((movie) => {
    const fallback = findMatchingOmdb(
      movie,
      omdbMovies.filter(
        (candidate) =>
          !candidate.imdbId || !matchedOmdbIds.has(candidate.imdbId),
      ),
    );
    if (!fallback) return movie;
    if (fallback.imdbId) matchedOmdbIds.add(fallback.imdbId);
    return mergeSummaries(movie, fallback);
  });

  // TMDB stays authoritative. Add OMDb-only matches after it, while deduping
  // by normalized title and release year so the same film appears once.
  const seen = [...enrichedTmdb];
  const uniqueOmdb = omdbMovies.filter((movie) => {
    if (movie.imdbId && matchedOmdbIds.has(movie.imdbId)) return false;
    if (seen.some((existing) => areSameMovie(existing, movie))) return false;
    const key = movieMatchKey(movie);
    if (seen.some((existing) => movieMatchKey(existing) === key)) return false;
    seen.push(movie);
    return true;
  });
  return [...enrichedTmdb, ...uniqueOmdb];
}

export async function getMovieDetails(
  summary: MovieSummary,
  signal?: AbortSignal,
): Promise<MovieDetails> {
  if (summary.provider === "omdb") return getOmdbMovieDetails(summary, signal);

  let movie: TmdbMovie;
  try {
    movie = await request<TmdbMovie>(
      `/movie/${summary.id}?append_to_response=credits,videos&language=en-US`,
      signal,
    );
  } catch (error) {
    if (signal?.aborted) throw error;
    try {
      return await getOmdbMovieDetails(summary, signal);
    } catch {
      throw error;
    }
  }
  const details: MovieDetails = {
    ...mergeSummaries(normalizeMovie(movie), summary),
    runtime: movie.runtime ?? null,
    originalLanguage: movie.original_language ?? "",
    genres: movie.genres ?? [],
    credits: movie.credits ?? { crew: [], cast: [] },
    videos: movie.videos ?? { results: [] },
  };
  if (hasCompleteDetails(details)) return details;

  try {
    const fallback = await getOmdbMovieDetails(
      { ...summary, imdbId: movie.imdb_id ?? summary.imdbId },
      signal,
    );
    return mergeDetails(details, fallback);
  } catch {
    return details;
  }
}

function normalizeTitle(title: string) {
  return title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function movieMatchKey(movie: MovieSummary) {
  return `${normalizeTitle(movie.title)}:${movie.releaseDate.slice(0, 4)}`;
}

function areSameMovie(left: MovieSummary, right: MovieSummary) {
  if (normalizeTitle(left.title) !== normalizeTitle(right.title)) return false;
  const leftYear = left.releaseDate.slice(0, 4);
  const rightYear = right.releaseDate.slice(0, 4);
  return !leftYear || !rightYear || leftYear === rightYear;
}

function findMatchingOmdb(movie: MovieSummary, candidates: MovieSummary[]) {
  const title = normalizeTitle(movie.title);
  const year = Number(movie.releaseDate.slice(0, 4));
  return candidates
    .filter((candidate) => {
      if (normalizeTitle(candidate.title) !== title) return false;
      const candidateYear = Number(candidate.releaseDate.slice(0, 4));
      return !year || !candidateYear || Math.abs(year - candidateYear) <= 1;
    })
    .sort((left, right) => {
      const leftYear = Number(left.releaseDate.slice(0, 4));
      const rightYear = Number(right.releaseDate.slice(0, 4));
      return Math.abs(year - leftYear) - Math.abs(year - rightYear);
    })[0];
}

function mergeSummaries(
  primary: MovieSummary,
  fallback: MovieSummary,
): MovieSummary {
  return {
    ...primary,
    imdbId: primary.imdbId ?? fallback.imdbId,
    posterPath: primary.posterPath ?? fallback.posterPath,
    backdropPath: primary.backdropPath ?? fallback.backdropPath,
    releaseDate: primary.releaseDate || fallback.releaseDate,
    voteAverage: primary.voteAverage || fallback.voteAverage,
    voteCount: primary.voteCount || fallback.voteCount,
    overview: primary.overview || fallback.overview,
    genres: primary.genres?.length ? primary.genres : fallback.genres,
    runtime: primary.runtime ?? fallback.runtime,
    originalLanguage: primary.originalLanguage || fallback.originalLanguage,
    director: primary.director || fallback.director,
    castNames: primary.castNames?.length
      ? primary.castNames
      : fallback.castNames,
    imdbRating: primary.imdbRating ?? fallback.imdbRating,
  };
}

function hasCompleteDetails(movie: MovieDetails) {
  return Boolean(
    movie.posterPath &&
    movie.overview &&
    movie.runtime &&
    movie.genres.length &&
    movie.credits.cast.length &&
    movie.credits.crew.some((person) => person.job === "Director"),
  );
}

function mergeDetails(
  primary: MovieDetails,
  fallback: MovieDetails,
): MovieDetails {
  return {
    ...mergeSummaries(primary, fallback),
    runtime: primary.runtime ?? fallback.runtime,
    originalLanguage:
      primary.originalLanguage || fallback.originalLanguage || "",
    genres: primary.genres.length ? primary.genres : fallback.genres,
    credits: {
      crew: primary.credits.crew.length
        ? primary.credits.crew
        : fallback.credits.crew,
      cast: primary.credits.cast.length
        ? primary.credits.cast
        : fallback.credits.cast,
    },
    videos: primary.videos,
  };
}

export function getImageUrl(
  path: string | null,
  size: "w342" | "w500" | "original" = "w500",
) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${IMAGE_BASE}/${size}${path}`;
}

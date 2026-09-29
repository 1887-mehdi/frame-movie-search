import type { MovieDetails, MovieSummary } from "../types/movie";

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
};

function normalizeMovie(movie: TmdbMovie): MovieSummary {
  return {
    id: movie.id,
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
  const data = await request<{ results: TmdbMovie[] }>(
    `/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
    signal,
  );
  return data.results.map(normalizeMovie);
}

export async function getMovieDetails(
  id: number,
  signal?: AbortSignal,
): Promise<MovieDetails> {
  const movie = await request<TmdbMovie>(
    `/movie/${id}?append_to_response=credits,videos&language=en-US`,
    signal,
  );
  return {
    ...normalizeMovie(movie),
    runtime: movie.runtime ?? null,
    originalLanguage: movie.original_language ?? "",
    genres: movie.genres ?? [],
    credits: movie.credits ?? { crew: [], cast: [] },
    videos: movie.videos ?? { results: [] },
  };
}

export function getImageUrl(
  path: string | null,
  size: "w342" | "w500" | "original" = "w500",
) {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

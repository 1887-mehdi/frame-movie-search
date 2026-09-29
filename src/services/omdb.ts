import type { MovieDetails, MovieSummary } from "../types/movie";

const API_BASE = "https://www.omdbapi.com/";

function getApiKey() {
  const apiKey = import.meta.env.VITE_OMDB_API_KEY?.trim();
  if (!apiKey || apiKey === "your_omdb_api_key") return null;
  return apiKey;
}

type OmdbMovie = {
  Title: string;
  Year: string;
  imdbID: string;
  Type?: string;
  Poster?: string;
  Plot?: string;
  imdbRating?: string;
  imdbVotes?: string;
  Released?: string;
  Runtime?: string;
  Genre?: string;
  Language?: string;
  Director?: string;
  Actors?: string;
  Writer?: string;
  Country?: string;
  Rated?: string;
  Awards?: string;
  BoxOffice?: string;
  Ratings?: Array<{ Source: string; Value: string }>;
  Response?: string;
  Error?: string;
};

async function request<T>(
  params: Record<string, string>,
  signal?: AbortSignal,
) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("OMDb API key is not configured.");
  const url = new URL(API_BASE);
  url.searchParams.set("apikey", apiKey);
  for (const [key, value] of Object.entries(params))
    url.searchParams.set(key, value);

  const response = await fetch(url, { signal });
  if (!response.ok)
    throw new Error(`OMDb request failed (${response.status}).`);
  const data = (await response.json()) as T & {
    Response?: string;
    Error?: string;
  };
  if (data.Response === "False")
    throw new Error(data.Error ?? "OMDb request failed.");
  return data;
}

function normalizeOmdb(movie: OmdbMovie): MovieSummary {
  const year =
    normalizeReleasedDate(movie.Released) ||
    movie.Year?.match(/\d{4}/)?.[0] ||
    "";
  const rating = Number(movie.imdbRating);
  const posterPath =
    movie.Poster && movie.Poster !== "N/A" ? movie.Poster : null;
  const genres =
    movie.Genre && movie.Genre !== "N/A"
      ? movie.Genre.split(", ").map((name) => ({
          id: hashCode(name.toLowerCase()),
          name,
        }))
      : [];
  const actors =
    movie.Actors && movie.Actors !== "N/A" ? movie.Actors.split(", ") : [];

  return {
    id: hashCode(movie.imdbID),
    provider: "omdb",
    imdbId: movie.imdbID,
    title: movie.Title,
    originalTitle: movie.Title,
    posterPath,
    backdropPath: null,
    releaseDate: year,
    voteAverage: Number.isFinite(rating) ? rating : 0,
    voteCount: Number(movie.imdbVotes?.replace(/,/g, "")) || 0,
    overview: movie.Plot && movie.Plot !== "N/A" ? movie.Plot : "",
    genreIds: [],
    genres,
    runtime: parseRuntime(movie.Runtime),
    originalLanguage:
      movie.Language && movie.Language !== "N/A" ? movie.Language : "",
    director: movie.Director && movie.Director !== "N/A" ? movie.Director : "",
    castNames: actors,
    imdbRating: Number.isFinite(rating) ? rating.toFixed(1) : null,
    externalRatings:
      movie.Ratings?.map(({ Source, Value }) => ({
        source: Source,
        value: Value,
      })) ?? [],
    rated: movie.Rated && movie.Rated !== "N/A" ? movie.Rated : "",
    awards: movie.Awards && movie.Awards !== "N/A" ? movie.Awards : "",
    boxOffice:
      movie.BoxOffice && movie.BoxOffice !== "N/A" ? movie.BoxOffice : "",
    writers:
      movie.Writer && movie.Writer !== "N/A" ? movie.Writer.split(", ") : [],
    countries:
      movie.Country && movie.Country !== "N/A" ? movie.Country.split(", ") : [],
  };
}

function normalizeReleasedDate(released?: string) {
  if (!released || released === "N/A") return "";
  const date = new Date(released);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function parseRuntime(runtime?: string) {
  const minutes = Number(runtime?.match(/\d+/)?.[0]);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

// Stable numeric IDs keep the existing movie-card and detail component keys simple.
function hashCode(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (Math.imul(31, hash) + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export async function searchOmdbMovies(query: string, signal?: AbortSignal) {
  if (!getApiKey()) return [];
  const data = await request<{ Search?: OmdbMovie[] }>(
    { s: query, type: "movie", page: "1" },
    signal,
  );
  return (data.Search ?? []).map(normalizeOmdb);
}

export async function getOmdbMovieDetails(
  summary: MovieSummary,
  signal?: AbortSignal,
): Promise<MovieDetails> {
  const movie = await request<OmdbMovie>(
    summary.imdbId
      ? { i: summary.imdbId, plot: "full" }
      : { t: summary.title, y: summary.releaseDate.slice(0, 4), plot: "full" },
    signal,
  );
  const normalized = normalizeOmdb(movie);
  const names = normalized.castNames ?? [];
  return {
    ...normalized,
    ...summary,
    imdbId: normalized.imdbId,
    posterPath: summary.posterPath ?? normalized.posterPath,
    overview: summary.overview || normalized.overview,
    runtime: summary.runtime ?? normalized.runtime ?? null,
    genres: summary.genres?.length ? summary.genres : (normalized.genres ?? []),
    originalLanguage:
      summary.originalLanguage || normalized.originalLanguage || "",
    director: summary.director || normalized.director || "",
    castNames: summary.castNames?.length ? summary.castNames : names,
    imdbRating: normalized.imdbRating,
    externalRatings: normalized.externalRatings,
    rated: normalized.rated,
    awards: normalized.awards,
    boxOffice: normalized.boxOffice,
    writers: summary.writers?.length
      ? summary.writers
      : (normalized.writers ?? []),
    countries: summary.countries?.length
      ? summary.countries
      : (normalized.countries ?? []),
    credits: {
      crew: normalized.director
        ? [{ id: 0, name: normalized.director, job: "Director" }]
        : [],
      cast: names.map((name, index) => ({ id: index, name, character: "" })),
    },
    videos: { results: [] },
  };
}

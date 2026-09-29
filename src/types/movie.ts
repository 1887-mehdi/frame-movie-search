export type MovieSummary = {
  id: number;
  title: string;
  originalTitle: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  voteAverage: number;
  voteCount: number;
  overview: string;
  genreIds: number[];
};

export type MovieDetails = MovieSummary & {
  runtime: number | null;
  originalLanguage: string;
  genres: Array<{ id: number; name: string }>;
  credits: {
    crew: Array<{ id: number; name: string; job: string }>;
    cast: Array<{ id: number; name: string; character: string }>;
  };
  videos: {
    results: Array<{
      id: string;
      key: string;
      name: string;
      site: string;
      type: string;
      official: boolean;
    }>;
  };
};

export type MovieSearchState =
  "idle" | "loading" | "success" | "empty" | "error";

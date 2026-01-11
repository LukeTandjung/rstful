import { Data } from "effect";

export class EmbeddingError extends Data.TaggedError("EmbeddingError")<{
  readonly message: string;
}> {}

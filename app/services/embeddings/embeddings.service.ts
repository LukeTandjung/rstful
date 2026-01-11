import { Effect, Context } from "effect";
import type Dedalus from "dedalus-labs";
import type { EmbeddingResult } from "./embeddings.types";
import type { EmbeddingError } from "./embeddings.errors";

export class DedalusClientService extends Context.Tag("DedalusClientService")<
  DedalusClientService,
  {
    readonly client: Dedalus;
  }
>() {}

export class EmbeddingService extends Context.Tag("EmbeddingService")<
  EmbeddingService,
  {
    readonly createEmbedding: (
      text: string,
    ) => Effect.Effect<EmbeddingResult, EmbeddingError>;
    readonly createEmbeddings: (
      texts: Array<string>,
    ) => Effect.Effect<Array<EmbeddingResult>, EmbeddingError>;
  }
>() {}

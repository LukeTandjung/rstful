import { Effect, Layer } from "effect";
import Dedalus from "dedalus-labs";
import { EmbeddingService, DedalusClientService } from "./embeddings.service";
import { EmbeddingError } from "./embeddings.errors";
import type { EmbeddingResult } from "./embeddings.types";

export const DedalusClientServiceLive = Layer.succeed(DedalusClientService, {
  client: new Dedalus(),
});

export const EmbeddingServiceLive = Layer.effect(
  EmbeddingService,
  DedalusClientService.pipe(
    Effect.map(({ client }) => ({
      createEmbedding: (text: string) =>
        Effect.tryPromise({
          try: () =>
            client.embeddings.create({
              input: text,
              model: "openai/text-embedding-3-small",
            }),
          catch: (error) =>
            new EmbeddingError({
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to create embedding",
            }),
        }).pipe(
          Effect.timeoutFail({
            duration: "10 seconds",
            onTimeout: () => new EmbeddingError({ message: "Request timed out" }),
          }),
          Effect.map(
            (response): EmbeddingResult => ({
              embedding: response.data[0].embedding as Array<number>,
              tokens: response.usage.total_tokens,
            }),
          ),
        ),

      createEmbeddings: (texts: Array<string>) =>
        texts.length === 0
          ? Effect.succeed([])
          : Effect.tryPromise({
              try: () =>
                client.embeddings.create({
                  input: texts,
                  model: "openai/text-embedding-3-small",
                }),
              catch: (error) =>
                new EmbeddingError({
                  message:
                    error instanceof Error
                      ? error.message
                      : "Failed to create embeddings",
                }),
            }).pipe(
              Effect.map((response): Array<EmbeddingResult> => {
                const tokensPerText = Math.ceil(
                  response.usage.total_tokens / texts.length,
                );
                return response.data.map((item) => ({
                  embedding: item.embedding as Array<number>,
                  tokens: tokensPerText,
                }));
              }),
            ),
    })),
  ),
);

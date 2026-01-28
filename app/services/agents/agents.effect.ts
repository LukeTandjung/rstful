import { DedalusClient, DedalusLanguageModel, DedalusEmbeddingModel } from "@luketandjung/dedalus-labs";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import { Config, Layer } from "effect";

// Shared Dedalus client — provides DedalusClient to both language and embedding models
export const DedalusClientLive = DedalusClient.layerConfig({
  apiKey: Config.redacted("DEDALUS_API_KEY"),
}).pipe(Layer.provide(FetchHttpClient.layer));

// Language models
export const Gpt5 = DedalusLanguageModel.model("openai/gpt-5.1");
export const Gpt4oMini = DedalusLanguageModel.model("openai/gpt-4o-mini");

// Embedding model
export const TextEmbedding = DedalusEmbeddingModel.model(
  "openai/text-embedding-3-small",
  { mode: "batched" },
);

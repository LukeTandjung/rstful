import { Toolkit } from "@luketandjung/ariadne";
import { Effect } from "effect";
import type { ConvexHttpClient } from "convex/browser";
import type { Id } from "convex/_generated/dataModel";
import { FetchArticleTool, fetchArticleContent } from "./article.tools";
import {
  GetSavedArticlesTool,
  GetFeedArticlesTool,
  searchArticles,
  type SearchToolDependencies,
} from "./query.tools";
import {
  UpdateKnowledgeTool,
  createKnowledgeGraphTools,
  verbalizeGraph,
  verbalizeGraphForPrompt,
  type KnowledgeGraphToolDependencies,
} from "./knowledge.tools";
import type {
  KnowledgeGraphEntity,
  KnowledgeGraphRelationship,
} from "../agents.types";

// Re-exports
export {
  FetchArticleTool,
  fetchArticleContent,
  type ArticleContent,
} from "./article.tools";

export {
  GetSavedArticlesTool,
  GetFeedArticlesTool,
  type SearchToolDependencies,
} from "./query.tools";

export {
  UpdateKnowledgeTool,
  createKnowledgeGraphTools,
  verbalizeGraph,
  verbalizeGraphForPrompt,
  type KnowledgeGraphToolDependencies,
} from "./knowledge.tools";

// --- Combined Toolkit ---

export const ChatToolkit = Toolkit.make(
  FetchArticleTool,
  GetSavedArticlesTool,
  GetFeedArticlesTool,
  UpdateKnowledgeTool,
);

// --- Combined Dependencies ---

export interface ChatToolDependencies {
  userId: Id<"users">;
  convexClient: ConvexHttpClient;
  createEmbedding: (text: string) => Promise<Array<number>>;
  knowledgeGraphDeps: KnowledgeGraphToolDependencies;
}

// --- Toolkit Layer Factory ---

export function createChatToolkitLayer(deps: ChatToolDependencies) {
  const { userId, convexClient, createEmbedding, knowledgeGraphDeps } = deps;
  const knowledgeTools = createKnowledgeGraphTools(userId, knowledgeGraphDeps);
  const searchDeps: SearchToolDependencies = {
    userId,
    convexClient,
    createEmbedding,
  };

  return ChatToolkit.toLayer({
    FetchArticleContent: ({ url }: { url: string }) =>
      Effect.tryPromise({
        try: async () => {
          const content = await fetchArticleContent(url);
          if (typeof content === "string") return content;
          return content.textContent || content.content || "";
        },
        catch: (error) =>
          error instanceof Error ? error.message : String(error),
      }),

    GetSavedArticles: ({ query, personalize }: { query: string; personalize: boolean }) =>
      Effect.tryPromise({
        try: () => searchArticles(searchDeps, query, personalize, "saved"),
        catch: (error) =>
          error instanceof Error ? error.message : String(error),
      }),

    GetFeedArticles: ({ query, personalize }: { query: string; personalize: boolean }) =>
      Effect.tryPromise({
        try: () => searchArticles(searchDeps, query, personalize, "cached"),
        catch: (error) =>
          error instanceof Error ? error.message : String(error),
      }),

    UpdateKnowledge: ({ entities, relationships }: { entities: ReadonlyArray<KnowledgeGraphEntity>; relationships: ReadonlyArray<KnowledgeGraphRelationship> }) =>
      Effect.tryPromise({
        try: async () => {
          if (entities.length === 0 && relationships.length === 0) {
            return "No knowledge updates to process";
          }
          return await knowledgeTools.update_knowledge_graph({
            entities,
            relationships,
          });
        },
        catch: (error) =>
          error instanceof Error ? error.message : String(error),
      }),
  });
}

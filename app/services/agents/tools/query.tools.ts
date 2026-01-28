import { Tool } from "@luketandjung/ariadne";
import { Schema } from "effect";
import type { ConvexHttpClient } from "convex/browser";
import type { Id } from "convex/_generated/dataModel";
import { api } from "convex/_generated/api";
import { fetchArticleContent } from "./article.tools";

// --- Tool Definitions ---

export const GetSavedArticlesTool = Tool.make("GetSavedArticles", {
  description:
    "Search the user's saved articles by semantic similarity and fetch full content. Returns top-5 relevant articles with full text, links, and relevance scores.",
  parameters: {
    query: Schema.String.annotations({
      description: "What to search for (topic, keywords, or description)",
    }),
    personalize: Schema.Boolean.annotations({
      description:
        "If true, enriches search with user's interests. Use true for discovery, false for explicit topic searches.",
    }),
  },
  success: Schema.String,
  failure: Schema.String,
  failureMode: "return" as const,
});

export const GetFeedArticlesTool = Tool.make("GetFeedArticles", {
  description:
    "Search the user's RSS feed articles by semantic similarity and fetch full content. Returns top-5 relevant articles with full text, links, and relevance scores.",
  parameters: {
    query: Schema.String.annotations({
      description: "What to search for (topic, keywords, or description)",
    }),
    personalize: Schema.Boolean.annotations({
      description:
        "If true, enriches search with user's interests. Use true for discovery, false for explicit topic searches.",
    }),
  },
  success: Schema.String,
  failure: Schema.String,
  failureMode: "return" as const,
});

// --- Dependencies ---

export interface SearchToolDependencies {
  userId: Id<"users">;
  convexClient: ConvexHttpClient;
  createEmbedding: (text: string) => Promise<Array<number>>;
}

// --- Implementation Helpers ---

async function getUserInterests(
  userId: Id<"users">,
  convexClient: ConvexHttpClient,
  createEmbedding: (text: string) => Promise<Array<number>>,
): Promise<string | null> {
  try {
    const embedding = await createEmbedding("user");
    const vertices = await convexClient.action(
      api.knowledge_graph.search_vertices,
      { user_id: userId, embedding, limit: 1, threshold: 0.8 },
    );
    if (!vertices || vertices.length === 0) return null;

    const edges = await convexClient.query(
      api.knowledge_graph.get_edges_by_vertex,
      { vertex_id: vertices[0]._id, direction: "outgoing" },
    );
    if (!edges || edges.length === 0) return null;

    const headIds = edges.map((e) => e.head_vertex);
    const topics = await convexClient.query(
      api.knowledge_graph.get_vertices_by_ids,
      { vertex_ids: headIds },
    );

    const interests = topics
      .filter((t): t is NonNullable<typeof t> => t !== null && !!t.content)
      .map((t) => t.content)
      .join(", ");

    return interests || null;
  } catch (error) {
    console.error("Error fetching user interests:", error);
    return null;
  }
}

async function fetchArticlesContent(
  articles: Array<{ link: string; title: string; _score: number }>,
): Promise<
  Array<{ title: string; link: string; content: string; score: number }>
> {
  const results = await Promise.allSettled(
    articles.map(async (article) => {
      const content = await fetchArticleContent(article.link);
      const textContent =
        typeof content === "string"
          ? content
          : content.textContent || content.content || "";
      return {
        title: article.title,
        link: article.link,
        content: textContent,
        score: article._score,
      };
    }),
  );

  return results
    .filter(
      (
        r,
      ): r is PromiseFulfilledResult<{
        title: string;
        link: string;
        content: string;
        score: number;
      }> => r.status === "fulfilled",
    )
    .map((r) => r.value);
}

export async function searchArticles(
  deps: SearchToolDependencies,
  query: string,
  personalize: boolean,
  type: "saved" | "cached",
): Promise<string> {
  const { userId, convexClient, createEmbedding } = deps;

  let searchQuery = query;
  if (personalize) {
    const userInterests = await getUserInterests(
      userId,
      convexClient,
      createEmbedding,
    );
    if (userInterests) {
      searchQuery = `${query} | User interests: ${userInterests}`;
    }
  }

  const embedding = await createEmbedding(searchQuery);

  const action =
    type === "saved"
      ? api.article_search.search_saved_articles
      : api.article_search.search_cached_articles;

  const results = await convexClient.action(action, {
    user_id: userId,
    embedding,
    limit: 5,
  });

  if (!results || results.length === 0) {
    return "";
  }

  const articlesWithContent = await fetchArticlesContent(
    results.map((a: { title: string; link: string; _score: number }) => ({
      title: a.title,
      link: a.link,
      _score: a._score,
    })),
  );

  return articlesWithContent
    .map(
      (article) =>
        `Title: ${article.title}\nLink: ${article.link}\nRelevance: ${(article.score * 100).toFixed(1)}%\n\nContent:\n${article.content}`,
    )
    .join("\n\n---\n\n");
}

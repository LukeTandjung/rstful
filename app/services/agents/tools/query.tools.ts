import type { Id, Doc } from "convex/_generated/dataModel";

export interface SavedArticle {
  id: string;
  title: string;
  content: string;
  link: string;
  description?: string;
  author?: string;
  pubDate?: number;
  score?: number;
}

export interface CachedArticle {
  id: string;
  title: string;
  description?: string;
  link: string;
  score?: number;
}

type SavedContentWithScore = Doc<"saved_content"> & { _score: number };
type CachedContentWithScore = Doc<"cached_content"> & { _score: number };

export interface QueryToolDependencies {
  createEmbedding: (text: string) => Promise<Array<number>>;
  searchSavedContent: (args: {
    user_id: Id<"users">;
    embedding: Array<number>;
    limit?: number;
  }) => Promise<Array<SavedContentWithScore>>;
  searchCachedContent: (args: {
    user_id: Id<"users">;
    embedding: Array<number>;
    limit?: number;
  }) => Promise<Array<CachedContentWithScore>>;
}

export function createQueryTools(
  userId: Id<"users">,
  deps: QueryToolDependencies
) {
  /**
   * Searches the user's saved articles by semantic similarity.
   * Returns top-10 articles most relevant to the query.
   */
  async function searchSavedArticles(query: string): Promise<Array<SavedArticle>> {
    const embedding = await deps.createEmbedding(query);
    const results = await deps.searchSavedContent({
      user_id: userId,
      embedding,
      limit: 10,
    });
    return results.map((doc) => ({
      id: doc._id,
      title: doc.title,
      content: doc.content,
      link: doc.link,
      score: doc._score,
      ...(doc.description && { description: doc.description }),
      ...(doc.author && { author: doc.author }),
      ...(doc.pub_date && { pubDate: Number(doc.pub_date) }),
    }));
  }

  /**
   * Searches the user's RSS feed articles by semantic similarity.
   * Returns top-10 articles most relevant to the query.
   */
  async function searchFeedArticles(query: string): Promise<Array<CachedArticle>> {
    const embedding = await deps.createEmbedding(query);
    const results = await deps.searchCachedContent({
      user_id: userId,
      embedding,
      limit: 10,
    });
    return results.map((doc) => ({
      id: doc._id,
      title: doc.title,
      link: doc.link,
      score: doc._score,
      ...(doc.description && { description: doc.description }),
    }));
  }

  return { searchSavedArticles, searchFeedArticles };
}

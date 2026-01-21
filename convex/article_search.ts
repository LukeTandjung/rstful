import { action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";

// Internal query to get saved article by ID
export const get_saved_internal = internalQuery({
  args: { id: v.id("saved_content") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Internal query to get cached article by ID
export const get_cached_internal = internalQuery({
  args: { id: v.id("cached_content") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

type SavedContentWithScore = Doc<"saved_content"> & { _score: number };
type CachedContentWithScore = Doc<"cached_content"> & { _score: number };

// Vector search for saved articles
export const search_saved_articles = action({
  args: {
    user_id: v.id("users"),
    embedding: v.array(v.float64()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<SavedContentWithScore>> => {
    const results = await ctx.vectorSearch("saved_content", "by_embedding", {
      vector: args.embedding,
      limit: args.limit ?? 10,
      filter: (q) => q.eq("user_id", args.user_id),
    });

    // Fetch full documents and attach scores
    const articles = await Promise.all(
      results.map(async (r) => {
        const doc = await ctx.runQuery(internal.article_search.get_saved_internal, {
          id: r._id,
        });
        return doc ? { ...doc, _score: r._score } : null;
      })
    );

    return articles.filter((a): a is SavedContentWithScore => a !== null);
  },
});

// Vector search for cached (feed) articles
export const search_cached_articles = action({
  args: {
    user_id: v.id("users"),
    embedding: v.array(v.float64()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<CachedContentWithScore>> => {
    const results = await ctx.vectorSearch("cached_content", "by_embedding", {
      vector: args.embedding,
      limit: args.limit ?? 10,
      filter: (q) => q.eq("user_id", args.user_id),
    });

    // Fetch full documents and attach scores
    const articles = await Promise.all(
      results.map(async (r) => {
        const doc = await ctx.runQuery(internal.article_search.get_cached_internal, {
          id: r._id,
        });
        return doc ? { ...doc, _score: r._score } : null;
      })
    );

    return articles.filter((a): a is CachedContentWithScore => a !== null);
  },
});

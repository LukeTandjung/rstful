import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get_cached_articles = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("cached_content")
      .filter((q) => q.eq(q.field("user_id"), args.user_id))
      .order("desc")
      .collect();
    return articles;
  },
});

export const get_cached_articles_by_feed = query({
  args: { rss_feed_id: v.id("rss_feed") },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("cached_content")
      .withIndex("by_rss_feed_id", (q) => q.eq("rss_feed_id", args.rss_feed_id))
      .order("desc")
      .collect();
    return articles;
  },
});

export const get_unread_count_by_feed = query({
  args: { rss_feed_id: v.id("rss_feed") },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("cached_content")
      .withIndex("by_rss_feed_id", (q) => q.eq("rss_feed_id", args.rss_feed_id))
      .filter((q) => q.eq(q.field("is_read"), false))
      .collect();
    return articles.length;
  },
});

export const get_total_unread_count = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("cached_content")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
      .filter((q) => q.eq(q.field("is_read"), false))
      .collect();
    return articles.length;
  },
});

export const mark_as_read = mutation({
  args: {
    article_id: v.id("cached_content"),
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.article_id);

    if (!article) {
      throw new Error("Article not found");
    }

    if (article.user_id !== args.user_id) {
      throw new Error("Unauthorized: Article does not belong to user");
    }

    if (article.is_read) {
      return { success: true, alreadyRead: true };
    }

    await ctx.db.patch(args.article_id, { is_read: true });
    return { success: true, alreadyRead: false };
  },
});

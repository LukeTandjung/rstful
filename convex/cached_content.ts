import { query } from "./_generated/server";
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

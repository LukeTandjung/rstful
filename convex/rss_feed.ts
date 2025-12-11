import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get_rss_feed = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const rss_feeds = await ctx.db
      .query("rss_feed")
      .filter((query) => query.eq(query.field("user_id"), args.user_id))
      .collect();
    return rss_feeds;
  },
});

export const get_rss_feed_by_id = query({
  args: { feed_id: v.id("rss_feed") },
  handler: async (ctx, args) => {
    const feed = await ctx.db.get(args.feed_id);
    return feed;
  },
});

export const post_rss_feed = mutation({
  args: {
    user_id: v.id("users"),
    name: v.string(),
    category: v.string(),
    url: v.string(),
    status: v.string(),
    last_fetched: v.int64(),
    unread_count: v.optional(v.number()),
    failure_count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const new_rss_feed_id = ctx.db.insert("rss_feed", {
      user_id: args.user_id,
      name: args.name,
      category: args.category,
      url: args.url,
      status: args.status,
      last_fetched: args.last_fetched,
      unread_count: args.unread_count ?? 0,
      failure_count: args.failure_count ?? 0,
    });
    return new_rss_feed_id;
  },
});

export const put_rss_feed = mutation({
  args: {
    rss_feed_id: v.id("rss_feed"),
    name: v.string(),
    category: v.string(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const { rss_feed_id } = args;

    await ctx.db.patch(rss_feed_id, {
      name: args.name,
      category: args.category,
      url: args.url,
    });

    return rss_feed_id;
  },
});

export const delete_rss_feed = mutation({
  args: {
    rss_feed_id: v.id("rss_feed"),
  },
  handler: async (ctx, args) => {
    const { rss_feed_id } = args;

    await ctx.db.delete(rss_feed_id);

    return rss_feed_id;
  },
});

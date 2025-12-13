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

// Get all feeds for export (frontend will convert to OPML)
export const get_feeds_for_export = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const feeds = await ctx.db
      .query("rss_feed")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
      .collect();

    return feeds.map((feed) => ({
      name: feed.name,
      url: feed.url,
      category: feed.category,
    }));
  },
});

// Import feeds from parsed OPML (frontend parses OPML first)
export const import_feeds = mutation({
  args: {
    user_id: v.id("users"),
    feeds: v.array(
      v.object({
        name: v.string(),
        url: v.string(),
        category: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { user_id, feeds } = args;

    if (feeds.length === 0) {
      return { imported: 0, skipped: 0, errors: [] };
    }

    // Get existing feeds to check for duplicates
    const existingFeeds = await ctx.db
      .query("rss_feed")
      .withIndex("by_user_id", (q) => q.eq("user_id", user_id))
      .collect();
    const existingUrls = new Set(existingFeeds.map((f) => f.url.toLowerCase()));

    let imported = 0;
    let skipped = 0;
    const errors: Array<string> = [];

    for (const feed of feeds) {
      if (existingUrls.has(feed.url.toLowerCase())) {
        skipped++;
        continue;
      }

      try {
        await ctx.db.insert("rss_feed", {
          user_id,
          name: feed.name,
          category: feed.category,
          url: feed.url,
          status: "active",
          last_fetched: BigInt(0),
          failure_count: 0,
        });
        existingUrls.add(feed.url.toLowerCase());
        imported++;
      } catch (e) {
        errors.push(`Failed to import ${feed.url}: ${e}`);
      }
    }

    return { imported, skipped, errors };
  },
});

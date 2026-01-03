import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

export const get_cached_articles_paginated = query({
  args: {
    user_id: v.id("users"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cached_content")
      .withIndex("by_user_id_pub_date", (q) => q.eq("user_id", args.user_id))
      .order("desc")
      .paginate(args.paginationOpts);
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

    // Mark article as read
    await ctx.db.patch(args.article_id, { is_read: true });

    // Decrement feed unread_count
    if (article.rss_feed_id) {
      const feed = await ctx.db.get(article.rss_feed_id);
      if (feed) {
        const currentCount = feed.unread_count ?? BigInt(0);
        const newCount = BigInt(Math.max(0, Number(currentCount) - 1));
        await ctx.db.patch(article.rss_feed_id, { unread_count: newCount });
      }
    }

    // Decrement user total_unread_count
    const user = await ctx.db.get(args.user_id);
    if (user) {
      const currentCount = user.total_unread_count ?? BigInt(0);
      const newCount = BigInt(Math.max(0, Number(currentCount) - 1));
      await ctx.db.patch(args.user_id, { total_unread_count: newCount });
    }

    return { success: true, alreadyRead: false };
  },
});

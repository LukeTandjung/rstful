import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get_saved_content = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const saved_content = await ctx.db
      .query("saved_content")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
      .collect();
    return saved_content;
  },
});

export const post_saved_content = mutation({
  args: {
    user_id: v.id("users"),
    title: v.string(),
    content: v.string(),
    link: v.string(),
    description: v.optional(v.string()),
    author: v.optional(v.string()),
    pub_date: v.optional(v.int64()),
    rss_feed_id: v.optional(v.id("rss_feed")),
  },
  handler: async (ctx, args) => {
    const new_saved_content_id = await ctx.db.insert("saved_content", {
      user_id: args.user_id,
      title: args.title,
      content: args.content,
      link: args.link,
      ...(args.description && { description: args.description }),
      ...(args.author && { author: args.author }),
      ...(args.pub_date && { pub_date: args.pub_date }),
      ...(args.rss_feed_id && { rss_feed_id: args.rss_feed_id }),
      is_read: true, // Saved content is considered read
    });
    return new_saved_content_id;
  },
});

export const delete_saved_content = mutation({
  args: {
    saved_content_id: v.id("saved_content"),
  },
  handler: async (ctx, args) => {
    const { saved_content_id } = args;

    await ctx.db.delete(saved_content_id);

    return saved_content_id;
  },
});

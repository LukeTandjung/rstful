import { query, mutation, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

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

// Internal mutation for inserting saved content with embedding
export const post_saved_content_internal = internalMutation({
  args: {
    user_id: v.id("users"),
    title: v.string(),
    content: v.string(),
    link: v.string(),
    description: v.optional(v.string()),
    author: v.optional(v.string()),
    pub_date: v.optional(v.int64()),
    rss_feed_id: v.optional(v.id("rss_feed")),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    const new_saved_content_id = await ctx.db.insert("saved_content", {
      user_id: args.user_id,
      title: args.title,
      content: args.content,
      link: args.link,
      embedding: args.embedding,
      ...(args.description && { description: args.description }),
      ...(args.author && { author: args.author }),
      ...(args.pub_date && { pub_date: args.pub_date }),
      ...(args.rss_feed_id && { rss_feed_id: args.rss_feed_id }),
    });
    return new_saved_content_id;
  },
});

// Action that generates embedding then saves content
export const post_saved_content = action({
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
  handler: async (ctx, args): Promise<Id<"saved_content">> => {
    // Generate embedding for the article
    const embedding = await ctx.runAction(internal.embeddings.generate_article_embedding, {
      title: args.title,
      ...(args.description && { description: args.description }),
      content: args.content,
    });

    // Insert with embedding
    return await ctx.runMutation(internal.saved_content.post_saved_content_internal, {
      ...args,
      embedding,
    });
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
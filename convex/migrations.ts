import { internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import Dedalus from "dedalus-labs";

const EMBEDDING_BATCH_SIZE = 10;

const FEED_BATCH_SIZE = 10;

/**
 * Step 1: Reset all counts to 0 before re-running migration.
 * Run: bunx convex run --prod migrations:reset_counts
 */
export const reset_counts = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Resetting all counts to 0...");
    await ctx.runMutation(internal.migrations.reset_feeds_batch, {
      cursor: null,
    });
  },
});

export const reset_feeds_batch = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("rss_feed")
      .paginate({ cursor: args.cursor, numItems: 100 });

    for (const feed of results.page) {
      await ctx.db.patch(feed._id, { unread_count: BigInt(0) });
    }

    console.log(`Reset ${results.page.length} feeds...`);

    if (!results.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.reset_feeds_batch, {
        cursor: results.continueCursor,
      });
    } else {
      console.log("Feeds reset complete. Resetting users...");
      await ctx.scheduler.runAfter(0, internal.migrations.reset_users_batch, {
        cursor: null,
      });
    }
  },
});

export const reset_users_batch = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("users")
      .paginate({ cursor: args.cursor, numItems: 100 });

    for (const user of results.page) {
      await ctx.db.patch(user._id, { total_unread_count: BigInt(0) });
    }

    console.log(`Reset ${results.page.length} users...`);

    if (!results.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.reset_users_batch, {
        cursor: results.continueCursor,
      });
    } else {
      console.log("All counts reset to 0. Now run: bunx convex run --prod migrations:backfill_start");
    }
  },
});

/**
 * Step 2: Backfill unread_count on rss_feed and total_unread_count on users.
 * Run: bunx convex run --prod migrations:backfill_start
 */
export const backfill_start = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Starting migration...");
    await ctx.runMutation(internal.migrations.backfill_feed_batch, {
      cursor: null,
      userTotals: {},
      feedsProcessed: 0,
    });
  },
});

/**
 * Process a batch of feeds, counting unread articles for each.
 * Uses Convex cursor-based pagination for reliability.
 */
export const backfill_feed_batch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    userTotals: v.any(), // Record<string, number>
    feedsProcessed: v.number(),
  },
  handler: async (ctx, args) => {
    const userTotals: Record<string, number> = args.userTotals ?? {};
    let totalFeedsProcessed = args.feedsProcessed;

    // Use proper cursor-based pagination
    const results = await ctx.db
      .query("rss_feed")
      .paginate({ cursor: args.cursor, numItems: FEED_BATCH_SIZE });

    if (results.page.length === 0) {
      // No more feeds - update users and finish
      console.log("All feeds processed. Updating users...");
      await ctx.scheduler.runAfter(0, internal.migrations.backfill_update_users, {
        userTotals,
        feedsProcessed: totalFeedsProcessed,
      });
      return { status: "updating_users", feedsProcessed: totalFeedsProcessed };
    }

    // Process each feed in this batch
    for (const feed of results.page) {
      // Count unread articles for this feed
      const articles = await ctx.db
        .query("cached_content")
        .withIndex("by_rss_feed_id", (q) => q.eq("rss_feed_id", feed._id))
        .collect();

      const unreadCount = articles.filter((a) => !a.is_read).length;

      // Update feed's unread_count
      await ctx.db.patch(feed._id, { unread_count: BigInt(unreadCount) });

      // Accumulate user total
      const userId = feed.user_id;
      userTotals[userId] = (userTotals[userId] ?? 0) + unreadCount;

      totalFeedsProcessed++;
    }

    console.log(`Processed ${results.page.length} feeds (total: ${totalFeedsProcessed}). Scheduling next batch...`);

    if (!results.isDone) {
      // Schedule next batch with the continuation cursor
      await ctx.scheduler.runAfter(0, internal.migrations.backfill_feed_batch, {
        cursor: results.continueCursor,
        userTotals,
        feedsProcessed: totalFeedsProcessed,
      });
    } else {
      // All feeds done, update users
      console.log("All feeds processed. Updating users...");
      await ctx.scheduler.runAfter(0, internal.migrations.backfill_update_users, {
        userTotals,
        feedsProcessed: totalFeedsProcessed,
      });
    }

    return { status: "continuing", feedsProcessed: totalFeedsProcessed };
  },
});

/**
 * Update all users with their total unread counts
 */
export const backfill_update_users = internalMutation({
  args: {
    userTotals: v.any(),
    feedsProcessed: v.number(),
  },
  handler: async (ctx, args) => {
    const userTotals: Record<string, number> = args.userTotals ?? {};

    const users = await ctx.db.query("users").collect();
    let usersUpdated = 0;

    for (const user of users) {
      const totalUnread = userTotals[user._id] ?? 0;
      await ctx.db.patch(user._id, { total_unread_count: BigInt(totalUnread) });
      usersUpdated++;
    }

    console.log(`Migration complete! Processed ${args.feedsProcessed} feeds, updated ${usersUpdated} users.`);

    return {
      done: true,
      feedsProcessed: args.feedsProcessed,
      usersUpdated,
    };
  },
});

// ============================================================================
// EMBEDDING BACKFILL MIGRATION
// ============================================================================

/**
 * Backfill embeddings for saved_content or cached_content tables.
 * Run: bunx convex run --prod migrations:backfill_embeddings '{"table": "saved_content"}'
 * Run: bunx convex run --prod migrations:backfill_embeddings '{"table": "cached_content"}'
 */
export const backfill_embeddings = internalAction({
  args: {
    table: v.union(v.literal("saved_content"), v.literal("cached_content")),
  },
  handler: async (ctx, args) => {
    console.log(`Starting embedding backfill for ${args.table}...`);
    await ctx.runAction(internal.migrations.backfill_embeddings_batch, {
      table: args.table,
      cursor: null,
      processed: 0,
    });
  },
});

// Query to get records without embeddings
export const get_records_without_embedding = internalQuery({
  args: {
    table: v.union(v.literal("saved_content"), v.literal("cached_content")),
    cursor: v.union(v.string(), v.null()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const query = args.table === "saved_content"
      ? ctx.db.query("saved_content")
      : ctx.db.query("cached_content");

    const results = await query.paginate({
      cursor: args.cursor,
      numItems: args.limit,
    });

    // Filter to only records without embeddings
    const recordsWithoutEmbedding = results.page.filter(
      (r) => !r.embedding || r.embedding.length === 0
    );

    return {
      records: recordsWithoutEmbedding,
      continueCursor: results.continueCursor,
      isDone: results.isDone,
    };
  },
});

// Mutation to update a record with its embedding
export const update_record_embedding = internalMutation({
  args: {
    table: v.union(v.literal("saved_content"), v.literal("cached_content")),
    id: v.union(v.id("saved_content"), v.id("cached_content")),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    if (args.table === "saved_content") {
      await ctx.db.patch(args.id as Id<"saved_content">, { embedding: args.embedding });
    } else {
      await ctx.db.patch(args.id as Id<"cached_content">, { embedding: args.embedding });
    }
  },
});

// Process a batch of records, generate embeddings, and update
export const backfill_embeddings_batch = internalAction({
  args: {
    table: v.union(v.literal("saved_content"), v.literal("cached_content")),
    cursor: v.union(v.string(), v.null()),
    processed: v.number(),
  },
  handler: async (ctx, args): Promise<{ done: boolean; processed: number }> => {
    // Get batch of records without embeddings
    const batch: {
      records: Array<{ _id: Id<"saved_content"> | Id<"cached_content">; title: string; description?: string; content: string }>;
      continueCursor: string;
      isDone: boolean;
    } = await ctx.runQuery(internal.migrations.get_records_without_embedding, {
      table: args.table,
      cursor: args.cursor,
      limit: EMBEDDING_BATCH_SIZE,
    });

    // If no records need processing, check if we should continue or finish
    if (batch.records.length === 0) {
      if (batch.isDone) {
        console.log(`Embedding backfill complete for ${args.table}! Processed ${args.processed} records.`);
        return { done: true, processed: args.processed };
      }
      // Continue to next page (this batch had all records already embedded)
      await ctx.scheduler.runAfter(0, internal.migrations.backfill_embeddings_batch, {
        table: args.table,
        cursor: batch.continueCursor,
        processed: args.processed,
      });
      return { done: false, processed: args.processed };
    }

    // Generate embeddings for this batch (parallel within batch)
    const embeddings = await ctx.runAction(internal.embeddings.generate_article_embeddings_batch, {
      articles: batch.records.map((r: { title: string; description?: string; content: string }) => ({
        title: r.title,
        ...(r.description && { description: r.description }),
        content: r.content,
      })),
    });

    // Update each record with its embedding
    for (let i = 0; i < batch.records.length; i++) {
      await ctx.runMutation(internal.migrations.update_record_embedding, {
        table: args.table,
        id: batch.records[i]._id,
        embedding: embeddings[i],
      });
    }

    const newProcessed = args.processed + batch.records.length;
    console.log(`Processed ${batch.records.length} records (total: ${newProcessed})...`);

    // Schedule next batch
    if (!batch.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfill_embeddings_batch, {
        table: args.table,
        cursor: batch.continueCursor,
        processed: newProcessed,
      });
    } else {
      console.log(`Embedding backfill complete for ${args.table}! Processed ${newProcessed} records.`);
    }

    return { done: batch.isDone, processed: newProcessed };
  },
});

// ============================================================================
// REMOVE DEEP SEARCH MIGRATION
// ============================================================================

/**
 * Migrate deep_search conversations to regular and remove deep_search_used from settings.
 * Run: bunx convex run migrations:remove_deep_search
 */
export const remove_deep_search = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Convert all deep_search conversations to regular
    const allChats = await ctx.db.query("group_chat").collect();
    let chatsConverted = 0;
    for (const chat of allChats) {
      if ((chat as any).mode === "deep_search") {
        await ctx.db.patch(chat._id, { mode: "regular" } as any);
        chatsConverted++;
      }
    }

    // Remove deep_search_used from all settings rows
    const allSettings = await ctx.db.query("settings").collect();
    let settingsUpdated = 0;
    for (const settings of allSettings) {
      if ((settings as any).deep_search_used !== undefined) {
        // Convex doesn't support deleting fields via patch, so we replace the document
        await ctx.db.replace(settings._id, {
          user_id: settings.user_id,
          messages_used: settings.messages_used,
          subscription_period_start: settings.subscription_period_start,
        });
        settingsUpdated++;
      }
    }

    console.log(`Migration complete: converted ${chatsConverted} deep_search conversations, updated ${settingsUpdated} settings rows.`);
    return { chatsConverted, settingsUpdated };
  },
});


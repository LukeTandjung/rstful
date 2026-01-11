import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import Dedalus from "dedalus-labs";

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


import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const FEED_BATCH_SIZE = 10;

/**
 * Migration: Backfill unread_count on rss_feed and total_unread_count on users.
 *
 * Run this to start the batched migration:
 *   bunx convex run migrations:backfill_start
 */
export const backfill_start = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Starting migration...");
    await ctx.runMutation(internal.migrations.backfill_feed_batch, {
      lastFeedId: null,
      userTotals: {},
      feedsProcessed: 0,
    });
  },
});

/**
 * Process a batch of feeds, counting unread articles for each.
 * Uses scheduler to continue with next batch to avoid timeouts.
 */
export const backfill_feed_batch = internalMutation({
  args: {
    lastFeedId: v.union(v.id("rss_feed"), v.null()),
    userTotals: v.any(), // Record<string, number>
    feedsProcessed: v.number(),
  },
  handler: async (ctx, args) => {
    const userTotals: Record<string, number> = args.userTotals ?? {};
    let totalFeedsProcessed = args.feedsProcessed;

    // Query feeds after the last processed ID
    let query = ctx.db.query("rss_feed").withIndex("by_last_fetched");

    // Take a batch
    const allFeeds = await query.take(FEED_BATCH_SIZE + (args.lastFeedId ? 100 : 0));

    // If we have a lastFeedId, find feeds after it
    let feedsBatch: typeof allFeeds;
    if (args.lastFeedId) {
      const lastIndex = allFeeds.findIndex(f => f._id === args.lastFeedId);
      if (lastIndex === -1) {
        // Last feed not found in this batch, need to scan more
        // For now, just take from the beginning of what we got
        feedsBatch = allFeeds.slice(0, FEED_BATCH_SIZE);
      } else {
        feedsBatch = allFeeds.slice(lastIndex + 1, lastIndex + 1 + FEED_BATCH_SIZE);
      }
    } else {
      feedsBatch = allFeeds.slice(0, FEED_BATCH_SIZE);
    }

    if (feedsBatch.length === 0) {
      // No more feeds - update users and finish
      console.log("All feeds processed. Updating users...");
      await ctx.scheduler.runAfter(0, internal.migrations.backfill_update_users, {
        userTotals,
        feedsProcessed: totalFeedsProcessed,
      });
      return { status: "updating_users", feedsProcessed: totalFeedsProcessed };
    }

    // Process each feed in this batch
    for (const feed of feedsBatch) {
      // Count unread articles for this feed
      // Use take() with a reasonable limit to avoid memory issues
      let unreadCount = 0;
      const articles = await ctx.db
        .query("cached_content")
        .withIndex("by_rss_feed_id", (q) => q.eq("rss_feed_id", feed._id))
        .take(1000); // Most feeds won't have more than 1000 articles

      for (const article of articles) {
        if (!article.is_read) {
          unreadCount++;
        }
      }

      // Update feed's unread_count
      await ctx.db.patch(feed._id, { unread_count: BigInt(unreadCount) });

      // Accumulate user total
      const userId = feed.user_id;
      userTotals[userId] = (userTotals[userId] ?? 0) + unreadCount;

      totalFeedsProcessed++;
    }

    const lastFeed = feedsBatch[feedsBatch.length - 1];
    console.log(`Processed ${feedsBatch.length} feeds (total: ${totalFeedsProcessed}). Scheduling next batch...`);

    // Schedule next batch
    await ctx.scheduler.runAfter(0, internal.migrations.backfill_feed_batch, {
      lastFeedId: lastFeed._id,
      userTotals,
      feedsProcessed: totalFeedsProcessed,
    });

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

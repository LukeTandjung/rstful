import { internalMutation } from "./_generated/server";

/**
 * Migration: Backfill unread_count on rss_feed and total_unread_count on users.
 *
 * Run this once after deploying the schema changes:
 *   npx convex run migrations:backfill_unread_counts
 */
export const backfill_unread_counts = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all feeds
    const feeds = await ctx.db.query("rss_feed").collect();

    // Count unread articles per feed
    const feedUnreadCounts = new Map<string, number>();
    const userUnreadCounts = new Map<string, number>();

    // Get all unread articles
    const unreadArticles = await ctx.db
      .query("cached_content")
      .filter((q) => q.eq(q.field("is_read"), false))
      .collect();

    // Count per feed and per user
    for (const article of unreadArticles) {
      if (article.rss_feed_id) {
        const currentFeedCount = feedUnreadCounts.get(article.rss_feed_id) ?? 0;
        feedUnreadCounts.set(article.rss_feed_id, currentFeedCount + 1);
      }

      const currentUserCount = userUnreadCounts.get(article.user_id) ?? 0;
      userUnreadCounts.set(article.user_id, currentUserCount + 1);
    }

    // Update all feeds with their unread counts
    let feedsUpdated = 0;
    for (const feed of feeds) {
      const unreadCount = feedUnreadCounts.get(feed._id) ?? 0;
      await ctx.db.patch(feed._id, { unread_count: BigInt(unreadCount) });
      feedsUpdated++;
    }

    // Update all users with their total unread counts
    const users = await ctx.db.query("users").collect();
    let usersUpdated = 0;
    for (const user of users) {
      const totalUnread = userUnreadCounts.get(user._id) ?? 0;
      await ctx.db.patch(user._id, { total_unread_count: BigInt(totalUnread) });
      usersUpdated++;
    }

    return {
      feedsUpdated,
      usersUpdated,
      totalUnreadArticles: unreadArticles.length,
    };
  },
});

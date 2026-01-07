import { ScrollArea } from "@base-ui-components/react/scroll-area";
import { Separator } from "@base-ui-components/react/separator";
import { BookOpenIcon } from "@heroicons/react/24/outline";
import { useQuery, useMutation, useAction } from "convex/react";
import { Effect } from "effect";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { FeedIconItem } from "./FeedIconItem";
import { AddFeedDialog } from "./AddFeedDialog";
import { RssFeedService, make_rss_feed_service_live } from "services/rss_feed";

interface FeedSidebarProps {
  userId?: Id<"users"> | undefined;
}

export function FeedSidebar({ userId }: FeedSidebarProps) {
  // Query feeds
  const feeds = useQuery(
    api.rss_feed.get_rss_feed,
    userId ? { user_id: userId } : "skip",
  );

  // Get mutation and action functions
  const postRssFeed = useMutation(api.rss_feed.post_rss_feed);
  const putRssFeed = useMutation(api.rss_feed.put_rss_feed);
  const deleteRssFeed = useMutation(api.rss_feed.delete_rss_feed);
  const fetchUserFeeds = useAction(api.rss_fetcher.fetch_user_feeds);
  const refreshFeed = useAction(api.rss_fetcher.fetch_single_feed_action);

  // Create the service Layer
  const RssFeedServiceLayer = make_rss_feed_service_live(
    postRssFeed,
    putRssFeed,
    deleteRssFeed,
    fetchUserFeeds,
    refreshFeed,
  );

  const feedsList = feeds ?? [];

  // Calculate unread counts from feed docs
  const unreadCountByFeed = feedsList.reduce(
    (acc: Record<string, number>, feed) => {
      acc[feed._id] = Number(feed.unread_count ?? 0);
      return acc;
    },
    {},
  );
  const totalUnread = feedsList.reduce(
    (sum, feed) => sum + Number(feed.unread_count ?? 0),
    0,
  );

  const handleRefreshFeed = (feedId: Id<"rss_feed">) => {
    const program = RssFeedService.pipe(
      Effect.flatMap((service) => service.refresh_feed(feedId)),
      Effect.tap(() =>
        Effect.sync(() => console.log("Feed refreshed successfully")),
      ),
      Effect.provide(RssFeedServiceLayer),
      Effect.catchAll((error) =>
        Effect.sync(() => console.error("Failed to refresh feed:", error)),
      ),
    );
    Effect.runPromise(program);
  };

  const handleAddFeed = (
    name: string,
    category: string,
    url: string,
    website_url: string,
  ) => {
    if (!userId) {
      console.error("Cannot add feed: user not authenticated");
      return;
    }
    const program = RssFeedService.pipe(
      Effect.flatMap((service) =>
        service.create_rss_feed(userId, name, category, url, website_url),
      ),
      Effect.tap((newFeedId) =>
        Effect.sync(() => console.log("Feed created with ID:", newFeedId)),
      ),
      Effect.provide(RssFeedServiceLayer),
      Effect.catchAll((error) =>
        Effect.sync(() => console.error("Failed to add feed:", error)),
      ),
    );
    Effect.runPromise(program);
  };

  const handleEditFeed = (
    feedId: Id<"rss_feed">,
    name: string,
    category: string,
    url: string,
    website_url: string,
  ) => {
    const program = RssFeedService.pipe(
      Effect.flatMap((service) =>
        service.update_rss_feed(feedId, name, category, url, website_url),
      ),
      Effect.tap(() =>
        Effect.sync(() => console.log("Feed updated successfully")),
      ),
      Effect.provide(RssFeedServiceLayer),
      Effect.catchAll((error) =>
        Effect.sync(() => console.error("Failed to update feed:", error)),
      ),
    );
    Effect.runPromise(program);
  };

  const handleRemoveFeed = (feedId: Id<"rss_feed">) => {
    const program = RssFeedService.pipe(
      Effect.flatMap((service) => service.delete_rss_feed(feedId)),
      Effect.tap(() =>
        Effect.sync(() => console.log("Feed deleted successfully")),
      ),
      Effect.provide(RssFeedServiceLayer),
      Effect.catchAll((error) =>
        Effect.sync(() => console.error("Failed to delete feed:", error)),
      ),
    );
    Effect.runPromise(program);
  };

  return (
    <aside className="glass-card rounded-lg p-3 flex flex-col gap-3 h-full">
      <div className="relative size-10 self-center">
        <BookOpenIcon className="size-10 text-text" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-error text-background text-xs font-medium min-w-5 h-5 flex items-center justify-center rounded-full px-1">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </div>

      <Separator className="h-px bg-border-unfocus" />

      <ScrollArea.Root className="flex-1 min-h-0 -mr-1">
        <ScrollArea.Viewport className="h-full pt-1 pr-1">
          <div className="flex flex-col gap-2">
            {feedsList.map((feed) => (
              <FeedIconItem
                key={feed._id}
                feed={feed}
                unreadCount={unreadCountByFeed[feed._id] || 0}
                onRefresh={handleRefreshFeed}
                onEdit={handleEditFeed}
                onRemove={handleRemoveFeed}
              />
            ))}
          </div>
        </ScrollArea.Viewport>
      </ScrollArea.Root>

      <AddFeedDialog onAdd={handleAddFeed} />
    </aside>
  );
}

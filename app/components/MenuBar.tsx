import { NavigationMenu } from "@base-ui-components/react/navigation-menu";
import { Separator } from "@base-ui-components/react/separator";
import { Link, useLocation } from "react-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { Effect } from "effect";
import { api } from "convex/_generated/api";
import type { Id, Doc } from "convex/_generated/dataModel";
import { FeedPopover } from "./FeedPopover";
import { useHighlighter } from "services/highlighter";
import { RssFeedService, make_rss_feed_service_live } from "services/rss_feed";

interface MenuBarProps {
  userName?: string | undefined;
  userId?: Id<"users"> | undefined;
}

export function MenuBar({ userName, userId }: MenuBarProps) {
  const location = useLocation();
  const hlFeeds = useHighlighter();
  const hlStarred = useHighlighter();
  const hlChat = useHighlighter();
  const hlSettings = useHighlighter();
  const hlContact = useHighlighter();

  // Query feeds and articles
  const feeds = useQuery(
    api.rss_feed.get_rss_feed,
    userId ? { user_id: userId } : "skip"
  );
  const cachedArticles = useQuery(
    api.cached_content.get_cached_articles,
    userId ? { user_id: userId } : "skip"
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
    refreshFeed
  );

  const feedsList = feeds ?? [];

  // Calculate unread counts
  const unreadCountByFeed = (cachedArticles ?? []).reduce(
    (acc: Record<string, number>, article: Doc<"cached_content">) => {
      if (!article.is_read && article.rss_feed_id) {
        acc[article.rss_feed_id] = (acc[article.rss_feed_id] || 0) + 1;
      }
      return acc;
    },
    {}
  );
  const totalUnread = (cachedArticles ?? []).filter((a) => !a.is_read).length;

  const handleRefreshFeed = (feedId: Id<"rss_feed">) => {
    const program = RssFeedService.pipe(
      Effect.flatMap((service) => service.refresh_feed(feedId)),
      Effect.tap(() =>
        Effect.sync(() => console.log("Feed refreshed successfully"))
      ),
      Effect.provide(RssFeedServiceLayer),
      Effect.catchAll((error) =>
        Effect.sync(() => console.error("Failed to refresh feed:", error))
      )
    );
    Effect.runPromise(program);
  };

  const handleAddFeed = (name: string, category: string, url: string, website_url: string) => {
    if (!userId) {
      console.error("Cannot add feed: user not authenticated");
      return;
    }
    const program = RssFeedService.pipe(
      Effect.flatMap((service) => service.create_rss_feed(userId, name, category, url, website_url)),
      Effect.tap((newFeedId) =>
        Effect.sync(() => console.log("Feed created with ID:", newFeedId))
      ),
      Effect.provide(RssFeedServiceLayer),
      Effect.catchAll((error) =>
        Effect.sync(() => console.error("Failed to add feed:", error))
      )
    );
    Effect.runPromise(program);
  };

  const handleEditFeed = (feedId: Id<"rss_feed">, name: string, category: string, url: string, website_url: string) => {
    const program = RssFeedService.pipe(
      Effect.flatMap((service) => service.update_rss_feed(feedId, name, category, url, website_url)),
      Effect.tap(() =>
        Effect.sync(() => console.log("Feed updated successfully"))
      ),
      Effect.provide(RssFeedServiceLayer),
      Effect.catchAll((error) =>
        Effect.sync(() => console.error("Failed to update feed:", error))
      )
    );
    Effect.runPromise(program);
  };

  const handleRemoveFeed = (feedId: Id<"rss_feed">) => {
    const program = RssFeedService.pipe(
      Effect.flatMap((service) => service.delete_rss_feed(feedId)),
      Effect.tap(() =>
        Effect.sync(() => console.log("Feed deleted successfully"))
      ),
      Effect.provide(RssFeedServiceLayer),
      Effect.catchAll((error) =>
        Effect.sync(() => console.error("Failed to delete feed:", error))
      )
    );
    Effect.runPromise(program);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="flex items-center justify-between w-full">
      <FeedPopover
        feeds={feedsList}
        unreadCountByFeed={unreadCountByFeed}
        totalUnread={totalUnread}
        userName={userName}
        onRefresh={handleRefreshFeed}
        onEdit={handleEditFeed}
        onRemove={handleRemoveFeed}
        onAdd={handleAddFeed}
      />

      <div className="flex items-stretch">
        <NavigationMenu.Root className="flex h-full">
          <NavigationMenu.List className="flex h-full items-center justify-end gap-6">
            <NavigationMenu.Item className="flex items-center">
              <Link to="/">
                <NavigationMenu.Trigger
                  data-active={isActive("/")}
                  style={
                    {
                      "--hl-bg": hlFeeds.bg,
                      "--hl-text": hlFeeds.text,
                    } as React.CSSProperties
                  }
                  className="flex items-center px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text transition-colors data-[active=true]:bg-(--hl-bg) data-[active=true]:text-(--hl-text)"
                >
                  Feeds
                </NavigationMenu.Trigger>
              </Link>
            </NavigationMenu.Item>

            <NavigationMenu.Item className="flex items-center">
              <Link to="/starred">
                <NavigationMenu.Trigger
                  data-active={isActive("/starred")}
                  style={
                    {
                      "--hl-bg": hlStarred.bg,
                      "--hl-text": hlStarred.text,
                    } as React.CSSProperties
                  }
                  className="flex items-center px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text transition-colors data-[active=true]:bg-(--hl-bg) data-[active=true]:text-(--hl-text)"
                >
                  Starred
                </NavigationMenu.Trigger>
              </Link>
            </NavigationMenu.Item>

            <NavigationMenu.Item className="flex items-center">
              <Link to="/chat">
                <NavigationMenu.Trigger
                  data-active={isActive("/chat")}
                  style={
                    {
                      "--hl-bg": hlChat.bg,
                      "--hl-text": hlChat.text,
                    } as React.CSSProperties
                  }
                  className="flex items-center px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text transition-colors data-[active=true]:bg-(--hl-bg) data-[active=true]:text-(--hl-text)"
                >
                  Chat
                </NavigationMenu.Trigger>
              </Link>
            </NavigationMenu.Item>

            <Separator
              orientation="vertical"
              className="h-4 w-0.5 bg-border-unfocus"
            />

            <NavigationMenu.Item className="flex items-center">
              <Link to="/settings">
                <NavigationMenu.Trigger
                  data-active={isActive("/settings")}
                  style={
                    {
                      "--hl-bg": hlSettings.bg,
                      "--hl-text": hlSettings.text,
                    } as React.CSSProperties
                  }
                  className="flex items-center px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text transition-colors data-[active=true]:bg-(--hl-bg) data-[active=true]:text-(--hl-text)"
                >
                  Settings
                </NavigationMenu.Trigger>
              </Link>
            </NavigationMenu.Item>

            <NavigationMenu.Item className="flex items-center">
              <a href="mailto:support@rstful.com">
                <NavigationMenu.Trigger
                  style={
                    {
                      "--hl-bg": hlContact.bg,
                      "--hl-text": hlContact.text,
                    } as React.CSSProperties
                  }
                  className="flex items-center px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text transition-colors hover:bg-(--hl-bg) hover:text-(--hl-text)"
                >
                  Contact
                </NavigationMenu.Trigger>
              </a>
            </NavigationMenu.Item>
          </NavigationMenu.List>
        </NavigationMenu.Root>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import type { Route } from "./+types/index";
import type { RssFeed, RssArticle } from "types";
import { Separator } from "@base-ui-components/react/separator";
import { ScrollArea } from "@base-ui-components/react/scroll-area";
import { NewspaperIcon, RectangleStackIcon } from "@heroicons/react/16/solid";
import { Effect } from "effect";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "convex/_generated/api";
import {
  SectionCard,
  MenuBar,
  FeedCollapsibleItem,
  AddFeedDialog,
  ArticleListItem,
  ArticleReader,
} from "components";
import { RssFeedService, make_rss_feed_service_live } from "services/rss_feed";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "RSS Reader" },
    {
      name: "description",
      content: "Read and manage your RSS feeds",
    },
  ];
}

export default function Home() {
  // TODO: Get actual user_id from auth
  const user_id = "temp_user_id" as any; // Replace with actual auth

  const queryFn = useQuery;
  const mutateFn = useMutation;

  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [articles, setArticles] = useState<RssArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<RssArticle | null>(
    null,
  );
  const [isLoadingFeeds, setIsLoadingFeeds] = useState(true);
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);

  // Create the service Layer
  const RssFeedServiceLayer = make_rss_feed_service_live(queryFn, mutateFn);

  // Load feeds on mount using Effect-TS
  useEffect(() => {
    const program = RssFeedService.pipe(
      Effect.flatMap((service) => service.get_rss_feeds(user_id)),
      Effect.tap((fetchedFeeds) =>
        Effect.sync(() => {
          setFeeds(fetchedFeeds as any); // TODO: Map to RssFeed type
          setIsLoadingFeeds(false);
        })
      ),
      Effect.provide(RssFeedServiceLayer),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          console.error("Failed to load feeds:", error);
          setIsLoadingFeeds(false);
        })
      )
    );

    Effect.runPromise(program);
  }, []);

  const handleRefreshFeed = (feedId: string) => {
    // TODO: Implement refresh logic with articles service
    console.log("Refresh feed:", feedId);
  };

  const handleAddFeed = (url: string, name: string, category: string) => {
    const program = RssFeedService.pipe(
      Effect.flatMap((service) =>
        service.create_rss_feed(user_id, name, category, url)
      ),
      Effect.tap((newFeedId) =>
        Effect.sync(() => {
          console.log("Feed created with ID:", newFeedId);
          // Reload feeds
          RssFeedService.pipe(
            Effect.flatMap((service) => service.get_rss_feeds(user_id)),
            Effect.tap((fetchedFeeds) =>
              Effect.sync(() => setFeeds(fetchedFeeds as any))
            ),
            Effect.provide(RssFeedServiceLayer),
            Effect.runPromise
          );
        })
      ),
      Effect.provide(RssFeedServiceLayer),
      Effect.catchAll((error) =>
        Effect.sync(() => console.error("Failed to add feed:", error))
      )
    );

    Effect.runPromise(program);
  };

  const handleRemoveFeed = (feedId: string) => {
    const program = RssFeedService.pipe(
      Effect.flatMap((service) => service.delete_rss_feed(feedId as any)),
      Effect.tap(() =>
        Effect.sync(() =>
          setFeeds((prev) => prev.filter((f) => f.id !== feedId))
        )
      ),
      Effect.provide(RssFeedServiceLayer),
      Effect.catchAll((error) =>
        Effect.sync(() => console.error("Failed to delete feed:", error))
      )
    );

    Effect.runPromise(program);
  };

  const handleArticleSelect = (article: RssArticle) => {
    setSelectedArticle(article);
    // TODO: Implement mark as read with articles service
  };

  const handleToggleStar = (articleId: string) => {
    // TODO: Implement toggle star with articles service
    console.log("Toggle star:", articleId);
  };

  const totalUnread = feeds.reduce((sum, feed) => sum + feed.unreadCount, 0);

  return (
    <div className="flex flex-col md:flex-row gap-6 md:grow md:min-h-0 w-full">
      {/* RSS Feeds Section */}
      <SectionCard
        icon={<RectangleStackIcon className="size-7" />}
        title="RSS Feeds"
        description={`${feeds.length} feeds • ${totalUnread} unread articles`}
        className="md:w-1/3 md:min-h-0"
      >
        {isLoadingFeeds ? (
          <div className="flex items-center justify-center py-8">
            <div className="font-normal text-base leading-7 text-text-alt">
              Loading feeds...
            </div>
          </div>
        ) : (
          <>
            <ScrollArea.Root className="flex grow min-h-0 w-full">
              <ScrollArea.Viewport className="flex grow min-h-0">
                <div className="flex flex-col gap-3.5 grow min-h-0">
                  {feeds.map((feed) => (
                    <FeedCollapsibleItem
                      key={feed.id}
                      feed={feed}
                      onRefresh={handleRefreshFeed}
                      onRemove={handleRemoveFeed}
                    />
                  ))}
                </div>
              </ScrollArea.Viewport>
            </ScrollArea.Root>

            <AddFeedDialog trigger="Add Feed" onAdd={handleAddFeed} />
          </>
        )}
      </SectionCard>

      {/* Articles List Section */}
      <SectionCard
        icon={<NewspaperIcon className="size-7" />}
        title="Articles"
        description={`${articles.filter((a) => !a.isRead).length} unread`}
        className="md:w-1/3 md:min-h-0"
      >
        {isLoadingArticles ? (
          <div className="flex items-center justify-center py-8">
            <div className="font-normal text-base leading-7 text-text-alt">
              Loading articles...
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="font-normal text-base leading-7 text-text-alt">
              No articles to display
            </div>
          </div>
        ) : (
          <ScrollArea.Root className="flex grow min-h-0 w-full">
            <ScrollArea.Viewport className="flex grow min-h-0">
              <div className="flex flex-col gap-3 grow min-h-0">
                {articles.map((article) => (
                  <ArticleListItem
                    key={article.id}
                    article={article}
                    onSelect={handleArticleSelect}
                    onToggleStar={handleToggleStar}
                    isSelected={selectedArticle?.id === article.id}
                  />
                ))}
              </div>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        )}
      </SectionCard>

      {/* Article Reader Section */}
      <SectionCard
        icon={<NewspaperIcon className="size-7" />}
        title="Reader"
        description={
          selectedArticle ? selectedArticle.title : "No article selected"
        }
        className="md:w-1/3 md:min-h-0"
      >
        <ScrollArea.Root className="flex grow min-h-0 w-full">
          <ScrollArea.Viewport className="flex grow min-h-0 p-4">
            <ArticleReader
              article={selectedArticle}
              onToggleStar={handleToggleStar}
            />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </SectionCard>
    </div>
  );
}

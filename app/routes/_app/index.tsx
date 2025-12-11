import { useState, useEffect } from "react";
import type { Route } from "./+types/index";
import type { RssFeed } from "types";
import type { Id, Doc } from "convex/_generated/dataModel";
import { Separator } from "@base-ui-components/react/separator";
import { ScrollArea } from "@base-ui-components/react/scroll-area";
import { NewspaperIcon, RectangleStackIcon } from "@heroicons/react/16/solid";
import { Effect } from "effect";
import { useQuery, useMutation, useAction } from "convex/react";
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
  const { signOut } = useAuthActions();
  const viewer = useQuery(api.auth.currentUser);

  const [selectedArticle, setSelectedArticle] = useState<Doc<"cached_content"> | Doc<"saved_content"> | null>(null);

  // Get user_id from authenticated user
  const user_id = viewer?._id;

  // Use Convex query directly for reactive feeds data
  const feeds = useQuery(
    api.rss_feed.get_rss_feed,
    user_id ? { user_id } : "skip"
  );

  // Get mutation and action functions
  const postRssFeed = useMutation(api.rss_feed.post_rss_feed);
  const putRssFeed = useMutation(api.rss_feed.put_rss_feed);
  const deleteRssFeed = useMutation(api.rss_feed.delete_rss_feed);
  const fetchUserFeeds = useAction(api.rss_fetcher.fetch_user_feeds);
  const refreshFeed = useAction(api.rss_fetcher.fetch_single_feed_action);

  // Get cached articles for the user
  const cachedArticles = useQuery(
    api.cached_content.get_cached_articles,
    user_id ? { user_id } : "skip"
  );

  // Get saved articles for the user
  const savedArticles = useQuery(
    api.saved_content.get_saved_content,
    user_id ? { user_id } : "skip"
  );

  // Mutations for saved_content
  const postSavedContent = useMutation(api.saved_content.post_saved_content);
  const deleteSavedContent = useMutation(api.saved_content.delete_saved_content);

  // Create the service Layer
  const RssFeedServiceLayer = make_rss_feed_service_live(
    postRssFeed,
    putRssFeed,
    deleteRssFeed,
    fetchUserFeeds,
    refreshFeed
  );

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

  const handleAddFeed = (name: string, category: string, url: string) => {
    if (!user_id) {
      console.error("Cannot add feed: user not authenticated");
      return;
    }

    const program = RssFeedService.pipe(
      Effect.flatMap((service) => service.create_rss_feed(user_id, name, category, url)),
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

  const handleEditFeed = (feedId: Id<"rss_feed">, name: string, category: string, url: string) => {
    const program = RssFeedService.pipe(
      Effect.flatMap((service) => service.update_rss_feed(feedId, name, category, url)),
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

  const handleArticleSelect = (article: Doc<"cached_content"> | Doc<"saved_content">) => {
    setSelectedArticle(article);
    // TODO: Implement mark as read with articles service
  };

  const handleToggleStar = (articleId: string) => {
    if (!user_id) {
      console.error("Cannot save article: user not authenticated");
      return;
    }

    const article = articles.find((a) => a._id === articleId);
    if (!article) {
      console.error("Article not found:", articleId);
      return;
    }

    // Check if already saved by matching link
    const savedArticle = savedArticles?.find((s) => s.link === article.link);

    if (savedArticle) {
      // Already saved, so remove it
      deleteSavedContent({ saved_content_id: savedArticle._id })
        .then(() => console.log("Article removed from saved:", articleId))
        .catch((error) => console.error("Failed to remove article:", error));
    } else {
      // Not saved, so add it
      postSavedContent({
        user_id,
        title: article.title,
        content: article.content,
        link: article.link,
        ...(article.description && { description: article.description }),
        ...(article.author && { author: article.author }),
        ...(article.pub_date && { pub_date: article.pub_date }),
        ...(article.rss_feed_id && { rss_feed_id: article.rss_feed_id }),
      })
        .then(() => console.log("Article saved:", articleId))
        .catch((error) => console.error("Failed to save article:", error));
    }
  };

  const isLoadingFeeds = feeds === undefined;
  const feedsList = feeds ?? [];
  const totalUnread = feedsList.reduce((sum: number, feed: Doc<"rss_feed">) => sum + feed.unread_count, 0);

  const articles = cachedArticles ?? [];
  const isLoadingArticles = cachedArticles === undefined;

  // Helper to check if article is starred
  const savedLinks = new Set(savedArticles?.map((s) => s.link) ?? []);
  const isArticleStarred = (article: Doc<"cached_content">) => savedLinks.has(article.link);

  return (
    <div className="flex flex-col md:flex-row gap-6 md:grow md:min-h-0 w-full">
      {/* RSS Feeds Section */}
      <SectionCard
        icon={<RectangleStackIcon className="size-7" />}
        title="RSS Feeds"
        description={`${feedsList.length} feeds • ${totalUnread} unread articles`}
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
                  {feedsList.map((feed) => (
                    <FeedCollapsibleItem
                      key={feed._id}
                      feed={feed}
                      onRefresh={handleRefreshFeed}
                      onEdit={handleEditFeed}
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
        description={`${articles.filter((a: Doc<"cached_content">) => !a.is_read).length} unread`}
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
                {articles.map((article: Doc<"cached_content">) => {
                  const feed = feedsList.find(
                    (f: Doc<"rss_feed">) => f._id === article.rss_feed_id
                  );
                  return (
                    <ArticleListItem
                      key={article._id}
                      article={article}
                      feedName={feed?.name}
                      onSelect={handleArticleSelect}
                      onToggleStar={handleToggleStar}
                      isSelected={selectedArticle?._id === article._id}
                      isStarred={isArticleStarred(article)}
                    />
                  );
                })}
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

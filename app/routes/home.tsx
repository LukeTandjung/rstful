import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import type { RssFeed, RssArticle } from "types";
import { Separator } from "@base-ui-components/react/separator";
import { ScrollArea } from "@base-ui-components/react/scroll-area";
import { NewspaperIcon, RectangleStackIcon } from "@heroicons/react/16/solid";
import { Effect } from "effect";
import {
  SectionCard,
  MenuBar,
  FeedCollapsibleItem,
  AddFeedDialog,
  ArticleListItem,
  ArticleReader,
} from "components";
import { RssService } from "services/rss.service";

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
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [articles, setArticles] = useState<RssArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<RssArticle | null>(
    null
  );
  const [isLoadingFeeds, setIsLoadingFeeds] = useState(true);
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);

  // Load feeds on mount using Effect-TS
  useEffect(() => {
    const program = Effect.gen(function* () {
      const fetchedFeeds = yield* RssService.fetchFeeds;
      setFeeds(fetchedFeeds);
      setIsLoadingFeeds(false);

      // Load articles from first feed
      if (fetchedFeeds.length > 0) {
        setIsLoadingArticles(true);
        const fetchedArticles = yield* RssService.fetchArticles(
          fetchedFeeds[0].id
        );
        setArticles(fetchedArticles);
        setIsLoadingArticles(false);
      }
    });

    Effect.runPromise(program);
  }, []);

  const handleRefreshFeed = (feedId: string) => {
    const program = Effect.gen(function* () {
      yield* RssService.refreshFeed(feedId);
      const fetchedArticles = yield* RssService.fetchArticles(feedId);
      setArticles(fetchedArticles);
    });

    Effect.runPromise(program);
  };

  const handleAddFeed = (url: string, name: string, category: string) => {
    const program = Effect.gen(function* () {
      const newFeed = yield* RssService.addFeed(url, name, category);
      setFeeds((prev) => [...prev, newFeed]);
    });

    Effect.runPromise(program);
  };

  const handleRemoveFeed = (feedId: string) => {
    const program = Effect.gen(function* () {
      yield* RssService.deleteFeed(feedId);
      setFeeds((prev) => prev.filter((f) => f.id !== feedId));
    });

    Effect.runPromise(program);
  };

  const handleArticleSelect = (article: RssArticle) => {
    setSelectedArticle(article);

    // Mark as read using Effect-TS
    if (!article.isRead) {
      const program = Effect.gen(function* () {
        yield* RssService.markAsRead(article.id);
        setArticles((prev) =>
          prev.map((a) => (a.id === article.id ? { ...a, isRead: true } : a))
        );
      });

      Effect.runPromise(program);
    }
  };

  const handleToggleStar = (articleId: string) => {
    const program = Effect.gen(function* () {
      yield* RssService.toggleStar(articleId);
      setArticles((prev) =>
        prev.map((a) =>
          a.id === articleId ? { ...a, isStarred: !a.isStarred } : a
        )
      );

      // Update selected article if it's the one being starred
      if (selectedArticle && selectedArticle.id === articleId) {
        setSelectedArticle((prev) =>
          prev ? { ...prev, isStarred: !prev.isStarred } : null
        );
      }
    });

    Effect.runPromise(program);
  };

  const totalUnread = feeds.reduce((sum, feed) => sum + feed.unreadCount, 0);

  return (
    <div className="bg-background flex flex-col h-screen w-full">
      <div className="h-[300px] relative w-full shrink-0">
        <img
          src="/assets/banner.png"
          alt="Banner"
          className="absolute inset-0 max-w-none object-cover object-center pointer-events-none size-full"
        />
      </div>

      <div className="flex flex-col gap-6 grow min-h-0 p-6 w-full">
        <MenuBar />

        <Separator className="w-full bg-border-unfocus h-0.5" />

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
      </div>
    </div>
  );
}
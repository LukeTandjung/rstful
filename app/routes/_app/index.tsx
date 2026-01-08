import { useState, useMemo, useEffect, useRef } from "react";
import type { Route } from "./+types/index";
import type { Id, Doc } from "convex/_generated/dataModel";
import { ScrollArea } from "@base-ui-components/react/scroll-area";
import { NewspaperIcon } from "@heroicons/react/16/solid";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "convex/_generated/api";
import {
  SectionCard,
  ArticleListItem,
  ArticleReader,
  ArticleChatCard,
  FeedSidebar,
} from "components";

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
  const viewer = useQuery(api.auth.currentUser);
  const [selectedArticle, setSelectedArticle] = useState<Doc<"cached_content"> | Doc<"saved_content"> | null>(null);
  const [chatArticle, setChatArticle] = useState<Doc<"cached_content"> | Doc<"saved_content"> | null>(null);

  // Get user_id from authenticated user
  const user_id = viewer?._id;

  // Get feeds for feedMap (needed to show feed name in articles)
  const feeds = useQuery(
    api.rss_feed.get_rss_feed,
    user_id ? { user_id } : "skip"
  );

  // Get cached articles for the user (paginated, sorted by pub_date on server)
  const {
    results: cachedArticles,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.cached_content.get_cached_articles_paginated,
    user_id ? { user_id } : "skip",
    { initialNumItems: 20 }
  );

  // Get total unread count from user doc (denormalized counter)
  const unreadCount = viewer?.total_unread_count ? Number(viewer.total_unread_count) : 0;

  // Get saved articles for the user
  const savedArticles = useQuery(
    api.saved_content.get_saved_content,
    user_id ? { user_id } : "skip"
  );

  // Mutations for saved_content
  const postSavedContent = useMutation(api.saved_content.post_saved_content);
  const deleteSavedContent = useMutation(api.saved_content.delete_saved_content);
  const markAsRead = useMutation(api.cached_content.mark_as_read);

  const handleLinkClick = (article: Doc<"cached_content"> | Doc<"saved_content">) => {
    setSelectedArticle(article);

    if (!user_id || ("is_read" in article && article.is_read)) return;

    // Only mark cached_content articles as read
    const cachedArticle = articleMap.get(article._id as Id<"cached_content">);
    if (cachedArticle) {
      markAsRead({ article_id: cachedArticle._id, user_id })
        .catch((error) => console.error("Failed to mark article as read:", error));
    }
  };

  const handleStartChat = (article: Doc<"cached_content"> | Doc<"saved_content">) => {
    setSelectedArticle(article);
    setChatArticle(article);
  };

  const handleCloseChat = () => {
    setChatArticle(null);
  };

  const handleToggleStar = (articleId: string) => {
    if (!user_id) {
      console.error("Cannot save article: user not authenticated");
      return;
    }

    const article = articleMap.get(articleId as Id<"cached_content">);
    if (!article) {
      console.error("Article not found:", articleId);
      return;
    }

    // Check if already saved by matching link
    const savedArticle = savedByLinkMap.get(article.link);

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

  const feedsList = feeds ?? [];

  // Articles are already sorted by pub_date on the server
  const articles = cachedArticles ?? [];
  const isLoadingArticles = paginationStatus === "LoadingFirstPage";

  // Helper to check if article is starred
  const savedLinks = new Set(savedArticles?.map((s) => s.link) ?? []);
  const isArticleStarred = (article: Doc<"cached_content">) => savedLinks.has(article.link);

  // Create lookup maps to avoid O(n) searches in render - O(1) lookups instead
  const feedMap = useMemo(
    () => new Map(feedsList.map((f) => [f._id, f])),
    [feedsList]
  );
  const articleMap = useMemo(
    () => new Map(articles.map((a) => [a._id, a])),
    [articles]
  );
  const savedByLinkMap = useMemo(
    () => new Map(savedArticles?.map((s) => [s.link, s]) ?? []),
    [savedArticles]
  );

  // Infinite scroll: load more when near bottom
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || paginationStatus !== "CanLoadMore") return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        loadMore(20);
      }
    };

    scrollEl.addEventListener("scroll", handleScroll);
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [paginationStatus, loadMore]);

  return (
    <div className="flex gap-6 md:grow md:min-h-0 w-full">
      <FeedSidebar userId={user_id} />

      {/* Articles List Section - hidden when chat is active */}
      {!chatArticle && (
        <SectionCard
          icon={<NewspaperIcon className="size-7" />}
          title="Articles"
          description={`${unreadCount ?? 0} unread`}
          className="basis-1/3 min-h-0"
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
              <ScrollArea.Viewport ref={scrollRef} className="flex grow min-h-0">
                <div className="flex flex-col gap-3 grow min-h-0">
                  {articles.map((article: Doc<"cached_content">) => (
                      <ArticleListItem
                        key={article._id}
                        article={article}
                        feedName={article.rss_feed_id ? feedMap.get(article.rss_feed_id)?.name : undefined}
                        onSelect={handleLinkClick}
                        onToggleStar={handleToggleStar}
                        onStartChat={handleStartChat}
                        isStarred={isArticleStarred(article)}
                      />
                    ))}
                  {paginationStatus === "LoadingMore" && (
                    <div className="py-4 text-center text-sm text-text-alt">
                      Loading more...
                    </div>
                  )}
                </div>
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          )}
        </SectionCard>
      )}

      {/* Article Reader Section */}
      <SectionCard
        icon={<NewspaperIcon className="size-7" />}
        title="Reader"
        description={
          selectedArticle ? selectedArticle.title : "No article selected"
        }
        className={chatArticle ? "basis-1/2 min-h-0" : "basis-2/3 min-h-0"}
      >
        <ScrollArea.Root className="flex grow min-h-0 w-full">
          <ScrollArea.Viewport className="flex grow min-h-0 p-4">
            <ArticleReader article={selectedArticle} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </SectionCard>

      {/* Article Chat Section - shown when chat is active */}
      {chatArticle && user_id && (
        <ArticleChatCard
          article={chatArticle}
          userId={user_id}
          onClose={handleCloseChat}
        />
      )}
    </div>
  );
}

import { useState, useMemo } from "react";
import type { Route } from "./+types/index";
import type { Id, Doc } from "convex/_generated/dataModel";
import { ScrollArea } from "@base-ui-components/react/scroll-area";
import { NewspaperIcon } from "@heroicons/react/16/solid";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import {
  SectionCard,
  ArticleListItem,
  ArticleReader,
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

  // Get user_id from authenticated user
  const user_id = viewer?._id;

  // Get feeds for feedMap (needed to show feed name in articles)
  const feeds = useQuery(
    api.rss_feed.get_rss_feed,
    user_id ? { user_id } : "skip"
  );

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

  const articles = [...(cachedArticles ?? [])].sort((a, b) => {
    const aDate = a.pub_date ? Number(a.pub_date) : a._creationTime;
    const bDate = b.pub_date ? Number(b.pub_date) : b._creationTime;
    return bDate - aDate; // newest first
  });
  const isLoadingArticles = cachedArticles === undefined;

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

  return (
    <div className="flex flex-col md:flex-row gap-6 md:grow md:min-h-0 w-full">
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
                {articles.map((article: Doc<"cached_content">) => (
                    <ArticleListItem
                      key={article._id}
                      article={article}
                      feedName={article.rss_feed_id ? feedMap.get(article.rss_feed_id)?.name : undefined}
                      onSelect={handleLinkClick}
                      onToggleStar={handleToggleStar}
                      isStarred={isArticleStarred(article)}
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
        className="md:w-2/3 md:min-h-0"
      >
        <ScrollArea.Root className="flex grow min-h-0 w-full">
          <ScrollArea.Viewport className="flex grow min-h-0 p-4">
            <ArticleReader article={selectedArticle} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </SectionCard>
    </div>
  );
}

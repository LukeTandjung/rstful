import { useState, useEffect } from "react";
import type { Route } from "./+types/starred";
import type { RssArticle } from "types";
import { Separator } from "@base-ui-components/react/separator";
import { ScrollArea } from "@base-ui-components/react/scroll-area";
import { StarIcon } from "@heroicons/react/16/solid";
import { Effect } from "effect";
import {
  SectionCard,
  MenuBar,
  ArticleListItem,
  ArticleReader,
} from "components";
import { RssService } from "services/rss.service";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Starred Articles - RSS Reader" },
    {
      name: "description",
      content: "View your starred articles",
    },
  ];
}

export default function Starred() {
  const [starredArticles, setStarredArticles] = useState<RssArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<RssArticle | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load starred articles on mount
  useEffect(() => {
    const program = Effect.gen(function* () {
      const articles = yield* RssService.fetchStarredArticles;
      setStarredArticles(articles);
      setIsLoading(false);
    });

    Effect.runPromise(program);
  }, []);

  const handleArticleSelect = (article: RssArticle) => {
    setSelectedArticle(article);

    // Mark as read
    if (!article.isRead) {
      const program = Effect.gen(function* () {
        yield* RssService.markAsRead(article.id);
        setStarredArticles((prev) =>
          prev.map((a) => (a.id === article.id ? { ...a, isRead: true } : a))
        );
      });

      Effect.runPromise(program);
    }
  };

  const handleToggleStar = (articleId: string) => {
    const program = Effect.gen(function* () {
      yield* RssService.toggleStar(articleId);
      // Remove from starred list when unstarred
      setStarredArticles((prev) => prev.filter((a) => a.id !== articleId));

      // Clear selected article if it's the one being unstarred
      if (selectedArticle && selectedArticle.id === articleId) {
        setSelectedArticle(null);
      }
    });

    Effect.runPromise(program);
  };

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
          {/* Starred Articles List */}
          <SectionCard
            icon={<StarIcon className="size-7 text-yellow-500" />}
            title="Starred Articles"
            description={`${starredArticles.length} starred ${starredArticles.length === 1 ? "article" : "articles"}`}
            className="md:w-1/2 md:min-h-0"
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="font-normal text-base leading-7 text-text-alt">
                  Loading starred articles...
                </div>
              </div>
            ) : starredArticles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <StarIcon className="size-12 text-text-alt" />
                <div className="font-normal text-base leading-7 text-text-alt">
                  No starred articles yet
                </div>
                <div className="font-normal text-sm leading-6 text-text-alt">
                  Star articles from your feeds to save them here
                </div>
              </div>
            ) : (
              <ScrollArea.Root className="flex grow min-h-0 w-full">
                <ScrollArea.Viewport className="flex grow min-h-0">
                  <div className="flex flex-col gap-3 grow min-h-0">
                    {starredArticles.map((article) => (
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
            icon={<StarIcon className="size-7 text-yellow-500" />}
            title="Reader"
            description={
              selectedArticle ? selectedArticle.title : "No article selected"
            }
            className="md:w-1/2 md:min-h-0"
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

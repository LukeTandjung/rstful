import { useState } from "react";
import type { Route } from "./+types/starred";
import type { Doc } from "convex/_generated/dataModel";
import { ScrollArea } from "@base-ui-components/react/scroll-area";
import { StarIcon } from "@heroicons/react/16/solid";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import {
  SectionCard,
  ArticleListItem,
  ArticleReader,
} from "components";

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
  const viewer = useQuery(api.auth.currentUser);
  const user_id = viewer?._id;

  const [selectedArticle, setSelectedArticle] = useState<Doc<"cached_content"> | Doc<"saved_content"> | null>(null);

  // Query saved articles from Convex
  const savedArticles = useQuery(
    api.saved_content.get_saved_content,
    user_id ? { user_id } : "skip"
  );

  const deleteSavedContent = useMutation(api.saved_content.delete_saved_content);

  const starredArticles = savedArticles ?? [];
  const isLoading = savedArticles === undefined;

  const handleArticleSelect = (article: Doc<"cached_content"> | Doc<"saved_content">) => {
    setSelectedArticle(article);
  };

  const handleToggleStar = (articleId: string) => {
    // On starred page, toggling always removes
    deleteSavedContent({ saved_content_id: articleId as Doc<"saved_content">["_id"] })
      .then(() => {
        // Clear selected article if it's the one being unstarred
        if (selectedArticle && selectedArticle._id === articleId) {
          setSelectedArticle(null);
        }
      })
      .catch((error) => console.error("Failed to remove article:", error));
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 md:grow md:min-h-0 w-full">
      {/* Starred Articles List */}
      <SectionCard
        icon={<StarIcon className="size-7 text-text" />}
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
                {starredArticles.map((article: Doc<"saved_content">) => (
                  <ArticleListItem
                    key={article._id}
                    article={article}
                    onSelect={handleArticleSelect}
                    onToggleStar={handleToggleStar}
                    isSelected={selectedArticle?._id === article._id}
                    isStarred={true}
                  />
                ))}
              </div>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        )}
      </SectionCard>

      {/* Article Reader Section */}
      <SectionCard
        icon={<StarIcon className="size-7 text-text" />}
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
  );
}

import { StarIcon as StarIconSolid } from "@heroicons/react/16/solid";
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline";
import type { RssArticle } from "types";

interface ArticleListItemProps {
  article: RssArticle;
  onSelect?: (article: RssArticle) => void;
  onToggleStar?: (articleId: string) => void;
  isSelected?: boolean;
}

export function ArticleListItem({
  article,
  onSelect,
  onToggleStar,
  isSelected = false,
}: ArticleListItemProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div
      className={`border border-border-unfocus border-solid flex flex-col gap-2 p-3.5 rounded-lg w-full cursor-pointer transition-colors ${
        isSelected ? "bg-background-select" : "hover:bg-background-alt"
      } ${!article.isRead ? "border-border-focus" : ""}`}
      onClick={() => onSelect?.(article)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 flex flex-col gap-1">
          <div
            className={`font-medium text-base leading-6 ${
              article.isRead ? "text-text-alt" : "text-text"
            }`}
          >
            {article.title}
          </div>
          <div className="font-normal text-sm leading-5 text-text-alt">
            {article.feedName} • {formatDate(article.pubDate)}
            {article.author && ` • ${article.author}`}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar?.(article.id);
          }}
          className="flex-shrink-0 p-1 hover:bg-background-select rounded"
        >
          {article.isStarred ? (
            <StarIconSolid className="size-5 text-urgent" />
          ) : (
            <StarIconOutline className="size-5 text-text-alt" />
          )}
        </button>
      </div>

      <div className="font-light text-sm leading-5 text-text-alt line-clamp-2">
        {article.description}
      </div>
    </div>
  );
}

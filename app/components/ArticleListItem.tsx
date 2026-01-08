import { Toggle } from "@base-ui-components/react/toggle";
import { StarIcon as StarIconSolid, ChatBubbleLeftRightIcon } from "@heroicons/react/16/solid";
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline";
import type { Doc } from "convex/_generated/dataModel";
import { useHighlighter } from "services/highlighter";

interface ArticleListItemProps {
  article: Doc<"cached_content"> | Doc<"saved_content">;
  onSelect?: (article: Doc<"cached_content"> | Doc<"saved_content">) => void;
  onToggleStar?: (articleId: string) => void;
  onStartChat?: (article: Doc<"cached_content"> | Doc<"saved_content">) => void;
  isStarred?: boolean;
  feedName?: string | undefined;
}

export function ArticleListItem({
  article,
  onSelect,
  onToggleStar,
  onStartChat,
  isStarred = false,
  feedName = "Unknown Feed",
}: ArticleListItemProps) {
  const hlStar = useHighlighter();

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
      className={`border border-border-unfocus border-solid flex flex-col gap-2 p-3.5 rounded-lg w-full cursor-pointer transition-colors hover:bg-surface-alt ${!("is_read" in article && article.is_read) ? "border-border-focus" : ""}`}
      onClick={() => onSelect?.(article)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div
            className={`text-base leading-6 wrap-anywhere ${
              "is_read" in article && article.is_read
                ? "text-text-alt font-normal"
                : "text-text font-medium"
            }`}
          >
            {article.title}
          </div>
          <div className="font-normal text-sm leading-5 text-text-alt">
            {feedName} •{" "}
            {formatDate(
              article.pub_date
                ? new Date(Number(article.pub_date))
                : new Date(article._creationTime),
            )}
            {article.author && ` • ${article.author}`}
          </div>
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          <Toggle
            pressed={isStarred}
            onPressedChange={() => onToggleStar?.(article._id)}
            aria-label="Star article"
            style={{ "--hl-star": hlStar.bg } as React.CSSProperties}
            className="p-1 rounded"
            render={(props, state) => (
              <button
                type="button"
                {...props}
                onClick={(e) => {
                  e.stopPropagation();
                  props.onClick?.(e);
                }}
              >
                {state.pressed ? (
                  <StarIconSolid className="size-5 text-(--hl-star)" />
                ) : (
                  <StarIconOutline className="size-5 text-text-alt hover:text-(--hl-star)" />
                )}
              </button>
            )}
          />

          <button
            type="button"
            aria-label="Chat about article"
            style={{ "--hl-chat": hlStar.bg } as React.CSSProperties}
            className="p-1 rounded"
            onClick={(e) => {
              e.stopPropagation();
              onStartChat?.(article);
            }}
          >
            <ChatBubbleLeftRightIcon className="size-5 text-text-alt hover:text-(--hl-chat)" />
          </button>
        </div>
      </div>

      <div className="font-light text-sm leading-5 text-text-alt line-clamp-2">
        {article.description?.replace(/<[^>]*>/g, "")}
      </div>
    </div>
  );
}

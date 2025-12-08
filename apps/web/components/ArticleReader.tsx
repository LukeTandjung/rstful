import { StarIcon as StarIconSolid } from "@heroicons/react/16/solid";
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import type { RssArticle } from "types";

interface ArticleReaderProps {
  article: RssArticle | null;
  onToggleStar?: (articleId: string) => void;
}

export function ArticleReader({ article, onToggleStar }: ArticleReaderProps) {
  if (!article) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="font-light text-lg leading-7 text-text-alt">
          Select an article to read
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full w-full">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-4 border-b border-border-unfocus">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-medium text-2xl leading-9 text-text flex-1">
            {article.title}
          </h1>

          <button
            onClick={() => onToggleStar?.(article.id)}
            className="shrink-0 p-2 hover:bg-background-select rounded"
          >
            {article.isStarred ? (
              <StarIconSolid className="size-6 text-urgent" />
            ) : (
              <StarIconOutline className="size-6 text-text-alt" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-4 font-normal text-base leading-6 text-text-alt">
          <span>{article.feedName}</span>
          <span>•</span>
          <span>{new Date(article.pubDate).toLocaleDateString()}</span>
          {article.author && (
            <>
              <span>•</span>
              <span>{article.author}</span>
            </>
          )}
        </div>

        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 font-medium text-base leading-6 text-border-focus hover:underline w-fit"
        >
          <ArrowTopRightOnSquareIcon className="size-5" />
          Open original
        </a>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="font-light text-base leading-7 text-text prose prose-invert max-w-none">
          {article.content ? (
            <div dangerouslySetInnerHTML={{ __html: article.content }} />
          ) : (
            <p>{article.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

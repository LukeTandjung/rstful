import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import type { Doc } from "convex/_generated/dataModel";

interface ArticleReaderProps {
  article: Doc<"cached_content"> | Doc<"saved_content"> | null;
}

export function ArticleReader({ article }: ArticleReaderProps) {

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
        <h1 className="font-medium text-2xl leading-9 text-text">
          {article.title}
        </h1>

        <div className="flex items-center gap-4 font-normal text-base leading-6 text-text-alt">
          <span>
            {new Date(
              article.pub_date
                ? Number(article.pub_date)
                : article._creationTime
            ).toLocaleDateString()}
          </span>
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
        <div className="font-light text-base leading-7 text-text prose prose-invert max-w-none prose-a:text-link prose-a:underline hover:prose-a:text-link-hover">
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

import { Tooltip } from "@base-ui-components/react/tooltip";
import { EditFeedDialog } from "./EditFeedDialog";
import type { RssFeed } from "types";
import type { Id } from "convex/_generated/dataModel";

interface FeedIconItemProps {
  feed: RssFeed;
  unreadCount: number;
  onRefresh: (feedId: Id<"rss_feed">) => void;
  onEdit: (feedId: Id<"rss_feed">, name: string, category: string, url: string, website_url: string) => void;
  onRemove: (feedId: Id<"rss_feed">) => void;
}

export function FeedIconItem({
  feed,
  unreadCount,
  onRefresh,
  onEdit,
  onRemove,
}: FeedIconItemProps) {

  const getFaviconUrl = (websiteUrl: string) => {
    try {
      const url = new URL(websiteUrl);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
    } catch {
      return `https://www.google.com/s2/favicons?domain=example.com&sz=32`;
    }
  };

  return (
    <Tooltip.Root>
      <EditFeedDialog
        feed={feed}
        onRefresh={onRefresh}
        onEdit={onEdit}
        onRemove={onRemove}
        trigger={
          <Tooltip.Trigger
            render={
              <button className="relative size-10 rounded-lg bg-background-select flex items-center justify-center hover:bg-surface-alt transition-colors">
                <img
                  src={getFaviconUrl(feed.website_url)}
                  alt={feed.name}
                  className="size-6 rounded"
                />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-error text-background text-xs font-medium min-w-5 h-5 flex items-center justify-center rounded-full px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            }
          />
        }
      />
      <Tooltip.Portal>
        <Tooltip.Positioner side="right" sideOffset={8}>
          <Tooltip.Popup className="bg-background-alt text-text px-2 py-1 rounded text-sm shadow-lg">
            {feed.name}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

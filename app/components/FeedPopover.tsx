import { Avatar } from "@base-ui-components/react/avatar";
import { Popover } from "@base-ui-components/react/popover";
import { ScrollArea } from "@base-ui-components/react/scroll-area";
import { PlusIcon } from "@heroicons/react/16/solid";
import { FeedIconItem } from "./FeedIconItem";
import { AddFeedDialog } from "./AddFeedDialog";
import type { RssFeed } from "types";
import type { Id } from "convex/_generated/dataModel";
import { useHighlighter } from "services/highlighter";

interface FeedPopoverProps {
  feeds: Array<RssFeed>;
  unreadCountByFeed: Record<string, number>;
  totalUnread: number;
  userName?: string | undefined;
  onRefresh: (feedId: Id<"rss_feed">) => void;
  onEdit: (
    feedId: Id<"rss_feed">,
    name: string,
    category: string,
    url: string,
    website_url: string,
  ) => void;
  onRemove: (feedId: Id<"rss_feed">) => void;
  onAdd: (
    name: string,
    category: string,
    url: string,
    website_url: string,
  ) => void;
}

export function FeedPopover({
  feeds,
  unreadCountByFeed,
  totalUnread,
  userName,
  onRefresh,
  onEdit,
  onRemove,
  onAdd,
}: FeedPopoverProps) {
  const hl = useHighlighter();

  const getInitials = (name?: string) => {
    if (!name) return "??";
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <button className="relative size-14 bg-background-alt rounded-full">
            <Avatar.Root className="size-14 shrink-0 overflow-hidden rounded-full bg-background-alt cursor-pointer hover:opacity-80 transition-opacity">
              <Avatar.Image
                src="./rstful.svg"
                alt="RSS Reader"
                className="size-full max-w-full max-h-full object-cover"
              />
              <Avatar.Fallback className="size-full flex items-center justify-center bg-background-alt text-text font-medium text-lg rounded-full">
                {getInitials(userName)}
              </Avatar.Fallback>
            </Avatar.Root>
            {totalUnread > 0 && (
              <span
                style={
                  {
                    "--hl-bg": hl.bg,
                    "--hl-text": hl.text,
                  } as React.CSSProperties
                }
                className="absolute -top-1 -right-1 bg-(--hl-bg) text-(--hl-text) text-xs font-medium min-w-5 h-5 flex items-center justify-center rounded-full px-1"
              >
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </button>
        }
      />

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={8}>
          <Popover.Popup className="bg-background-alt rounded-lg p-3 shadow-lg flex flex-col gap-3 max-h-80">
            <ScrollArea.Root className="flex-1 min-h-0">
              <ScrollArea.Viewport className="max-h-60">
                <div className="flex flex-col gap-2">
                  {feeds.length === 0 ? (
                    <div className="text-text-alt text-sm px-2 py-4">
                      No feeds added yet
                    </div>
                  ) : (
                    feeds.map((feed) => (
                      <FeedIconItem
                        key={feed._id}
                        feed={feed}
                        unreadCount={unreadCountByFeed[feed._id] || 0}
                        onRefresh={onRefresh}
                        onEdit={onEdit}
                        onRemove={onRemove}
                      />
                    ))
                  )}
                </div>
              </ScrollArea.Viewport>
            </ScrollArea.Root>

            <AddFeedDialog
              trigger={
                <button
                  style={
                    {
                      "--hl-bg": hl.bg,
                      "--hl-text": hl.text,
                    } as React.CSSProperties
                  }
                  className="size-10 rounded-full bg-(--hl-bg) flex items-center justify-center hover:opacity-80 transition-opacity"
                >
                  <PlusIcon className="size-5 text-(--hl-text)" />
                </button>
              }
              onAdd={onAdd}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

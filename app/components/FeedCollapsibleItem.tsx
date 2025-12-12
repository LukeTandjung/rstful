import { useState } from "react";
import { Collapsible } from "@base-ui-components/react/collapsible";
import { Button } from "@base-ui-components/react/button";
import { ChevronRightIcon, ChevronDownIcon } from "@heroicons/react/16/solid";
import type { RssFeed } from "types";
import type { Id } from "convex/_generated/dataModel";
import { EditFeedDialog } from "./EditFeedDialog";
import { DeleteConfirmDialog } from "./RemoveFeedDialog";

interface FeedCollapsibleItemProps {
  feed: RssFeed;
  unreadCount?: number;
  onRefresh: (feedId: Id<"rss_feed">) => void;
  onEdit: (feedId: Id<"rss_feed">, name: string, category: string, url: string) => void;
  onRemove: (feedId: Id<"rss_feed">) => void;
}

export function FeedCollapsibleItem({
  feed,
  unreadCount = 0,
  onRefresh,
  onEdit,
  onRemove,
}: FeedCollapsibleItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible.Root
      className="border border-border-unfocus border-solid flex flex-col gap-2.5 p-3.5 rounded-lg w-full"
      open={open}
      onOpenChange={setOpen}
    >
      <Collapsible.Trigger className="flex items-center justify-between w-full font-medium text-lg leading-7 text-text">
        <div className="flex items-center gap-2.5">
          <span>{feed.name}</span>
          {unreadCount > 0 && (
            <span className="bg-border-focus px-2 py-0.5 rounded text-sm">
              {unreadCount}
            </span>
          )}
        </div>
        {open ? (
          <ChevronDownIcon className="size-6" />
        ) : (
          <ChevronRightIcon className="size-6" />
        )}
      </Collapsible.Trigger>

      <Collapsible.Panel className="flex flex-col gap-6 w-full">
        {/* Status and URL */}
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2.5 items-center font-normal text-base leading-7 text-text-alt">
            Status:
            <div
              className={`${
                feed.status === "active"
                  ? "bg-ok"
                  : feed.status === "error"
                    ? "bg-error"
                    : "bg-urgent"
              } px-2.5 rounded-lg font-normal text-base leading-7 text-text`}
            >
              {feed.status}
            </div>
          </div>

          <div className="flex gap-2.5 items-center font-normal text-base leading-7 text-text-alt break-all">
            URL: {feed.url}
          </div>

          <div className="flex gap-2.5 items-center font-normal text-base leading-7 text-text-alt">
            Category: {feed.category}
          </div>

          {feed.last_fetched && (
            <div className="flex gap-2.5 items-center font-normal text-base leading-7 text-text-alt">
              Last fetched: {new Date(Number(feed.last_fetched)).toLocaleString()}
            </div>
          )}
        </div>

        {/* Button Group */}
        <div className="flex gap-7 w-full mt-5">
          <Button
            onClick={() => onRefresh(feed._id)}
            className="bg-background-select px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text"
          >
            Refresh
          </Button>
          <EditFeedDialog feed={feed} onEdit={onEdit} />
          <DeleteConfirmDialog
            trigger={
              <button className="bg-error px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text">
                Remove
              </button>
            }
            title="Remove Feed"
            description={`Are you sure you want to remove "${feed.name}"? This action cannot be undone.`}
            confirmLabel="Remove"
            onConfirm={() => onRemove(feed._id)}
          />
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

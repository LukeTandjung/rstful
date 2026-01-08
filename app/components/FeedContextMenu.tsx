import { useState } from "react";
import { Menu } from "@base-ui-components/react/menu";
import {
  EyeIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/16/solid";
import { ViewFeedDialog } from "./ViewFeedDialog";
import { EditFeedDialog } from "./EditFeedDialog";
import { DeleteConfirmDialog } from "./RemoveFeedDialog";
import type { RssFeed } from "types";
import type { Id } from "convex/_generated/dataModel";
import type { ReactNode } from "react";

interface FeedContextMenuProps {
  feed: RssFeed;
  children: ReactNode;
  onRefresh: (feedId: Id<"rss_feed">) => void;
  onEdit: (
    feedId: Id<"rss_feed">,
    name: string,
    category: string,
    url: string,
    website_url: string,
  ) => void;
  onRemove: (feedId: Id<"rss_feed">) => void;
}

export function FeedContextMenu({
  feed,
  children,
  onRefresh,
  onEdit,
  onRemove,
}: FeedContextMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleView = () => {
    setMenuOpen(false);
    setViewDialogOpen(true);
  };

  const handleEdit = () => {
    setMenuOpen(false);
    setEditDialogOpen(true);
  };

  const handleDelete = () => {
    setMenuOpen(false);
    setDeleteDialogOpen(true);
  };

  const handleRefresh = () => {
    setMenuOpen(false);
    onRefresh(feed._id);
  };

  const menuItemStyles =
    "flex items-center gap-1.5 px-1.5 py-1 rounded-lg font-normal text-sm leading-7 text-text cursor-default select-none data-[highlighted]:bg-background-select outline-none";

  return (
    <>
      <Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Menu.Trigger className="outline-none cursor-pointer">
          {children}
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner align="start" side="right" sideOffset={8}>
            <Menu.Popup className="bg-background-alt rounded-lg p-1 flex flex-col gap-0.5 min-w-40 shadow-lg">
              <Menu.Item className={menuItemStyles} onClick={handleView}>
                <EyeIcon className="size-4" />
                View
              </Menu.Item>

              <Menu.Item className={menuItemStyles} onClick={handleRefresh}>
                <ArrowPathIcon className="size-4" />
                Refresh
              </Menu.Item>

              <Menu.Item className={menuItemStyles} onClick={handleEdit}>
                <PencilSquareIcon className="size-4" />
                Edit
              </Menu.Item>

              <Menu.Separator className="h-px bg-border-unfocus my-1" />

              <Menu.Item
                className={`${menuItemStyles} text-error`}
                onClick={handleDelete}
              >
                <TrashIcon className="size-4" />
                Delete
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <ViewFeedDialog
        feed={feed}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />

      <EditFeedDialog
        feed={feed}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onEdit={onEdit}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remove Feed"
        description={`Are you sure you want to remove "${feed.name}"? This action cannot be undone.`}
        confirmLabel="Remove"
        onConfirm={() => onRemove(feed._id)}
      />
    </>
  );
}

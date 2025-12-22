import { useState } from "react";
import { Dialog } from "@base-ui-components/react/dialog";
import { Button } from "@base-ui-components/react/button";
import { FormField } from "./FormField";
import { CustomSelect } from "./CustomSelect";
import { DeleteConfirmDialog } from "./RemoveFeedDialog";
import type { RssFeed } from "types";
import type { Id } from "convex/_generated/dataModel";
import type { ReactElement } from "react";

interface EditFeedDialogProps {
  feed: RssFeed;
  trigger?: ReactElement;
  onRefresh?: (feedId: Id<"rss_feed">) => void;
  onEdit: (feedId: Id<"rss_feed">, name: string, category: string, url: string, website_url: string) => void;
  onRemove?: (feedId: Id<"rss_feed">) => void;
}

export function EditFeedDialog({ feed, trigger, onRefresh, onEdit, onRemove }: EditFeedDialogProps) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(!onRefresh && !onRemove);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const url = formData.get("url") as string;
    const website_url = formData.get("website_url") as string;
    const category = formData.get("category") as string;

    onEdit(feed._id, name, category, url, website_url);
    setIsEditing(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setIsEditing(!onRefresh && !onRemove);
    }
  };

  const formatLastFetched = (timestamp: bigint) => {
    if (timestamp === BigInt(0)) return "Never";
    return new Date(Number(timestamp)).toLocaleString();
  };

  const defaultTrigger = (
    <button className="bg-background-select px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text">
      Edit
    </button>
  );

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger render={trigger ?? defaultTrigger} />

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background-alt rounded-lg p-6 flex flex-col gap-3.5 max-w-md w-full">
          <Dialog.Title className="font-medium text-xl leading-8 text-text">
            {isEditing ? "Edit Feed" : feed.name}
          </Dialog.Title>

          {isEditing ? (
            <>
              <Dialog.Description className="font-light text-base leading-7 text-text-alt">
                Update your RSS feed configuration.
              </Dialog.Description>

              <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-3.5 py-2.5">
                  <FormField
                    name="name"
                    label="Name"
                    placeholder="Feed name"
                    defaultValue={feed.name}
                  />

                  <FormField
                    name="website_url"
                    label="Website URL"
                    placeholder="https://example.com"
                    defaultValue={feed.website_url}
                  />

                  <FormField
                    name="url"
                    label="Feed URL"
                    placeholder="https://example.com/feed.xml"
                    defaultValue={feed.url}
                  />

                  <CustomSelect
                    name="category"
                    label="Category"
                    options={[
                      { value: "Tech", label: "Tech" },
                      { value: "Science", label: "Science" },
                      { value: "News", label: "News" },
                      { value: "Business", label: "Business" },
                      { value: "Other", label: "Other" },
                    ]}
                    defaultValue={feed.category}
                  />
                </div>

                <div className="flex gap-3.5 w-full mt-3.5">
                  <button
                    type="submit"
                    className="bg-background-select px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text"
                  >
                    Save Changes
                  </button>

                  {onRefresh && onRemove ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="bg-error px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text"
                    >
                      Cancel
                    </button>
                  ) : (
                    <Dialog.Close className="bg-error px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text">
                      Cancel
                    </Dialog.Close>
                  )}
                </div>
              </form>
            </>
          ) : (
            <>
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

                <div className="flex flex-col gap-1 font-normal text-base leading-7 text-text-alt">
                  <span>Website URL:</span>
                  <span className="break-all text-text">{feed.website_url}</span>
                </div>

                <div className="flex flex-col gap-1 font-normal text-base leading-7 text-text-alt">
                  <span>Feed URL:</span>
                  <span className="break-all text-text">{feed.url}</span>
                </div>

                <div className="flex gap-2.5 items-center font-normal text-base leading-7 text-text-alt">
                  Category: <span className="text-text">{feed.category}</span>
                </div>

                <div className="flex gap-2.5 items-center font-normal text-base leading-7 text-text-alt">
                  Last fetched: <span className="text-text">{formatLastFetched(feed.last_fetched)}</span>
                </div>
              </div>

              <div className="flex gap-3.5 w-full mt-3.5">
                {onRefresh && (
                  <Button
                    onClick={() => {
                      onRefresh(feed._id);
                      setOpen(false);
                    }}
                    className="bg-background-select px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text"
                  >
                    Refresh
                  </Button>
                )}

                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-background-select px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text"
                >
                  Edit
                </Button>

                {onRemove && (
                  <DeleteConfirmDialog
                    trigger={
                      <button className="bg-error px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text">
                        Remove
                      </button>
                    }
                    title="Remove Feed"
                    description={`Are you sure you want to remove "${feed.name}"? This action cannot be undone.`}
                    confirmLabel="Remove"
                    onConfirm={() => {
                      onRemove(feed._id);
                      setOpen(false);
                    }}
                  />
                )}
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

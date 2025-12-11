import { useState } from "react";
import { Dialog } from "@base-ui-components/react/dialog";
import { FormField } from "./FormField";
import { CustomSelect } from "./CustomSelect";
import type { RssFeed } from "types";
import type { Id } from "convex/_generated/dataModel";

interface EditFeedDialogProps {
  feed: RssFeed;
  onEdit: (feedId: Id<"rss_feed">, name: string, category: string, url: string) => void;
}

export function EditFeedDialog({ feed, onEdit }: EditFeedDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const url = formData.get("url") as string;
    const category = formData.get("category") as string;

    onEdit(feed._id, name, category, url);
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="bg-background-select px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text">
        Edit
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background-alt rounded-lg p-6 flex flex-col gap-3.5 max-w-md w-full">
          <Dialog.Title className="font-medium text-xl leading-8 text-text">
            Edit Feed
          </Dialog.Title>

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
              <Dialog.Close
                type="submit"
                className="bg-background-select px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text"
              >
                Save Changes
              </Dialog.Close>

              <Dialog.Close className="bg-error px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text">
                Cancel
              </Dialog.Close>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

import { Dialog } from "@base-ui-components/react/dialog";
import { FormField } from "./FormField";
import { CustomSelect } from "./CustomSelect";
import type { ReactNode } from "react";

interface AddFeedDialogProps {
  trigger: ReactNode;
  onAdd?: (url: string, name: string, category: string) => void;
}

export function AddFeedDialog({ trigger, onAdd }: AddFeedDialogProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="bg-background-select px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text w-fit">
        {trigger}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background-alt rounded-lg p-6 flex flex-col gap-3.5 max-w-md w-full">
          <Dialog.Title className="font-medium text-xl leading-8 text-text">
            Add RSS Feed
          </Dialog.Title>

          <Dialog.Description className="font-light text-base leading-7 text-text-alt">
            Add a new RSS feed to your reader.
          </Dialog.Description>

          <div className="flex flex-col gap-3.5 py-2.5">
            <FormField name="name" label="Name" placeholder="Feed name" />

            <FormField
              name="url"
              label="Feed URL"
              placeholder="https://example.com/feed.xml"
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
            />
          </div>

          <div className="flex gap-3.5 w-full">
            <Dialog.Close
              className="bg-background-select px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text"
              onClick={() => {
                // In real app, get values from form
                onAdd?.(
                  "https://example.com/feed.xml",
                  "New Feed",
                  "Tech"
                );
              }}
            >
              Add Feed
            </Dialog.Close>

            <Dialog.Close className="bg-error px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text">
              Cancel
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

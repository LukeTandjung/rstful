import { AlertDialog } from "@base-ui-components/react/alert-dialog";
import type { Id } from "convex/_generated/dataModel";

interface RemoveFeedDialogProps {
  feedName: string;
  feedId: Id<"rss_feed">;
  onRemove: (feedId: Id<"rss_feed">) => void;
}

export function RemoveFeedDialog({
  feedName,
  feedId,
  onRemove,
}: RemoveFeedDialogProps) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger className="bg-error px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text">
        Remove
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background-alt rounded-lg p-6 flex flex-col gap-3.5 max-w-md w-full">
          <AlertDialog.Title className="font-medium text-xl leading-8 text-text">
            Remove Feed
          </AlertDialog.Title>

          <AlertDialog.Description className="font-light text-base leading-7 text-text-alt">
            Are you sure you want to remove "{feedName}"? This action cannot be
            undone.
          </AlertDialog.Description>

          <div className="flex gap-3.5 w-full mt-4">
            <AlertDialog.Close
              className="bg-error px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text"
              onClick={() => onRemove(feedId)}
            >
              Remove
            </AlertDialog.Close>

            <AlertDialog.Close className="bg-background-select px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text">
              Cancel
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

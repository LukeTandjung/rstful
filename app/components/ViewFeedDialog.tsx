import { Dialog } from "@base-ui-components/react/dialog";
import type { RssFeed } from "types";

interface ViewFeedDialogProps {
  feed: RssFeed;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewFeedDialog({ feed, open, onOpenChange }: ViewFeedDialogProps) {
  const formatLastFetched = (timestamp: bigint) => {
    if (timestamp === BigInt(0)) return "Never";
    return new Date(Number(timestamp)).toLocaleString();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background-alt rounded-lg p-6 flex flex-col gap-3.5 max-w-md w-full">
          <Dialog.Title className="font-medium text-xl leading-8 text-text">
            {feed.name}
          </Dialog.Title>

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
            <Dialog.Close className="bg-background-select px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text">
              Close
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

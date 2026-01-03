import { AlertDialog } from "@base-ui-components/react/alert-dialog";
import { Progress } from "@base-ui-components/react/progress";
import { useHighlighter } from "services/highlighter";

interface ImportProgressDialogProps {
  open: boolean;
  current: number;
  total: number;
  imported: number;
  skipped: number;
  onComplete: () => void;
}

export function ImportProgressDialog({
  open,
  current,
  total,
  imported,
  skipped,
  onComplete,
}: ImportProgressDialogProps) {
  const hl = useHighlighter();
  const isComplete = current >= total && total > 0;
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <AlertDialog.Root open={open}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background-alt rounded-lg p-6 flex flex-col gap-4 max-w-md w-full">
          <AlertDialog.Title className="font-medium text-xl leading-8 text-text">
            {isComplete ? "Import Complete" : "Importing Feeds"}
          </AlertDialog.Title>

          <AlertDialog.Description className="font-light text-base leading-7 text-text-alt">
            {isComplete
              ? `Successfully imported ${imported} feeds. ${skipped > 0 ? `${skipped} duplicates skipped.` : ""}`
              : `Processing batch ${current} of ${total}...`}
          </AlertDialog.Description>

          <Progress.Root
            value={current}
            max={total}
            className="grid grid-cols-2 gap-x-2 gap-y-2 w-full"
          >
            <Progress.Label className="[grid-area:1/1] flex items-center font-medium text-base leading-6 text-text">
              Progress
            </Progress.Label>

            <Progress.Value className="[grid-area:1/2] flex items-center justify-end font-normal text-sm leading-5 text-text-alt">
              {() => `${current}/${total} batches`}
            </Progress.Value>

            <Progress.Track className="[grid-area:2/1/auto/span_2] bg-background flex rounded-full h-2">
              <Progress.Indicator
                style={{ "--hl-bg": hl.bg, width: `${percentage}%` } as React.CSSProperties}
                className="bg-(--hl-bg) h-2 rounded-full transition-all duration-300"
              />
            </Progress.Track>
          </Progress.Root>

          {isComplete && (
            <div className="flex justify-end mt-2">
              <AlertDialog.Close
                className="bg-background-select px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text"
                onClick={onComplete}
              >
                Done
              </AlertDialog.Close>
            </div>
          )}
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

import { Progress } from "@base-ui-components/react/progress";
import { useHighlighter } from "services/highlighter";

interface TokenProgressProps {
  label: string;
  current: number;
  max: number;
  period?: string;
}

export function TokenProgress({
  label,
  current,
  max,
  period = "this month",
}: TokenProgressProps) {
  const hl = useHighlighter()
  const percentage = (current / max) * 100;

  return (
    <Progress.Root
      value={current}
      max={max}
      className="grid grid-cols-2 gap-x-2 gap-y-2 w-full"
    >
      <Progress.Label className="[grid-area:1/1] flex items-center font-medium text-base leading-6 text-text">
        {label}
      </Progress.Label>

      <Progress.Value className="[grid-area:1/2] flex items-center justify-end font-normal text-sm leading-5 text-text-alt">
        {() => `${current}/${max} (${period})`}
      </Progress.Value>

      <Progress.Track className="[grid-area:2/1/auto/span_2] bg-background flex rounded-full h-2">
        <Progress.Indicator
          style={{ '--hl-bg': hl.bg, width: `${percentage}%` } as React.CSSProperties}
          className="bg-(--hl-bg) h-2 rounded-full"
        />
      </Progress.Track>
    </Progress.Root>
  );
}

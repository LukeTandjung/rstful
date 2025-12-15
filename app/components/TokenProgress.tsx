import { Progress } from "@base-ui-components/react/progress";
import { highlighter } from "services/highlighter";

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
  const hl = highlighter()
  const percentage = (current / max) * 100;

  return (
    <Progress.Root
      value={current}
      max={max}
      className="grid grid-cols-2 gap-x-2.5 gap-y-3.5 h-10.5"
    >
      <Progress.Label className="[grid-area:1/1] flex items-start font-normal text-lg leading-7 text-text">
        {label}
      </Progress.Label>

      <Progress.Value className="[grid-area:1/2] flex items-start justify-end font-normal text-lg leading-7 text-text">
        {() => `${current}/${max} (${period})`}
      </Progress.Value>

      <Progress.Track className="[grid-area:2/1/auto/span_2] bg-background-alt flex rounded-md h-1">
        <Progress.Indicator
          style={{ '--hl-bg': hl.bg, width: `${percentage}%` } as React.CSSProperties}
          className="bg-(--hl-bg) h-1 rounded-md"
        />
      </Progress.Track>
    </Progress.Root>
  );
}

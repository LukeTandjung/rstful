import { Switch } from "@base-ui-components/react/switch";
import { useHighlighter } from "services/highlighter";

export function CustomSwitch() {
  const hl = useHighlighter()

  return (
    <Switch.Root
      style={{ '--hl-bg': hl.bg } as React.CSSProperties}
      className="relative inline-flex h-6 w-11 items-center rounded-full bg-border-unfocus data-checked:bg-(--hl-bg) transition-colors"
    >
      <Switch.Thumb className="inline-block h-5 w-5 rounded-full bg-background-select transition-transform data-checked:translate-x-5 translate-x-0.5" />
    </Switch.Root>
  );
}

import { ToggleGroup } from "@base-ui-components/react/toggle-group";
import { Toggle } from "@base-ui-components/react/toggle";
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/16/solid";
import { useHighlighter } from "services/highlighter";

export type ChatMode = "regular" | "deep_search";

interface ChatModeToggleProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

export function ChatModeToggle({ mode, onModeChange }: ChatModeToggleProps) {
  const hlRegular = useHighlighter()
  const hlDeepSearch = useHighlighter()

  return (
    <ToggleGroup
      value={[mode]}
      onValueChange={(value) => {
        if (value.length > 0) {
          onModeChange(value[0] as ChatMode);
        }
      }}
      orientation="vertical"
      className="flex flex-col gap-2 p-1 bg-background rounded-lg"
    >
      <Toggle
        value="regular"
        style={{ '--hl-bg': hlRegular.bg, '--hl-text': hlRegular.text } as React.CSSProperties}
        className="flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm leading-5 text-text-alt transition-colors data-pressed:bg-(--hl-bg) data-pressed:text-(--hl-text)"
      >
        <ChatBubbleLeftRightIcon className="size-4" />
        Article Chat
      </Toggle>
      <Toggle
        value="deep_search"
        style={{ '--hl-bg': hlDeepSearch.bg, '--hl-text': hlDeepSearch.text } as React.CSSProperties}
        className="flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm leading-5 text-text-alt transition-colors data-pressed:bg-(--hl-bg) data-pressed:text-(--hl-text)"
      >
        <MagnifyingGlassIcon className="size-4" />Deep Search
      </Toggle>
    </ToggleGroup>
  );
}

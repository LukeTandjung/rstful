import { ToggleGroup } from "@base-ui-components/react/toggle-group";
import { Toggle } from "@base-ui-components/react/toggle";
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/16/solid";

export type ChatMode = "regular" | "deep_search";

interface ChatModeToggleProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

export function ChatModeToggle({ mode, onModeChange }: ChatModeToggleProps) {
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
        className="flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm leading-5 text-text-alt transition-colors data-pressed:bg-background-select data-pressed:text-text"
      >
        <ChatBubbleLeftRightIcon className="size-4" />
        Article Chat
      </Toggle>
      <Toggle
        value="deep_search"
        className="flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm leading-5 text-text-alt transition-colors data-pressed:bg-background-select data-pressed:text-text"
      >
        <MagnifyingGlassIcon className="size-4" />Deep Search
      </Toggle>
    </ToggleGroup>
  );
}

import { Menu } from "@base-ui-components/react/menu";
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
} from "@heroicons/react/16/solid";
import type { ChatMode } from "./ChatModeToggle";

interface ChatModeMenuProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  disabled?: boolean;
}

const modeConfig = {
  regular: {
    label: "Article Chat",
    icon: ChatBubbleLeftRightIcon,
  },
  deep_search: {
    label: "Deep Search",
    icon: MagnifyingGlassIcon,
  },
};

export function ChatModeMenu({ mode, onModeChange, disabled }: ChatModeMenuProps) {
  const currentMode = modeConfig[mode];
  const CurrentIcon = currentMode.icon;

  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={disabled ?? false}
        className="flex items-center gap-1.5 px-2 py-1 text-text-alt text-sm font-medium rounded hover:bg-background-alt transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CurrentIcon className="size-4" />
        {currentMode.label}
        {!disabled && <ChevronDownIcon className="size-3" />}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={4}>
          <Menu.Popup className="bg-background rounded-lg p-1 shadow-lg border border-border-unfocus min-w-40">
            <Menu.Item
              onClick={() => onModeChange("regular")}
              className="flex items-center gap-2 px-3 py-2 text-sm text-text rounded cursor-pointer hover:bg-background-alt transition-colors"
            >
              <ChatBubbleLeftRightIcon className="size-4" />
              Article Chat
            </Menu.Item>
            <Menu.Item
              onClick={() => onModeChange("deep_search")}
              className="flex items-center gap-2 px-3 py-2 text-sm text-text rounded cursor-pointer hover:bg-background-alt transition-colors"
            >
              <MagnifyingGlassIcon className="size-4" />
              Deep Search
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

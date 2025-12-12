import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/16/solid";
import type { Id } from "convex/_generated/dataModel";
import { DeleteConfirmDialog } from "./RemoveFeedDialog";

type ChatMode = "regular" | "x_search" | "user";

interface ConversationListItemProps {
  id: Id<"group_chat">;
  name: string;
  mode: ChatMode;
  isSelected: boolean;
  onSelect: (id: Id<"group_chat">) => void;
  onDelete: (id: Id<"group_chat">) => void;
}

const modeIcons: Record<ChatMode, typeof ChatBubbleLeftRightIcon> = {
  regular: ChatBubbleLeftRightIcon,
  x_search: MagnifyingGlassIcon,
  user: UserIcon,
};

export function ConversationListItem({
  id,
  name,
  mode,
  isSelected,
  onSelect,
  onDelete,
}: ConversationListItemProps) {
  const ModeIcon = modeIcons[mode];

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
        isSelected
          ? "bg-background-select text-text"
          : "text-text-alt hover:bg-background hover:text-text"
      }`}
      onClick={() => onSelect(id)}
    >
      <ModeIcon className="size-4 shrink-0" />
      <span className="font-normal text-sm leading-5 truncate grow">{name}</span>

      <DeleteConfirmDialog
        trigger={
          <button
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-error/20 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <XMarkIcon className="size-4 text-error" />
          </button>
        }
        title="Delete Conversation"
        description={`Are you sure you want to delete "${name}"? This action cannot be undone.`}
        onConfirm={() => onDelete(id)}
      />
    </div>
  );
}

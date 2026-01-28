import { useState } from "react";
import {
  ChatBubbleLeftRightIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/16/solid";
import type { Id } from "convex/_generated/dataModel";
import { DeleteConfirmDialog } from "./RemoveFeedDialog";
import { useHighlighter } from "services/highlighter";

type ChatMode = "regular" | "deep_search" | "user";

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
  deep_search: ChatBubbleLeftRightIcon,
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const ModeIcon = modeIcons[mode];

  const hl = useHighlighter()

  return (
    <div
      style={{ '--hl-bg': hl.bg, '--hl-text': hl.text } as React.CSSProperties}
      className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
        isSelected
          ? "bg-(--hl-bg) text-(--hl-text)"
          : "text-text-alt hover:bg-(--hl-bg) hover:text-(--hl-text)"
      }`}
      onClick={() => onSelect(id)}
    >
      <ModeIcon className="size-4 shrink-0" />
      {name === "..." ? (
        <span className="font-normal text-sm leading-5 truncate grow text-text-alt animate-pulse">
          Generating name...
        </span>
      ) : (
        <span className="font-normal text-sm leading-5 truncate grow">{name}</span>
      )}

      <button
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-error/20 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          setDeleteDialogOpen(true);
        }}
      >
        <XMarkIcon className="size-4 text-error" />
      </button>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Conversation"
        description={`Are you sure you want to delete "${name}"? This action cannot be undone.`}
        onConfirm={() => onDelete(id)}
      />
    </div>
  );
}

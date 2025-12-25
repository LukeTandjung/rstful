import { useState, useEffect, useRef } from "react";
import type { Route } from "./+types/chat";
import { ScrollArea } from "@base-ui-components/react/scroll-area";
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  ClockIcon,
  PlusIcon,
} from "@heroicons/react/16/solid";
import { SectionCard, ChatModeToggle, ConversationListItem } from "components";
import type { ChatMode } from "components";
import { Button } from "@base-ui-components/react/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useHighlighter } from "services/highlighter";

// Helper to convert URLs in text to clickable links
const linkifyText = (text: string): React.ReactNode => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // Reset regex lastIndex since we're reusing it
      urlRegex.lastIndex = 0;
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-link underline hover:text-link-hover"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

// localStorage helpers for persisting search state across page switches
const SEARCH_STATE_KEY = "deep_search_state";

interface SearchState {
  chatId: string;
  status: "thinking" | "searching";
  startedAt: number;
  messageCountAtStart: number;
}

const saveSearchState = (state: SearchState) => {
  localStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(state));
};

const getSearchState = (): SearchState | null => {
  const stored = localStorage.getItem(SEARCH_STATE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

const clearSearchState = () => {
  localStorage.removeItem(SEARCH_STATE_KEY);
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Chat - RSS Reader" },
    {
      name: "description",
      content: "Chat with an AI assistant",
    },
  ];
}

type StreamStatus = "idle" | "thinking" | "searching" | "generating";

export default function Chat() {
  const [input, setInput] = useState("");
  const [chatMode, setChatMode] = useState<ChatMode>("regular");
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("idle");
  const [streamingContent, setStreamingContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const hlNewConversation = useHighlighter();
  const hlSendChat = useHighlighter();

  const [chatId, setChatId] = useState<Id<"group_chat"> | null>(null);

  const viewer = useQuery(api.auth.currentUser);
  const conversations = useQuery(
    api.chat.get_user_conversations,
    viewer?._id ? { user_id: viewer._id } : "skip",
  );
  const createConversation = useMutation(api.chat.create_conversation);
  const deleteConversation = useMutation(api.chat.delete_conversation);
  const sendMessageMutation = useMutation(api.chat.send_message);

  // Single source of truth: Convex database
  const messages = useQuery(
    api.chat.get_messages,
    chatId ? { group_chat_id: chatId } : "skip",
  );

  const selectedConversation = conversations?.find((c) => c._id === chatId);
  const effectiveMode = selectedConversation?.mode ?? chatMode;

  const handleModeChange = (newMode: ChatMode) => {
    if (chatId) return;
    setChatMode(newMode);
  };

  const handleNewConversation = async () => {
    if (!viewer?._id) return;
    const id = await createConversation({
      user_id: viewer._id,
      name: `New ${chatMode === "deep_search" ? "Deep Search" : "Chat"}`,
      mode: chatMode,
    });
    setChatId(id);
  };

  const handleSelectConversation = (id: Id<"group_chat">) => {
    setChatId(id);
    const conversation = conversations?.find((c) => c._id === id);
    if (conversation && conversation.mode !== "user") {
      setChatMode(conversation.mode);
    }
  };

  const handleDeleteConversation = async (id: Id<"group_chat">) => {
    await deleteConversation({ group_chat_id: id });
    if (chatId === id) {
      setChatId(null);
      // Reset streaming state when deleting current chat
      setStreamStatus("idle");
      setStreamingContent("");
      clearSearchState();
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || streamStatus !== "idle" || !viewer?._id) return;

    const userInput = input;
    setInput("");
    setStreamingContent("");

    try {
      // Create conversation if needed
      let currentChatId = chatId;
      if (!currentChatId) {
        currentChatId = await createConversation({
          user_id: viewer._id,
          name: `New ${chatMode === "deep_search" ? "Deep Search" : "Chat"}`,
          mode: chatMode,
        });
        setChatId(currentChatId);
      }

      // Save user message to Convex - will appear via subscription
      await sendMessageMutation({
        group_chat_id: currentChatId,
        sender_id: viewer._id,
        content: userInput,
        role: "user",
      });

      // Start streaming from API
      setStreamStatus("thinking");
      abortControllerRef.current = new AbortController();

      // Save search state to localStorage for deep search (persists across page switches)
      if (effectiveMode === "deep_search") {
        saveSearchState({
          chatId: currentChatId,
          status: "thinking",
          startedAt: Date.now(),
          messageCountAtStart: (messages?.length || 0) + 1, // +1 for the user message we just sent
        });
      }

      // Build full conversation history for the API
      const existingMessages = (messages || []).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const fullMessages = [
        ...existingMessages,
        { role: "user", content: userInput },
      ];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: fullMessages,
          user_id: viewer._id,
          chat_id: currentChatId,
          mode: effectiveMode,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Parse SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const event = JSON.parse(data);

                if (event.type === "status") {
                  const newStatus = event.status as StreamStatus;
                  setStreamStatus(newStatus);
                  // Update localStorage when status changes to searching
                  if (
                    newStatus === "searching" &&
                    effectiveMode === "deep_search"
                  ) {
                    const savedState = getSearchState();
                    if (savedState) {
                      saveSearchState({ ...savedState, status: "searching" });
                    }
                  }
                } else if (event.type === "text" && event.content) {
                  setStreamingContent((prev) => prev + event.content);
                }
              } catch {
                // Ignore parse errors for malformed chunks
              }
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Failed to send message:", error);
        setInput(userInput);
      }
    } finally {
      setStreamStatus("idle");
      setStreamingContent("");
      clearSearchState();
      abortControllerRef.current = null;
    }
  };

  // Restore search state from localStorage on mount/chat change
  // Only runs when NOT actively streaming (restoration logic, not live updates)
  useEffect(() => {
    // Skip if we're actively streaming - don't interfere with live state
    if (abortControllerRef.current) {
      return;
    }

    const savedState = getSearchState();

    // If there's a saved search for a different chat, don't show spinner here
    if (savedState && savedState.chatId !== chatId) {
      setStreamStatus("idle");
      return;
    }

    if (savedState && savedState.chatId === chatId) {
      // Timeout after 10 minutes - search probably failed
      const tenMinutes = 10 * 60 * 1000;
      if (Date.now() - savedState.startedAt > tenMinutes) {
        clearSearchState();
        setStreamStatus("idle");
        return;
      }

      // Check if search is still in progress (no new messages since start)
      // Account for acknowledgment message (+1) in deep search
      const expectedMessagesBeforeResult = savedState.messageCountAtStart + 1;
      const currentMessageCount = messages?.length || 0;
      if (currentMessageCount <= expectedMessagesBeforeResult) {
        // Search still in progress - restore the spinner
        setStreamStatus("searching");
      } else {
        // Final results arrived - search completed, clear state
        clearSearchState();
        setStreamStatus("idle");
      }
    }
  }, [chatId, messages?.length]);

  // Auto-scroll when messages or streaming content changes
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingContent, streamStatus]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const placeholderText =
    effectiveMode === "deep_search"
      ? "Describe the type of people you want to find online..."
      : "Type your message... (Press Enter to send)";

  const cardDescription =
    effectiveMode === "deep_search"
      ? "Find interesting people online"
      : "Chat with an AI assistant about your RSS feeds";

  const isStreaming = streamStatus !== "idle";

  const getStatusText = () => {
    switch (streamStatus) {
      case "thinking":
        return "Thinking...";
      case "searching":
        return "Searching...";
      case "generating":
        return "Generating response...";
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 md:grow md:min-h-0 w-full">
      {/* Side Panel */}
      <div className="flex flex-col gap-4 md:w-64 shrink-0">
        <SectionCard
          icon={<ChatBubbleLeftRightIcon className="size-7" />}
          title="Chat Mode"
          description="Select your chat type"
        >
          <ChatModeToggle mode={chatMode} onModeChange={handleModeChange} />
        </SectionCard>

        <SectionCard
          icon={<ClockIcon className="size-7" />}
          title="History"
          description="Recent conversations"
          className="grow"
        >
          <div className="flex flex-col gap-2 grow">
            <ScrollArea.Root className="grow min-h-0">
              <ScrollArea.Viewport className="grow min-h-0">
                <div className="flex flex-col gap-1">
                  {conversations
                    ?.filter((c) => c.mode !== "user")
                    .map((conversation) => (
                      <ConversationListItem
                        key={conversation._id}
                        id={conversation._id}
                        name={conversation.name}
                        mode={conversation.mode}
                        isSelected={chatId === conversation._id}
                        onSelect={handleSelectConversation}
                        onDelete={handleDeleteConversation}
                      />
                    ))}
                  {(!conversations ||
                    conversations.filter((c) => c.mode !== "user").length ===
                      0) && (
                    <div className="font-normal text-sm leading-5 text-text-alt">
                      No conversations yet
                    </div>
                  )}
                </div>
              </ScrollArea.Viewport>
            </ScrollArea.Root>
            <Button
              onClick={handleNewConversation}
              disabled={!viewer?._id}
              style={
                {
                  "--hl-bg": hlNewConversation.bg,
                  "--hl-text": hlNewConversation.text,
                } as React.CSSProperties
              }
              className="flex items-center justify-center gap-2 bg-(--hl-bg) text-(--hl-text) px-3 py-2 rounded-lg font-medium text-sm leading-5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PlusIcon className="size-4" />
              New Conversation
            </Button>
          </div>
        </SectionCard>
      </div>

      {/* Main Chat Area */}
      <SectionCard
        icon={<ChatBubbleLeftRightIcon className="size-7" />}
        title={
          selectedConversation?.name ??
          (effectiveMode === "deep_search" ? "Deep Search" : "AI Chat")
        }
        description={cardDescription}
        className="md:min-h-0 md:grow"
      >
        <div className="flex flex-col grow min-h-0 w-full">
          <ScrollArea.Root className="flex grow min-h-0 w-full">
            <ScrollArea.Viewport
              ref={scrollRef}
              className="flex grow min-h-0 w-full"
            >
              <div className="flex flex-col gap-4 p-4 pb-8 w-full">
                {messages?.map((message) => (
                  <div
                    key={message._id}
                    className={`flex w-full ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div className="max-w-[80%] rounded-lg p-4 bg-background text-text">
                      <div className="font-normal text-base leading-7 whitespace-pre-wrap">
                        {linkifyText(message.content)}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Streaming content bubble - only show if not already saved to DB */}
                {streamingContent &&
                  (() => {
                    const lastAssistantMsg = messages
                      ?.filter((m) => m.role === "assistant")
                      .slice(-1)[0];
                    const alreadySaved =
                      lastAssistantMsg?.content === streamingContent.trim();
                    return !alreadySaved ? (
                      <div className="flex w-full justify-start">
                        <div className="max-w-[80%] rounded-lg p-4 bg-background-select text-text">
                          <div className="font-normal text-base leading-7 whitespace-pre-wrap">
                            {linkifyText(streamingContent)}
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}

                {/* Loading indicator - show during searching phase, or when waiting for content */}
                {isStreaming &&
                  (streamStatus === "searching" || !streamingContent) && (
                    <div className="flex items-center gap-2 text-text-alt py-2">
                      <div className="size-4 border-2 border-border-focus border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">{getStatusText()}</span>
                    </div>
                  )}
              </div>
            </ScrollArea.Viewport>
          </ScrollArea.Root>

          <div className="flex gap-3 p-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholderText}
              className="flex-1 bg-background px-3 py-2 rounded-lg text-base leading-7 text-text placeholder:text-text-alt resize-none border border-border-unfocus"
              rows={2}
              disabled={isStreaming}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              style={
                {
                  "--hl-bg": hlSendChat.bg,
                  "--hl-text": hlSendChat.text,
                } as React.CSSProperties
              }
              className="bg-(--hl-bg) text-(--hl-text) px-4 py-2 rounded-lg font-medium text-base leading-7 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PaperAirplaneIcon className="size-5" />
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

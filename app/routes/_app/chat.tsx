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

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: userInput }],
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
                  setStreamStatus(event.status as StreamStatus);
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
      abortControllerRef.current = null;
    }
  };

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
              className="flex items-center justify-center gap-2 bg-background-select px-3 py-2 rounded-lg font-medium text-sm leading-5 text-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === "user"
                          ? "bg-background text-text"
                          : "bg-background-select text-text"
                      }`}
                    >
                      <div className="font-normal text-base leading-7 whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Streaming content bubble */}
                {streamingContent && (
                  <div className="flex w-full justify-start">
                    <div className="max-w-[80%] rounded-lg p-4 bg-background-select text-text">
                      <div className="font-normal text-base leading-7 whitespace-pre-wrap">
                        {streamingContent}
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading indicator - only show when no streaming content yet */}
                {isStreaming && !streamingContent && (
                  <div className="flex items-center gap-2 text-text-alt py-2">
                    <div className="size-4 border-2 border-border-focus border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">{getStatusText()}</span>
                  </div>
                )}
              </div>
            </ScrollArea.Viewport>
          </ScrollArea.Root>

          <div className="flex gap-3 p-4 border-t border-border-unfocus">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholderText}
              className="flex-1 bg-background-select px-3 py-2 rounded-lg text-base leading-7 text-text placeholder:text-text-alt resize-none"
              rows={2}
              disabled={isStreaming}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="bg-border-focus hover:bg-border-focus/80 px-4 py-2 rounded-lg font-medium text-base leading-7 text-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PaperAirplaneIcon className="size-5" />
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

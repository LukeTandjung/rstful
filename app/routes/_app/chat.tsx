import { useState, useRef } from "react";
import type { Route } from "./+types/chat";
import { ScrollArea } from "@base-ui-components/react/scroll-area";
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  ClockIcon,
  PlusIcon,
} from "@heroicons/react/16/solid";
import { ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";
import { SectionCard, ConversationListItem } from "components";
import { Button } from "@base-ui-components/react/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useHighlighter } from "services/highlighter";
import ReactMarkdown from "react-markdown";

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
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("idle");
  const [streamingContent, setStreamingContent] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingChatIdRef = useRef<Id<"group_chat"> | null>(null);

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const hlNewConversation = useHighlighter();

  const [chatId, setChatId] = useState<Id<"group_chat"> | null>(null);

  const viewer = useQuery(api.auth.currentUser);
  const conversations = useQuery(
    api.chat.get_user_conversations,
    viewer?._id ? { user_id: viewer._id } : "skip",
  );
  const createConversation = useMutation(api.chat.create_conversation);
  const deleteConversation = useMutation(api.chat.delete_conversation);
  const sendMessageMutation = useMutation(api.chat.send_message);
  const deductMessageToken = useMutation(api.tokens.deductMessageToken);

  // Single source of truth: Convex database
  const messages = useQuery(
    api.chat.get_messages,
    chatId ? { group_chat_id: chatId } : "skip",
  );

  const selectedConversation = conversations?.find((c) => c._id === chatId);

  const handleNewConversation = () => {
    setChatId(null);
  };

  const handleSelectConversation = (id: Id<"group_chat">) => {
    setChatId(id);
  };

  const handleDeleteConversation = async (id: Id<"group_chat">) => {
    await deleteConversation({ group_chat_id: id });
    if (chatId === id) {
      setChatId(null);
      setStreamStatus("idle");
      setStreamingContent("");
      streamingChatIdRef.current = null;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || streamStatus !== "idle" || !viewer?._id) return;

    const userInput = input;
    setInput("");
    setStreamingContent("");

    let success = false;

    try {
      // Create conversation if needed
      let currentChatId = chatId;
      if (!currentChatId) {
        currentChatId = await createConversation({
          user_id: viewer._id,
          name: "...",
          mode: "regular",
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
      streamingChatIdRef.current = currentChatId;
      setStreamStatus("thinking");
      abortControllerRef.current = new AbortController();

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

      // Stream completed successfully - mark for token deduction
      success = true;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Failed to send message:", error);
        setInput(userInput);
      }
    } finally {
      streamingChatIdRef.current = null;
      setStreamStatus("idle");
      setStreamingContent("");
      abortControllerRef.current = null;

      // Deduct token only on successful completion
      if (success) {
        try {
          await deductMessageToken();
        } catch (error) {
          console.error("Failed to deduct token:", error);
        }
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isStreaming = streamStatus !== "idle";
  const isStreamingThisChat =
    isStreaming && chatId === streamingChatIdRef.current;

  const getStatusText = (status: StreamStatus): string => {
    switch (status) {
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
      <div className="flex flex-col gap-4 md:w-64 shrink-0 md:min-h-0">
        <SectionCard
          icon={<ClockIcon className="size-7" />}
          title="History"
          description="Recent conversations"
          className="grow min-h-0 overflow-hidden"
        >
          <div className="flex flex-col gap-2 grow min-h-0">
            <ScrollArea.Root className="min-h-0 w-full max-h-64 md:max-h-none md:grow">
              <ScrollArea.Viewport className="h-full w-full">
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
          selectedConversation?.name === "..."
            ? "Generating name..."
            : (selectedConversation?.name ?? "AI Chat")
        }
        description="Chat with an AI assistant about your RSS feeds"
        className="md:min-h-0 md:grow"
      >
        <div className="flex flex-col grow min-h-0 w-full">
          <ScrollArea.Root className="flex grow min-h-0 w-full">
            <ScrollArea.Viewport className="flex grow min-h-0 w-full">
              <div className="flex flex-col gap-4 p-4 pb-8 w-full">
                {messages?.map((message) => (
                  <div
                    key={message._id}
                    className={`flex w-full ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div className={`max-w-[80%] overflow-hidden rounded-lg p-4 bg-background text-text ${message.role === "assistant" ? "flex flex-col items-end" : ""}`}>
                      {message.role === "user" ? (
                        <div className="font-normal text-base leading-7 whitespace-pre-wrap">
                          {message.content}
                        </div>
                      ) : (
                        <>
                          <div className="prose max-w-none text-text prose-headings:text-text prose-strong:text-text prose-code:text-text prose-code:bg-background-alt prose-code:px-1 prose-code:rounded prose-pre:overflow-x-auto prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 self-stretch">
                            <ReactMarkdown
                              components={{
                                a: ({ href, children }) => (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-link underline hover:text-link-hover"
                                  >
                                    {children}
                                  </a>
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                          <button
                            onClick={() => handleCopy(message.content, message._id)}
                            className="mt-2 p-1 text-text-alt hover:text-text transition-colors"
                          >
                            {copiedId === message._id ? (
                              <CheckIcon className="size-4" />
                            ) : (
                              <ClipboardDocumentIcon className="size-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {/* Streaming area - always visible during streaming */}
                {isStreamingThisChat && (
                  <div className="flex w-full justify-start">
                    <div className="max-w-[80%] overflow-hidden rounded-lg p-4 bg-background text-text">
                      {!streamingContent && (
                        <div className="flex items-center gap-2 text-text-alt">
                          <div className="size-4 border-2 border-border-focus border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm">
                            {getStatusText(streamStatus)}
                          </span>
                        </div>
                      )}
                      {streamingContent && (
                        <div className="prose max-w-none text-text prose-headings:text-text prose-strong:text-text prose-code:text-text prose-code:bg-background-alt prose-code:px-1 prose-code:rounded prose-pre:overflow-x-auto prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
                          <ReactMarkdown
                            components={{
                              a: ({ href, children }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-link underline hover:text-link-hover"
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {streamingContent}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea.Viewport>
          </ScrollArea.Root>

          <div className="p-4">
            <div className="flex flex-col self-stretch items-start gap-2 bg-background px-3 py-2 rounded-lg border border-border-unfocus">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="w-full bg-transparent text-base leading-7 text-text placeholder:text-text-alt resize-none outline-none"
                rows={2}
                disabled={isStreaming}
              />
              <div className="flex flex-row w-full justify-end">
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                  className="text-text-alt p-1 rounded hover:text-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PaperAirplaneIcon className="size-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

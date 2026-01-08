import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@base-ui-components/react/scroll-area";
import { PaperAirplaneIcon } from "@heroicons/react/16/solid";
import { Button } from "@base-ui-components/react/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import ReactMarkdown from "react-markdown";

export type StreamStatus = "idle" | "thinking" | "searching" | "generating";

interface ChatInterfaceProps {
  chatId: Id<"group_chat"> | null;
  userId: Id<"users">;
  placeholder?: string;
  apiEndpoint?: string;
  apiPayloadExtra?: Record<string, unknown>;
  externalLoading?: boolean;
}

export function ChatInterface({
  chatId,
  userId,
  placeholder = "Type your message...",
  apiEndpoint = "/api/chat",
  apiPayloadExtra = {},
  externalLoading = false,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("idle");
  const [streamingContent, setStreamingContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessageMutation = useMutation(api.chat.send_message);

  const messages = useQuery(
    api.chat.get_messages,
    chatId ? { group_chat_id: chatId } : "skip",
  );

  // Auto-scroll when messages or streaming content changes
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingContent, streamStatus]);

  const parseSSEStream = async (response: Response) => {
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
              // Ignore parse errors
            }
          }
        }
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || streamStatus !== "idle" || !chatId) return;

    const userInput = input;
    setInput("");
    setStreamingContent("");

    try {
      // Save user message
      await sendMessageMutation({
        group_chat_id: chatId,
        sender_id: userId,
        content: userInput,
        role: "user",
      });

      setStreamStatus("thinking");
      abortControllerRef.current = new AbortController();

      // Build conversation history
      const existingMessages = (messages || []).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const fullMessages = [
        ...existingMessages,
        { role: "user", content: userInput },
      ];

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: fullMessages,
          user_id: userId,
          chat_id: chatId,
          mode: "regular",
          ...apiPayloadExtra,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      await parseSSEStream(response);
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isStreaming = streamStatus !== "idle" || externalLoading;

  const getStatusText = () => {
    if (externalLoading) return "Generating summary...";
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
                  {message.role === "user" ? (
                    <div className="font-normal text-base leading-7 whitespace-pre-wrap">
                      {message.content}
                    </div>
                  ) : (
                    <div className="prose max-w-none text-text prose-headings:text-text prose-strong:text-text prose-code:text-text prose-code:bg-background-alt prose-code:px-1 prose-code:rounded prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
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
                  )}
                </div>
              </div>
            ))}

            {/* Streaming content bubble */}
            {streamingContent &&
              (() => {
                const lastAssistantMsg = messages
                  ?.filter((m) => m.role === "assistant")
                  .slice(-1)[0];
                const alreadySaved =
                  lastAssistantMsg?.content === streamingContent.trim();
                return !alreadySaved ? (
                  <div className="flex w-full justify-start">
                    <div className="max-w-[80%] rounded-lg p-4 bg-background text-text">
                      <div className="prose max-w-none text-text prose-headings:text-text prose-strong:text-text prose-code:text-text prose-code:bg-background-alt prose-code:px-1 prose-code:rounded prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
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
                    </div>
                  </div>
                ) : null;
              })()}

            {/* Loading indicator */}
            {isStreaming &&
              (externalLoading || streamStatus === "searching" || !streamingContent) && (
                <div className="flex items-center gap-2 text-text-alt py-2">
                  <div className="size-4 border-2 border-border-focus border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">{getStatusText()}</span>
                </div>
              )}
          </div>
        </ScrollArea.Viewport>
      </ScrollArea.Root>

      <div className="p-4">
        <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border border-border-unfocus">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-base leading-7 text-text placeholder:text-text-alt resize-none outline-none"
            rows={1}
            disabled={isStreaming}
          />
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
  );
}

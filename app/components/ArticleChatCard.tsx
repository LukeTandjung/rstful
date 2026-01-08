import { useState, useEffect, useRef } from "react";
import { ChatBubbleLeftRightIcon, XMarkIcon } from "@heroicons/react/16/solid";
import { SectionCard, ChatInterface, type StreamStatus } from "components";
import { Button } from "@base-ui-components/react/button";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id, Doc } from "convex/_generated/dataModel";

interface ArticleChatCardProps {
  article: Doc<"cached_content"> | Doc<"saved_content">;
  userId: Id<"users">;
  onClose: () => void;
}

export function ArticleChatCard({ article, userId, onClose }: ArticleChatCardProps) {
  const [chatId, setChatId] = useState<Id<"group_chat"> | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("idle");
  const [streamingContent, setStreamingContent] = useState("");
  const createConversation = useMutation(api.chat.create_conversation);
  const sendMessageMutation = useMutation(api.chat.send_message);
  const hasInitialized = useRef(false);

  // The message includes the article link so the agent can fetch it
  const userMessage = `Please summarize this article for me: ${article.link}`;

  // Create conversation and generate synopsis on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initChat = async () => {
      try {
        const newChatId = await createConversation({
          user_id: userId,
          name: article.title.slice(0, 50),
          mode: "regular",
        });
        setChatId(newChatId);

        // Save user message requesting synopsis with the article link
        await sendMessageMutation({
          group_chat_id: newChatId,
          sender_id: userId,
          content: userMessage,
          role: "user",
        });

        // Generate synopsis using /api/chat
        setStreamStatus("generating");

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: userMessage }],
            user_id: userId,
            chat_id: newChatId,
            mode: "regular",
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        // Parse SSE stream like ChatInterface does
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
      } catch (error) {
        console.error("Failed to initialize chat:", error);
      } finally {
        setStreamStatus("idle");
        setStreamingContent("");
      }
    };

    initChat();
  }, [userId, article.title, userMessage, createConversation, sendMessageMutation]);

  return (
    <SectionCard
      icon={<ChatBubbleLeftRightIcon className="size-7" />}
      title="Article Chat"
      description={article.title}
      className="basis-1/2 min-h-0"
      action={
        <Button
          onClick={onClose}
          className="p-1 rounded hover:bg-background transition-colors"
          aria-label="Close chat"
        >
          <XMarkIcon className="size-5 text-text-alt hover:text-text" />
        </Button>
      }
    >
      {chatId ? (
        <ChatInterface
          chatId={chatId}
          userId={userId}
          placeholder="Ask about this article..."
          externalLoading={streamStatus !== "idle"}
        />
      ) : (
        <div className="flex items-center justify-center py-8">
          <div className="font-normal text-base leading-7 text-text-alt">
            Initializing chat...
          </div>
        </div>
      )}
    </SectionCard>
  );
}

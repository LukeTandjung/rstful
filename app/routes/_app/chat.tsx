import { useState, useEffect, useRef } from "react";
import type { Route } from "./+types/chat";
import { ScrollArea } from "@base-ui-components/react/scroll-area";
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  StopIcon,
} from "@heroicons/react/16/solid";
import { SectionCard } from "components";
import { Button } from "@base-ui-components/react/button";
import { useChat } from "dedalus-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Chat - RSS Reader" },
    {
      name: "description",
      content: "Chat with an AI assistant",
    },
  ];
}

export default function Chat() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const [chatId, setChatId] = useState<string | null>(null);

  const viewer = useQuery(api.auth.currentUser);
  const getOrCreateChat = useMutation(api.chat.get_or_create_ai_chat);
  const sendMessageMutation = useMutation(api.chat.send_message);
  const dbMessages = useQuery(
    api.chat.get_messages,
    chatId ? { group_chat_id: chatId as never } : "skip"
  );

  useEffect(() => {
    if (viewer?._id && !chatId) {
      getOrCreateChat({ user_id: viewer._id }).then((id) => setChatId(id));
    }
  }, [viewer?._id, chatId, getOrCreateChat]);

  const { messages, sendMessage, status, stop } = useChat({
    transport: { api: "/api/chat" },
  });

  const handleSend = async () => {
    if (!input.trim() || status === "streaming" || !viewer?._id || !chatId) return;

    const userInput = input;
    setInput("");

    await sendMessageMutation({
      group_chat_id: chatId as never,
      sender_id: viewer._id,
      content: userInput,
      role: "user",
    });

    sendMessage(userInput);
  };

  const getMessageContent = (content: unknown): string => {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .map((part) => (typeof part === "object" && "text" in part ? part.text : ""))
        .join("");
    }
    return "";
  };

  useEffect(() => {
    if (status === "ready" && messages.length > 0 && viewer?._id && chatId) {
      const lastMsg = messages[messages.length - 1];
      const content = getMessageContent(lastMsg?.content);
      if (lastMsg?.role === "assistant" && content) {
        sendMessageMutation({
          group_chat_id: chatId as never,
          sender_id: viewer._id,
          content,
          role: "assistant",
        });
      }
    }
  }, [status, messages, viewer?._id, chatId, sendMessageMutation]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isStreaming = status === "streaming";

  return (
    <div className="flex flex-col gap-6 md:grow md:min-h-0 w-full max-w-4xl mx-auto">
      <SectionCard
        icon={<ChatBubbleLeftRightIcon className="size-7" />}
        title="AI Chat"
        description="Chat with an AI assistant about your RSS feeds"
        className="md:min-h-0"
      >
        <div className="flex flex-col grow min-h-0 w-full">
          <ScrollArea.Root className="flex grow min-h-0 w-full">
            <ScrollArea.Viewport ref={scrollRef} className="flex grow min-h-0 w-full">
              <div className="flex flex-col gap-4 p-4 w-full">
                {messages.map((message, index) => (
                  <div
                    key={index}
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
                        {getMessageContent(message.content)}
                      </div>
                    </div>
                  </div>
                ))}
                {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex items-start gap-2">
                    <div className="bg-background-select rounded-lg p-4">
                      <div className="font-normal text-base leading-7 text-text-alt">
                        Thinking...
                      </div>
                    </div>
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
              placeholder="Type your message... (Press Enter to send)"
              className="flex-1 bg-background-select px-3 py-2 rounded-lg text-base leading-7 text-text placeholder:text-text-alt resize-none"
              rows={2}
              disabled={isStreaming}
            />
            {isStreaming ? (
              <Button
                onClick={stop}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-medium text-base leading-7 text-white transition-colors"
              >
                <StopIcon className="size-5" />
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
                className="bg-border-focus hover:bg-border-focus/80 px-4 py-2 rounded-lg font-medium text-base leading-7 text-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <PaperAirplaneIcon className="size-5" />
              </Button>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

import { useState } from "react";
import type { Route } from "./+types/chat";
import { Separator } from "@base-ui-components/react/separator";
import { ScrollArea } from "@base-ui-components/react/scroll-area";
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/16/solid";
import { SectionCard, MenuBar } from "components";
import { Button } from "@base-ui-components/react/button";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Chat - RSS Reader" },
    {
      name: "description",
      content: "Chat with an AI assistant",
    },
  ];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your AI assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate LLM response (in production, call actual LLM API)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I'm a demo AI assistant. In a real implementation, I would connect to an LLM API like OpenAI, Anthropic, or a local model to provide intelligent responses.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
            <ScrollArea.Viewport className="flex grow min-h-0">
              <div className="flex flex-col gap-4 p-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex flex-col gap-2 ${
                      message.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === "user"
                          ? "bg-border-focus text-text"
                          : "bg-background-select text-text"
                      }`}
                    >
                      <div className="font-normal text-base leading-7 whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                    <div className="font-normal text-xs leading-5 text-text-alt">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                {isLoading && (
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
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
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

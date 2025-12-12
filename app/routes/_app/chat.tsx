import { useState, useEffect, useRef } from "react";
import type { Route } from "./+types/chat";
import { ScrollArea } from "@base-ui-components/react/scroll-area";
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  StopIcon,
  ClockIcon,
  PlusIcon,
} from "@heroicons/react/16/solid";
import { SectionCard, ChatModeToggle, ConversationListItem } from "components";
import type { ChatMode } from "components";
import { Button } from "@base-ui-components/react/button";
import { useChat } from "dedalus-react";
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

export default function Chat() {
  const [input, setInput] = useState("");
  const [chatMode, setChatMode] = useState<ChatMode>("regular");
  const scrollRef = useRef<HTMLDivElement>(null);

  const [chatId, setChatId] = useState<Id<"group_chat"> | null>(null);

  const viewer = useQuery(api.auth.currentUser);
  const conversations = useQuery(
    api.chat.get_user_conversations,
    viewer?._id ? { user_id: viewer._id } : "skip",
  );
  const createConversation = useMutation(api.chat.create_conversation);
  const deleteConversation = useMutation(api.chat.delete_conversation);
  const sendMessageMutation = useMutation(api.chat.send_message);
  const dbMessages = useQuery(
    api.chat.get_messages,
    chatId ? { group_chat_id: chatId } : "skip",
  );

  const selectedConversation = conversations?.find((c) => c._id === chatId);

  const {
    messages: streamingMessages,
    sendMessage,
    status,
    stop,
    setMessages,
  } = useChat({
    transport: {
      api: "/api/chat",
      body: {
        user_id: viewer?._id,
        mode: selectedConversation?.mode ?? chatMode,
      },
    },
  });

  const handleModeChange = (newMode: ChatMode) => {
    if (chatId) return;
    setChatMode(newMode);
    setMessages([]);
  };

  const handleNewConversation = async () => {
    if (!viewer?._id) return;
    const id = await createConversation({
      user_id: viewer._id,
      name: `New ${chatMode === "x_search" ? "X Search" : "Chat"}`,
      mode: chatMode,
    });
    setChatId(id);
    setMessages([]);
  };

  const handleSelectConversation = (id: Id<"group_chat">) => {
    setChatId(id);
    setMessages([]);
    const conversation = conversations?.find((c) => c._id === id);
    if (conversation && conversation.mode !== "user") {
      setChatMode(conversation.mode);
    }
  };

  const handleDeleteConversation = async (id: Id<"group_chat">) => {
    await deleteConversation({ group_chat_id: id });
    if (chatId === id) {
      setChatId(null);
      setMessages([]);
    }
  };

  const displayMessages = [
    ...(dbMessages || []).map((msg) => ({
      role: msg.role || "user",
      content: msg.content,
      id: msg._id,
    })),
    ...streamingMessages
      .filter(
        (sm) =>
          !dbMessages?.some(
            (db) => db.content === sm.content && db.role === sm.role,
          ),
      )
      .map((msg, i) => ({
        role: msg.role,
        content: msg.content,
        id: `streaming-${i}`,
      })),
  ];

  const handleSend = async () => {
    if (!input.trim() || status === "streaming" || !viewer?._id) return;

    const userInput = input;
    setInput("");

    let currentChatId = chatId;
    if (!currentChatId) {
      currentChatId = await createConversation({
        user_id: viewer._id,
        name: `New ${chatMode === "x_search" ? "X Search" : "Chat"}`,
        mode: chatMode,
      });
      setChatId(currentChatId);
    }

    await sendMessageMutation({
      group_chat_id: currentChatId,
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
        .map((part) =>
          typeof part === "object" && "text" in part ? part.text : "",
        )
        .join("");
    }
    return "";
  };

  useEffect(() => {
    if (
      status === "ready" &&
      streamingMessages.length > 0 &&
      viewer?._id &&
      chatId
    ) {
      const lastMsg = streamingMessages[streamingMessages.length - 1];
      const content = getMessageContent(lastMsg?.content);
      if (lastMsg?.role === "assistant" && content) {
        sendMessageMutation({
          group_chat_id: chatId,
          sender_id: viewer._id,
          content,
          role: "assistant",
        });
      }
    }
  }, [status, streamingMessages, viewer?._id, chatId, sendMessageMutation]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [displayMessages]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isStreaming = status === "streaming";

  const effectiveMode = selectedConversation?.mode ?? chatMode;

  const placeholderText =
    effectiveMode === "x_search"
      ? "Describe the type of people you want to find on X..."
      : "Type your message... (Press Enter to send)";

  const cardDescription =
    effectiveMode === "x_search"
      ? "Find interesting people on X/Twitter"
      : "Chat with an AI assistant about your RSS feeds";

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
              className="flex items-center justify-center gap-2 bg-background-select  px-3 py-2 rounded-lg font-medium text-sm leading-5 text-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          (effectiveMode === "x_search" ? "X Search" : "AI Chat")
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
              <div className="flex flex-col gap-4 p-4 w-full">
                {displayMessages.map((message) => (
                  <div
                    key={message.id}
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
                {isStreaming &&
                  displayMessages[displayMessages.length - 1]?.role !==
                    "assistant" && (
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
              placeholder={placeholderText}
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

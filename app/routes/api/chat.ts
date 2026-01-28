import type { ActionFunctionArgs } from "react-router";
import {
  LanguageModel,
  AgentRunner,
  Prompt,
  McpRegistry,
  EmbeddingModel,
} from "@luketandjung/ariadne";
import { Effect, Layer, Stream } from "effect";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import {
  DedalusClientLive,
  Gpt5,
  Gpt4oMini,
  TextEmbedding,
  ChatToolkit,
  createChatToolkitLayer,
  createKnowledgeGraphTools,
  type KnowledgeGraphToolDependencies,
  ARTICLE_CHAT_PROMPT,
} from "services/agents";

const convexUrl = process.env.VITE_CONVEX_URL;
const convexClient = convexUrl ? new ConvexHttpClient(convexUrl) : null;

async function createEmbedding(text: string): Promise<Array<number>> {
  return await Effect.runPromise(
    Effect.gen(function* () {
      const model = yield* EmbeddingModel.EmbeddingModel;
      return yield* model.embed(text);
    }).pipe(
      Effect.provide(TextEmbedding.pipe(Layer.provide(DedalusClientLive))),
    ),
  );
}

function createKnowledgeGraphDeps(
  userId: Id<"users">,
): KnowledgeGraphToolDependencies {
  if (!convexClient) {
    throw new Error("Convex client not initialized");
  }

  return {
    createEmbedding,
    searchVertices: async (args) => {
      return await convexClient.action(api.knowledge_graph.search_vertices, args);
    },
    upsertVertex: async (args) => {
      return await convexClient.action(api.knowledge_graph.upsert_vertex_action, args);
    },
    upsertEdge: async (args) => {
      return await convexClient.action(api.knowledge_graph.upsert_edge_action, args);
    },
    getEdgesByVertex: async (args) => {
      return await convexClient.query(api.knowledge_graph.get_edges_by_vertex, args);
    },
    getVerticesByIds: async (args) => {
      return await convexClient.query(api.knowledge_graph.get_vertices_by_ids, args);
    },
  };
}

async function saveAssistantMessage(
  chatId: Id<"group_chat">,
  userId: Id<"users">,
  content: string,
) {
  if (!convexClient) return;

  try {
    await convexClient.mutation(api.chat.send_message, {
      group_chat_id: chatId,
      sender_id: userId,
      content,
      role: "assistant",
    });
  } catch (error) {
    console.error("Error saving assistant message:", error);
  }
}

async function generateConversationName(
  chatId: Id<"group_chat">,
  userMessage: string,
) {
  if (!convexClient) return;

  try {
    const result = await Effect.runPromise(
      LanguageModel.generateText({
        prompt: Prompt.make([
          {
            role: "system",
            content:
              "Generate a short, concise title (3-5 words max) for a conversation that starts with this message. Return ONLY the title, no quotes or punctuation.",
          },
          {
            role: "user",
            content: [{ type: "text", text: userMessage }],
          },
        ]),
      }).pipe(
        Effect.provide(Gpt4oMini.pipe(Layer.provide(DedalusClientLive))),
      ),
    );

    const name = result.text.trim().slice(0, 50);
    if (name) {
      await convexClient.mutation(api.chat.update_conversation_name, {
        group_chat_id: chatId,
        name,
      });
    }
  } catch (error) {
    console.error("Error generating conversation name:", error);
  }
}

export async function handleChatStream(request: Request): Promise<Response> {
  const body = await request.json();
  const userId = body.user_id as Id<"users"> | undefined;
  const chatId = body.chat_id as Id<"group_chat"> | undefined;

  // Fetch ALL messages from Convex (frontend already saved the new user message)
  let allMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (chatId && convexClient) {
    try {
      const storedMessages = await convexClient.query(api.chat.get_messages, {
        group_chat_id: chatId,
      });
      allMessages = storedMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
    } catch (error) {
      console.error("Error fetching messages from Convex:", error);
    }
  }

  const lastMessage = allMessages[allMessages.length - 1];
  const input = lastMessage?.content || "";
  const isNewConversation = allMessages.length === 1;

  // Generate conversation name for new conversations (fire and forget)
  if (isNewConversation && chatId && input) {
    generateConversationName(chatId, input);
  }

  // Create knowledge graph tools if user is authenticated
  const knowledgeTools =
    userId && convexClient
      ? createKnowledgeGraphTools(userId, createKnowledgeGraphDeps(userId))
      : null;

  // Query knowledge graph for user context
  let knowledgeContext = "";
  if (knowledgeTools) {
    try {
      const graphResult = await knowledgeTools.query_knowledge_graph(input);
      if (graphResult.vertices.length > 0) {
        const vertexInfo = graphResult.vertices
          .map((v) => `${v.content} (confidence: ${v.weight})`)
          .join("\n");
        const edgeInfo = graphResult.edges
          .map((e) => `${e.from} --[${e.relationship}]--> ${e.to}`)
          .join("\n");
        knowledgeContext = `\n\n<user_knowledge>\nKnown about user:\n${vertexInfo}\n\nRelationships:\n${edgeInfo}\n</user_knowledge>`;
      }
    } catch (error) {
      console.error("Error querying knowledge graph:", error);
    }
  }

  // Prepend knowledge context to first message if available
  if (isNewConversation && allMessages.length > 0 && knowledgeContext) {
    allMessages[0] = {
      ...allMessages[0],
      content: `${knowledgeContext}\n\nUser question: ${allMessages[0].content}`,
    };
  }

  // Handle direct responses (e.g., clarifying questions)
  if (input.startsWith("__DIRECT_RESPONSE__")) {
    const directResponse = input.replace("__DIRECT_RESPONSE__", "");
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "text", content: directResponse })}\n\n`,
          ),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();

        if (chatId && userId) {
          await saveAssistantMessage(chatId, userId, directResponse);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Build the prompt from conversation history
  const prompt = Prompt.make([
    { role: "system", content: ARTICLE_CHAT_PROMPT },
    ...allMessages.map((m) => ({
      role: m.role,
      content: [{ type: "text" as const, text: m.content }],
    })),
  ]);

  const mcpServers = [
    McpRegistry.marketplace("joerup/exa-mcp"),
    McpRegistry.marketplace("windsor/brave-search-mcp"),
  ];

  // Build toolkit layer with dependencies (requires authenticated user)
  const chatToolkitLive =
    userId && convexClient
      ? createChatToolkitLayer({
          userId,
          convexClient,
          createEmbedding,
          knowledgeGraphDeps: createKnowledgeGraphDeps(userId),
        })
      : null;

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "status", status: "thinking" })}\n\n`,
        ),
      );

      let fullText = "";
      let hasStartedGenerating = false;

      const toolStatusMap: Record<string, string> = {
        FetchArticleContent: "searching",
        GetSavedArticles: "searching",
        GetFeedArticles: "searching",
        UpdateKnowledge: "thinking",
      };

      const handlePart = (part: {
        type: string;
        delta?: string;
        name?: string;
      }) =>
        Effect.sync(() => {
          if (part.type === "tool-call" && part.name) {
            const status = toolStatusMap[part.name] ?? "searching";
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "status", status })}\n\n`,
              ),
            );
          } else if (part.type === "text-delta" && part.delta) {
            if (!hasStartedGenerating) {
              hasStartedGenerating = true;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "status", status: "generating" })}\n\n`,
                ),
              );
            }
            fullText += part.delta;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", content: part.delta })}\n\n`,
              ),
            );
          }
        });

      try {
        // Build the stream program — conditionally include local toolkit
        const program = chatToolkitLive
          ? LanguageModel.streamText({
              prompt,
              toolkit: ChatToolkit,
              mcpServers,
            }).pipe(
              Stream.tap(handlePart),
              Stream.runDrain,
              Effect.provide(chatToolkitLive),
            )
          : LanguageModel.streamText({ prompt, mcpServers }).pipe(
              Stream.tap(handlePart),
              Stream.runDrain,
            );

        await Effect.runPromise(
          program.pipe(
            Effect.provide(
              AgentRunner.ReAct.pipe(
                Layer.provide(Layer.succeed(AgentRunner.Config, { maxTurns: 10 })),
                Layer.provide(Gpt5.pipe(Layer.provide(DedalusClientLive))),
              ),
            ),
          ),
        );

        // Save complete response to database
        if (chatId && userId && fullText) {
          await saveAssistantMessage(chatId, userId, fullText);
        }
      } catch (error) {
        console.error("Chat error:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "text", content: `Error: ${errorMessage}` })}\n\n`,
          ),
        );
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  return handleChatStream(request);
}

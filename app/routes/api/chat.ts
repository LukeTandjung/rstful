import type { ActionFunctionArgs } from "react-router";
import Dedalus, { DedalusRunner } from "dedalus-labs";
import { Layer, Effect, pipe } from "effect";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import {
  AgentRunner,
  DedalusRunnerService,
  DeepSearchOrchestrator,
  AgentRunnerLive,
  DeepSearchOrchestratorLive,
  JudgeAgentLive,
  ParserAgentLive,
  OrchestratorAgentLive,
  type DeepSearchConfig,
  type ChemistryCriteria,
} from "services/agents";

const client = new Dedalus();
const dedalusRunner = new DedalusRunner(client);

const DedalusRunnerServiceLive = Layer.succeed(DedalusRunnerService, {
  runner: dedalusRunner,
});
const AgentLayer = Layer.provide(AgentRunnerLive, DedalusRunnerServiceLive);
const ParserLayer = Layer.provide(ParserAgentLive, AgentLayer);
const OrchestratorLayer = Layer.provide(OrchestratorAgentLive, AgentLayer);
const JudgeLayer = Layer.provide(JudgeAgentLive, AgentLayer);
const DeepSearchLayer = Layer.provide(
  DeepSearchOrchestratorLive,
  pipe(ParserLayer, Layer.provideMerge(OrchestratorLayer), Layer.provideMerge(JudgeLayer)),
);
const MainLayer = pipe(
  AgentLayer,
  Layer.provideMerge(ParserLayer),
  Layer.provideMerge(OrchestratorLayer),
  Layer.provideMerge(JudgeLayer),
  Layer.provideMerge(DeepSearchLayer),
);

const convexUrl = process.env.VITE_CONVEX_URL;
const convexClient = convexUrl ? new ConvexHttpClient(convexUrl) : null;

async function fetchSavedArticles(userId: Id<"users">): Promise<string> {
  if (!convexClient) {
    return "";
  }

  try {
    const savedContent = await convexClient.query(
      api.saved_content.get_saved_content,
      {
        user_id: userId,
      },
    );

    if (!savedContent || savedContent.length === 0) {
      return "";
    }

    return savedContent
      .map(
        (article) =>
          `Title: ${article.title}\nContent: ${article.content}\nLink: ${article.link}`,
      )
      .join("\n\n---\n\n");
  } catch (error) {
    console.error("Error fetching saved articles:", error);
    return "";
  }
}

async function fetchChemistryEmbedding(userId: Id<"users">) {
  if (!convexClient) {
    return null;
  }

  try {
    const embedding = await convexClient.query(
      api.chemistry_embedding.get_chemistry_embedding,
      { user_id: userId },
    );
    return embedding;
  } catch (error) {
    console.error("Error fetching chemistry embedding:", error);
    return null;
  }
}

async function saveChemistryEmbedding(userId: Id<"users">, criteria: unknown) {
  if (!convexClient) {
    return;
  }

  try {
    await convexClient.mutation(
      api.chemistry_embedding.upsert_chemistry_embedding,
      { user_id: userId, criteria: criteria as never },
    );
    console.log("Chemistry embedding saved for user:", userId);
  } catch (error) {
    console.error("Error saving chemistry embedding:", error);
  }
}

async function saveAssistantMessage(chatId: Id<"group_chat">, userId: Id<"users">, content: string) {
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

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.json();
  const messages = body.messages || [];
  const userId = body.user_id as Id<"users"> | undefined;
  const chatId = body.chat_id as Id<"group_chat"> | undefined;
  const mode = body.mode as "regular" | "deep_search" | undefined;

  const agentRunner = Effect.runSync(Effect.provide(AgentRunner, MainLayer));
  const deepSearchOrchestrator = Effect.runSync(
    Effect.provide(DeepSearchOrchestrator, MainLayer),
  );

  const lastMessage = messages[messages.length - 1];
  const input = lastMessage?.content || "";

  let context = "";
  let mcpServers: Array<string> = [];
  let finalInput = input;

  if (mode === "deep_search") {
    const config: DeepSearchConfig = {
      scoreThreshold: 80,
      maxSearchLoops: 2,
      usersPerSearch: 3,
    };

    // Fetch existing chemistry embedding for the user
    // Type assertion needed: Convex schema uses v.string() while Effect schema uses literals
    const existingChemistry = userId ? await fetchChemistryEmbedding(userId) : null;
    const cachedCriteria = existingChemistry ? {
      userId: existingChemistry.user_id,
      criteria: existingChemistry.criteria as ChemistryCriteria,
      createdAt: Number(existingChemistry.created_at),
      updatedAt: Number(existingChemistry.updated_at),
    } : undefined;

    // Build conversation history (exclude the latest message)
    const conversationHistory = messages
      .slice(0, -1)
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: typeof m.content === "string" ? m.content : "",
      }));

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const emit = (event: { type: string; content?: string; status?: string }) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        const emitStatus = (status: string) => {
          emit({ type: "status", status });
        };

        const emitText = (content: string) => {
          emit({ type: "text", content });
        };

        const streamText = async (text: string, delayMs = 15) => {
          const words = text.split(/(\s+)/);
          for (const word of words) {
            emitText(word);
            if (word.trim()) {
              await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
          }
        };

        try {
          // Start with "thinking" status while parsing
          emitStatus("thinking");

          const searchResult = await Effect.runPromise(
            deepSearchOrchestrator.execute(
              input,
              config,
              conversationHistory,
              async (acknowledgment) => {
                // Switch to "searching" status when orchestrator starts
                emitStatus("searching");
                await streamText(acknowledgment);
                // Save acknowledgment as assistant message so it persists if user leaves
                if (chatId && userId) {
                  await saveAssistantMessage(chatId, userId, acknowledgment);
                }
              },
              cachedCriteria,
            ),
          );

          console.log("DeepSearch result:", searchResult.status);

          let responseText: string;

          if (searchResult.status === "needs_clarification") {
            responseText = searchResult.questions
              .map((q, i) => `${i + 1}. ${q}`)
              .join("\n\n");
          } else if (searchResult.status === "impossible_criteria") {
            responseText = searchResult.suggestion;
          } else {
            // Save the chemistry embedding on success or exhausted
            if (userId && "chemistryCriteria" in searchResult && searchResult.chemistryCriteria) {
              await saveChemistryEmbedding(userId, searchResult.chemistryCriteria);
            }

            const qualifiedUsers = searchResult.qualifiedUsers;
            if (qualifiedUsers.length === 0) {
              responseText = `I couldn't find any creators matching your criteria after searching ${searchResult.totalSearched} profiles. Try broadening your search or describing different characteristics.`;
            } else {
              const formattedResults = [...qualifiedUsers]
                .sort((a, b) => b.score.score - a.score.score)
                .map((item, i: number) => {
                  const bio = item.user.bio ? `\n   Bio: ${item.user.bio}` : "";
                  const score = `\n   Match: ${item.score.score}% (${item.score.confidence} confidence)`;
                  const justification = `\n   Why: ${item.score.justification}`;
                  return `${i + 1}. ${item.user.name}${bio}${score}${justification}\n   ${item.user.profileUrl}`;
                })
                .join("\n\n");
              responseText = `Found ${qualifiedUsers.length} creators matching your worldview (searched ${searchResult.totalSearched} profiles):\n\n${formattedResults}`;
            }
          }

          await streamText(responseText);
          // Save final result as assistant message
          if (chatId && userId) {
            await saveAssistantMessage(chatId, userId, responseText);
          }
        } catch (error) {
          console.error("DeepSearch error:", error);
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorText = `Something went wrong: ${errorMessage}`;
          await streamText(errorText);
          if (chatId && userId) {
            await saveAssistantMessage(chatId, userId, errorText);
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } else {
    // Regular mode - use saved articles context + search MCPs for full article content
    context = userId ? await fetchSavedArticles(userId) : "";
    mcpServers = ["joerup/exa-mcp", "simon-liang/brave-search-mcp"];
    finalInput = context
      ? `You have access to the user's saved articles. Use them to answer questions, and use search tools to fetch full article content when needed.\n\n<saved_articles>\n${context}\n</saved_articles>\n\nUser question: ${input}`
      : input;
  }

  // Handle direct responses (e.g., clarifying questions, X search results)
  if (finalInput.startsWith("__DIRECT_RESPONSE__")) {
    const directResponse = finalInput.replace("__DIRECT_RESPONSE__", "");
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        // Simulate a chat completion response format
        const chunk = {
          choices: [{ delta: { content: directResponse } }],
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();

        // Save direct response as assistant message
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

  const stream = agentRunner.runStream({
    input: finalInput,
    model: "anthropic/claude-sonnet-4-5-20250929",
    ...(mcpServers.length > 0 && { mcpServers }),
    maxSteps: 10,
    systemPrompt:
      "You are a helpful assistant. Use the available search tools when you need to find information online or fetch full article content.",
  });

  const encoder = new TextEncoder();
  let accumulatedContent = "";

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        // Emit initial status
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "status", status: "generating" })}\n\n`));

        for await (const chunk of stream) {
          const data = JSON.stringify(chunk);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));

          // Accumulate text content from the chunk
          const chunkData = chunk as { type?: string; content?: string };
          if (chunkData.type === "text" && chunkData.content) {
            accumulatedContent += chunkData.content;
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();

        // Save accumulated assistant message to database
        if (chatId && userId && accumulatedContent) {
          await saveAssistantMessage(chatId, userId, accumulatedContent);
        }
      } catch (error) {
        console.error("Stream error:", error);
        controller.error(error);
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

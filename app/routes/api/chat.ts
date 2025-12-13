import type { ActionFunctionArgs } from "react-router";
import Dedalus, { DedalusRunner } from "dedalus-labs";
import { Layer, Effect, pipe } from "effect";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import {
  AgentRunner,
  DedalusRunnerService,
  ParserAgent,
  OrchestratorAgent,
  AgentRunnerLive,
  ParserAgentLive,
  OrchestratorAgentLive,
} from "services/agents";

const client = new Dedalus();
const dedalusRunner = new DedalusRunner(client);

const DedalusRunnerServiceLive = Layer.succeed(DedalusRunnerService, { runner: dedalusRunner });
const AgentLayer = Layer.provide(AgentRunnerLive, DedalusRunnerServiceLive);
const ParserLayer = Layer.provide(ParserAgentLive, AgentLayer);
const OrchestratorLayer = Layer.provide(OrchestratorAgentLive, AgentLayer);
const MainLayer = pipe(
  AgentLayer,
  Layer.provideMerge(ParserLayer),
  Layer.provideMerge(OrchestratorLayer)
);

const convexUrl = process.env.VITE_CONVEX_URL;
const convexClient = convexUrl ? new ConvexHttpClient(convexUrl) : null;

async function fetchSavedArticles(userId: Id<"users">): Promise<string> {
  if (!convexClient) {
    return "";
  }

  try {
    const savedContent = await convexClient.query(api.saved_content.get_saved_content, {
      user_id: userId,
    });

    if (!savedContent || savedContent.length === 0) {
      return "";
    }

    return savedContent
      .map((article) => `Title: ${article.title}\nContent: ${article.content}\nLink: ${article.link}`)
      .join("\n\n---\n\n");
  } catch (error) {
    console.error("Error fetching saved articles:", error);
    return "";
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.json();
  const messages = body.messages || [];
  const userId = body.user_id as Id<"users"> | undefined;
  const mode = body.mode as "regular" | "deep_search" | undefined;

  const agentRunner = Effect.runSync(Effect.provide(AgentRunner, MainLayer));
  const parserAgent = Effect.runSync(Effect.provide(ParserAgent, MainLayer));
  const orchestratorAgent = Effect.runSync(Effect.provide(OrchestratorAgent, MainLayer));

  const lastMessage = messages[messages.length - 1];
  const input = lastMessage?.content || "";

  // Build conversation history for parser (exclude the latest message)
  const conversationHistory = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant",
    content: typeof m.content === "string" ? m.content : "",
  }));

  let context = "";
  let mcpServers: Array<string> = [];
  let finalInput = input;

  if (mode === "deep_search") {
    // X Search mode - always use ParserAgent flow
    const parserResult = await Effect.runPromise(
      pipe(
        parserAgent.parse(input, conversationHistory),
        Effect.catchAll(() =>
          Effect.succeed({
            status: "needs_clarification" as const,
            questions: ["What type of people are you looking for on X?"]
          })
        )
      )
    );

    if (parserResult.status === "needs_clarification") {
      // Return clarifying questions to the user
      const questionsText = parserResult.questions
        .map((q, i) => `${i + 1}. ${q}`)
        .join("\n\n");
      finalInput = `__DIRECT_RESPONSE__${questionsText}`;
      mcpServers = [];
    } else {
      // We have complete criteria, use OrchestratorAgent to search
      console.log("Parser complete, searching for:", parserResult.compatibility_string, "on", parserResult.platform);

      const searchResult = await Effect.runPromise(
        pipe(
          orchestratorAgent.searchCreators(parserResult.compatibility_string, parserResult.platform, 10),
          Effect.tap((creators) => Effect.sync(() => console.log("Orchestrator returned:", creators.length, "creators"))),
          Effect.catchAll((error) => {
            console.error("Orchestrator error:", error);
            return Effect.succeed([]);
          })
        )
      );

      console.log("Search result length:", searchResult.length);

      const platformNames: Record<string, string> = {
        x: "X/Twitter",
        substack: "Substack",
        blog: "blog",
        youtube: "YouTube",
      };
      const platformName = platformNames[parserResult.platform] || parserResult.platform;

      if (searchResult.length === 0) {
        finalInput = `__DIRECT_RESPONSE__I couldn't find any ${platformName} creators matching your criteria. Try broadening your search or describing different characteristics.`;
      } else {
        const formattedResults = searchResult
          .map((creator, i) => {
            const bio = creator.bio ? `\n   Bio: ${creator.bio}` : "";
            return `${i + 1}. ${creator.name}${bio}\n   ${creator.profileUrl}`;
          })
          .join("\n\n");
        finalInput = `__DIRECT_RESPONSE__Here are ${platformName} creators matching your criteria:\n\n${formattedResults}`;
      }
      mcpServers = [];
    }
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
      start(controller) {
        // Simulate a chat completion response format
        const chunk = {
          choices: [{ delta: { content: directResponse } }],
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
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

  const stream = agentRunner.runStream({
    input: finalInput,
    model: "anthropic/claude-sonnet-4-5-20250929",
    ...(mcpServers.length > 0 && { mcpServers }),
    maxSteps: 10,
    systemPrompt: "You are a helpful assistant. Use the available search tools when you need to find information online or fetch full article content.",
  });

  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const data = JSON.stringify(chunk);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
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

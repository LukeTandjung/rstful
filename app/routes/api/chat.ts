import type { ActionFunctionArgs } from "react-router";
import Dedalus, { DedalusRunner } from "dedalus-labs";
import { Layer, Effect, pipe } from "effect";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import {
  AgentRunner,
  DedalusRunnerService,
  RouterAgent,
  ParserAgent,
  AgentRunnerLive,
  RouterAgentLive,
  ParserAgentLive,
} from "services/agents";

const client = new Dedalus();
const dedalusRunner = new DedalusRunner(client);

const DedalusRunnerServiceLive = Layer.succeed(DedalusRunnerService, { runner: dedalusRunner });
const AgentLayer = Layer.provide(AgentRunnerLive, DedalusRunnerServiceLive);
const RouterLayer = Layer.provide(RouterAgentLive, AgentLayer);
const ParserLayer = Layer.provide(ParserAgentLive, AgentLayer);
const MainLayer = pipe(
  AgentLayer,
  Layer.provideMerge(RouterLayer),
  Layer.provideMerge(ParserLayer)
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
  const mode = body.mode as "regular" | "x_search" | undefined;

  const agentRunner = Effect.runSync(Effect.provide(AgentRunner, MainLayer));
  const routerAgent = Effect.runSync(Effect.provide(RouterAgent, MainLayer));
  const parserAgent = Effect.runSync(Effect.provide(ParserAgent, MainLayer));

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

  console.log("Chat mode:", mode);

  if (mode === "x_search") {
    // X Search mode - always use ParserAgent flow
    const parserResult = await Effect.runPromise(
      pipe(
        parserAgent.parse(input, conversationHistory),
        Effect.tap((result) => Effect.sync(() => console.log("Parser result:", result))),
        Effect.catchAll((error) => {
          console.error("Parser error:", error);
          return Effect.succeed({
            status: "needs_clarification" as const,
            questions: ["What type of people are you looking for on X?"]
          });
        })
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
      // We have complete criteria, proceed with X search
      mcpServers = ["luketandjung/grok-search-mcp"];
      finalInput = `Search for X/Twitter users matching: "${parserResult.compatibility_string}". Find users who match these criteria and provide their handles with brief descriptions of why they match.`;
    }
  } else if (userId) {
    // Regular mode - use router to decide between simple_query and web_search
    const routeResult = await Effect.runPromise(
      pipe(
        routerAgent.route(input),
        Effect.tap((result) => Effect.sync(() => console.log("Router result:", result))),
        Effect.catchAll((error) => {
          console.error("Router error:", error);
          return Effect.succeed({ intent: "web_search" as const, confidence: 0 });
        })
      )
    );

    console.log("Classified intent:", routeResult.intent);

    if (routeResult.intent === "simple_query") {
      context = await fetchSavedArticles(userId);
      mcpServers = [];
      finalInput = context
        ? `You have access to the user's saved articles. Use them to answer questions about saved content.\n\n<saved_articles>\n${context}\n</saved_articles>\n\nUser question: ${input}`
        : input;
    } else {
      // web_search or deep_x_search (in regular mode, treat deep_x_search as web_search)
      mcpServers = ["joerup/exa-mcp", "simon-liang/brave-search-mcp"];
    }
  } else {
    mcpServers = ["joerup/exa-mcp", "simon-liang/brave-search-mcp"];
  }

  console.log("Using MCP servers:", mcpServers);
  console.log("Final input:", finalInput.substring(0, 100) + "...");

  // Handle direct responses (e.g., clarifying questions)
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

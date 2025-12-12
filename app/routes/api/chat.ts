import type { ActionFunctionArgs } from "react-router";
import Dedalus, { DedalusRunner } from "dedalus-labs";
import { Layer, Effect } from "effect";
import {
  AgentRunner,
  DedalusRunnerService,
  AgentRunnerLive,
} from "services/agents";

const client = new Dedalus();
const dedalusRunner = new DedalusRunner(client);

const DedalusRunnerServiceLive = Layer.succeed(DedalusRunnerService, { runner: dedalusRunner });
const MainLayer = Layer.provide(AgentRunnerLive, DedalusRunnerServiceLive);

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.json();
  const messages = body.messages || [];

  const agentRunner = Effect.runSync(Effect.provide(AgentRunner, MainLayer));

  const lastMessage = messages[messages.length - 1];
  const input = lastMessage?.content || "";

  const stream = agentRunner.runStream({
    input,
    model: "anthropic/claude-sonnet-4-5-20250929",
    mcpServers: ["joerup/exa-mcp", "simon-liang/brave-search-mcp"],
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

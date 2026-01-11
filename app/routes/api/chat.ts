import type { ActionFunctionArgs } from "react-router";
import Dedalus, { DedalusRunner } from "dedalus-labs";
import { Layer, Effect, pipe, Schema, JSONSchema } from "effect";
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
  type ExtractedFact,
  type KnowledgeGraphSubgraph,
  fetchArticleContent,
  createKnowledgeGraphTools,
  type KnowledgeGraphToolDependencies,
  ArticleChatResponse,
  ARTICLE_CHAT_PROMPT,
  wrapJsonSchema,
} from "services/agents";
import {
  EmbeddingService,
  EmbeddingServiceLive,
  DedalusClientServiceLive,
} from "services/embeddings";

const client = new Dedalus();
const dedalusRunner = new DedalusRunner(client);

// Agent layers
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

// Embedding layer
const EmbeddingLayer = Layer.provide(EmbeddingServiceLive, DedalusClientServiceLive);

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

async function fetchCachedArticles(userId: Id<"users">): Promise<string> {
  if (!convexClient) {
    return "";
  }

  try {
    // Fetch recent cached articles (limited to avoid too much context)
    const cachedContent = await convexClient.query(
      api.cached_content.get_cached_articles_paginated,
      {
        user_id: userId,
        paginationOpts: { numItems: 50, cursor: null },
      },
    );

    if (!cachedContent.page || cachedContent.page.length === 0) {
      return "";
    }

    return cachedContent.page
      .map(
        (article) =>
          `Title: ${article.title}\nDescription: ${article.description ?? ""}\nLink: ${article.link}`,
      )
      .join("\n\n---\n\n");
  } catch (error) {
    console.error("Error fetching cached articles:", error);
    return "";
  }
}

// Convert knowledge graph subgraph to ExtractedFact array for deep search
function extractFactsFromKnowledge(
  subgraph: KnowledgeGraphSubgraph,
): Array<ExtractedFact> {
  if (subgraph.edges.length === 0) {
    return [];
  }

  // Convert edges to structured facts (edges have the relationship info)
  return subgraph.edges.map((e) => ({
    subject: e.from,
    predicate: e.relationship,
    object: e.to,
    category: "general",
    confidence: 0.8, // Default confidence for cached facts
  }));
}

/**
 * Convert structured ExtractedFacts to knowledge graph format.
 * Facts now have subject/predicate/object fields directly from LLM output.
 */
function factsToKnowledgeUpdate(facts: ReadonlyArray<ExtractedFact>): {
  entities: Array<{
    content: string;
    meta_data: { weight: number; last_updated: number; entity_type?: string };
  }>;
  relationships: Array<{
    tail_vertex: string;
    head_vertex: string;
    content: string;
    meta_data: { weight: number; last_updated: number; relationship_type?: string };
  }>;
} {
  const now = Date.now();
  const entities: Array<{
    content: string;
    meta_data: { weight: number; last_updated: number; entity_type?: string };
  }> = [];
  const relationships: Array<{
    tail_vertex: string;
    head_vertex: string;
    content: string;
    meta_data: { weight: number; last_updated: number; relationship_type?: string };
  }> = [];

  // Track unique entities to avoid duplicates
  const seenEntities = new Set<string>();

  for (const fact of facts) {
    // Add subject entity if not seen
    if (!seenEntities.has(fact.subject)) {
      seenEntities.add(fact.subject);
      const subjectMeta: { weight: number; last_updated: number; entity_type?: string } = {
        weight: 1.0,
        last_updated: now,
      };
      if (fact.subject === "user") {
        subjectMeta.entity_type = "person";
      }
      entities.push({
        content: fact.subject,
        meta_data: subjectMeta,
      });
    }

    // Add object entity if not seen
    if (!seenEntities.has(fact.object)) {
      seenEntities.add(fact.object);
      entities.push({
        content: fact.object,
        meta_data: { weight: fact.confidence, last_updated: now, entity_type: fact.category },
      });
    }

    // Add relationship
    relationships.push({
      tail_vertex: fact.subject,
      head_vertex: fact.object,
      content: fact.predicate,
      meta_data: { weight: fact.confidence, last_updated: now, relationship_type: fact.category },
    });
  }

  return { entities, relationships };
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

async function generateConversationName(chatId: Id<"group_chat">, userMessage: string) {
  if (!convexClient) return;

  try {
    const agentRunner = Effect.runSync(Effect.provide(AgentRunner, MainLayer));

    const result = await Effect.runPromise(
      agentRunner.run({
        input: userMessage,
        model: "openai/gpt-4o-mini",
        systemPrompt: "Generate a short, concise title (3-5 words max) for a conversation that starts with this message. Return ONLY the title, no quotes or punctuation.",
      })
    );

    const name = result.finalOutput.trim().slice(0, 50);
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

async function createEmbedding(text: string): Promise<Array<number>> {
  const result = await Effect.runPromise(
    EmbeddingService.pipe(
      Effect.flatMap((svc) => svc.createEmbedding(text)),
      Effect.provide(EmbeddingLayer),
    ),
  );
  return result.embedding;
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

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.json();
  const userId = body.user_id as Id<"users"> | undefined;
  const chatId = body.chat_id as Id<"group_chat"> | undefined;
  const mode = body.mode as "regular" | "deep_search" | undefined;

  const agentRunner = Effect.runSync(Effect.provide(AgentRunner, MainLayer));
  const deepSearchOrchestrator = Effect.runSync(
    Effect.provide(DeepSearchOrchestrator, MainLayer),
  );

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

  // The last message is the new user input (frontend saved it before calling API)
  const lastMessage = allMessages[allMessages.length - 1];
  const input = lastMessage?.content || "";
  const isNewConversation = allMessages.length === 1;

  // Debug logging
  console.log("=== Chat API Request ===");
  console.log("Fetched messages from Convex:", allMessages.length);
  console.log("Last message (user input):", input.substring(0, 100));
  console.log("Is new conversation:", isNewConversation);

  // Generate conversation name for new conversations (fire and forget)
  if (isNewConversation && chatId && input) {
    generateConversationName(chatId, input);
  }

  let mcpServers: Array<string> = [];

  if (mode === "deep_search") {
    const config: DeepSearchConfig = {
      scoreThreshold: 80,
      maxSearchLoops: 2,
      usersPerSearch: 3,
    };

    // Create knowledge graph tools for user context
    const knowledgeTools = userId && convexClient
      ? createKnowledgeGraphTools(userId, createKnowledgeGraphDeps(userId))
      : null;

    // Query knowledge graph for existing user facts
    let cachedFacts: Array<ExtractedFact> | undefined;
    if (knowledgeTools) {
      try {
        const subgraph = await knowledgeTools.query_knowledge_graph(
          "reasoning style values preferences thinking patterns interests",
        );
        const facts = extractFactsFromKnowledge(subgraph);
        if (facts.length > 0) {
          cachedFacts = facts;
          console.log(`Found ${facts.length} cached user facts from knowledge graph`);
        }
      } catch (error) {
        console.error("Error querying knowledge graph for facts:", error);
      }
    }

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

        const streamText = (text: string) => {
          emitText(text);
        };

        try {
          // Start with "thinking" status while parsing
          emitStatus("thinking");

          // For deep search, pass all messages except the last one (current input) as history
          const conversationHistory = allMessages.slice(0, -1);

          const searchResult = await Effect.runPromise(
            deepSearchOrchestrator.execute(
              input,
              config,
              conversationHistory,
              async (acknowledgment) => {
                // Switch to "searching" status when orchestrator starts
                emitStatus("searching");
                streamText(acknowledgment);
                // Save acknowledgment as assistant message so it persists if user leaves
                if (chatId && userId) {
                  await saveAssistantMessage(chatId, userId, acknowledgment);
                }
              },
              cachedFacts,
            ),
          );

          console.log("DeepSearch result:", searchResult.status);

          let responseText: string;

          if (searchResult.status === "needs_clarification") {
            const questionsFormatted = searchResult.questions
              .map((q, i) => `${i + 1}. ${q}`)
              .join("\n\n");
            responseText = `To find creators who think like you, I need to understand your perspective better. Please answer these questions:\n\n${questionsFormatted}\n\n(Just reply with your answers and I'll start the search!)`;
          } else if (searchResult.status === "impossible_criteria") {
            responseText = searchResult.suggestion;
          } else {
            // Save user facts to knowledge graph with proper entity resolution
            if (knowledgeTools && searchResult.userFacts.length > 0) {
              const knowledgeUpdate = factsToKnowledgeUpdate(searchResult.userFacts);
              knowledgeTools
                .update_knowledge_graph(knowledgeUpdate)
                .then(() => console.log(`Saved ${searchResult.userFacts.length} user facts to knowledge graph`))
                .catch((err) => console.error("Failed to save user facts:", err));
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

          // Switch to generating status before streaming final results
          emitStatus("generating");
          streamText(responseText);
          // Save final result as assistant message
          if (chatId && userId) {
            await saveAssistantMessage(chatId, userId, responseText);
          }
        } catch (error) {
          console.error("DeepSearch error:", error);
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorText = `Something went wrong: ${errorMessage}`;
          streamText(errorText);
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
    // Regular mode - use search MCPs + knowledge graph
    mcpServers = [
      'joerup/exa-mcp',
      'windsor/brave-search-mcp',
    ];

    // Create knowledge graph tools if user is authenticated
    const knowledgeTools = userId && convexClient
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
  }

  // Handle direct responses (e.g., clarifying questions, X search results)
  if (input.startsWith("__DIRECT_RESPONSE__")) {
    const directResponse = input.replace("__DIRECT_RESPONSE__", "");
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

  // Create knowledge graph tools for response processing
  const knowledgeTools = userId && convexClient
    ? createKnowledgeGraphTools(userId, createKnowledgeGraphDeps(userId))
    : null;

  // Article access tools - wrap to bind userId
  /** Fetches all articles the user has saved/starred. Returns formatted article list with titles, content, and links. */
  async function getSavedArticles(): Promise<string> {
    if (!userId) return "No user authenticated";
    return fetchSavedArticles(userId);
  }

  /** Fetches recent articles from the user's RSS feed subscriptions. Returns formatted article list with titles, descriptions, and links. */
  async function getFeedArticles(): Promise<string> {
    if (!userId) return "No user authenticated";
    return fetchCachedArticles(userId);
  }

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "status", status: "generating" })}\n\n`));

      try {
        // Debug logging for agent call
        console.log("=== Agent Call ===");
        console.log("Messages count:", allMessages.length);
        console.log("First message:", allMessages[0]?.content?.substring(0, 200) + "...");
        console.log("Last message:", allMessages[allMessages.length - 1]?.content?.substring(0, 100));

        // Use structured output with ArticleChatResponse schema
        const result = await Effect.runPromise(
          agentRunner.run({
            messages: allMessages,
            model: "openai/gpt-5.1",
            tools: [fetchArticleContent, getSavedArticles, getFeedArticles],
            ...(mcpServers.length > 0 && { mcpServers }),
            maxSteps: 10,
            systemPrompt: ARTICLE_CHAT_PROMPT,
            responseFormat: wrapJsonSchema(
              JSONSchema.make(ArticleChatResponse),
              "article_chat_response",
            ),
          }),
        );

        // Parse the structured output
        const parsed = Schema.decodeUnknownSync(ArticleChatResponse)(
          JSON.parse(result.finalOutput),
        );

        // Send the response text to the client
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "text", content: parsed.response })}\n\n`),
        );

        // Save to database
        if (chatId && userId && parsed.response) {
          await saveAssistantMessage(chatId, userId, parsed.response);
        }

        // Process knowledge updates in the background (non-blocking)
        if (knowledgeTools && parsed.knowledge_update) {
          const { entities, relationships } = parsed.knowledge_update;
          if (entities.length > 0 || relationships.length > 0) {
            knowledgeTools
              .update_knowledge_graph({ entities, relationships })
              .catch((err) => console.error("Knowledge update failed:", err));
          }
        }
      } catch (error) {
        console.error("Chat error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "text", content: `Error: ${errorMessage}` })}\n\n`),
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

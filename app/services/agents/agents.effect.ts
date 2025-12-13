import { Effect, Layer, pipe } from "effect";
import type { RunResult } from "dedalus-labs/lib/runner/runner";
import type { Tool } from "dedalus-labs/lib/runner/types/tools";
import type {
  AgentRunOptions,
  ChemistryCriteria,
  ParserResult,
  JudgeResult,
  ContentCreator,
  Platform,
  FootprintResult,
  Creator,
  DeepSearchConfig,
  DeepSearchResult,
  StoredChemistryCriteria,
} from "./agents.types";
import {
  DedalusRunnerService,
  AgentRunner,
  RouterAgent,
  QueryAgent,
  ParserAgent,
  OrchestratorAgent,
  JudgeAgent,
  DeepXSearchOrchestrator,
} from "./agents.service";
import {
  AgentRunnerError,
  RouterAgentError,
  QueryAgentError,
  ParserAgentError,
  OrchestratorAgentError,
  JudgeAgentError,
  DeepSearchError,
} from "./agents.errors";
import {
  ROUTER_PROMPT,
  PARSER_PROMPT,
  ORCHESTRATOR_SEARCH_PROMPT,
  ORCHESTRATOR_FOOTPRINT_PROMPT,
  JUDGE_PROMPT,
} from "./prompts";

export const AgentRunnerLive = Layer.effect(
  AgentRunner,
  DedalusRunnerService.pipe(
    Effect.map(({ runner }) => ({
      run: (options: AgentRunOptions) =>
        Effect.tryPromise<RunResult, AgentRunnerError>({
          try: async () => {
            const result = await runner.run({
              input: options.input,
              model: options.model,
              ...(options.mcpServers && { mcpServers: options.mcpServers }),
              ...(options.tools && { tools: options.tools }),
              ...(options.maxSteps && { maxSteps: options.maxSteps }),
              ...(options.systemPrompt && {
                instructions: options.systemPrompt,
              }),
            });
            if (Symbol.asyncIterator in result) {
              throw new Error("Streaming not supported in this context");
            }
            return result;
          },
          catch: (error) =>
            new AgentRunnerError({
              message: error instanceof Error ? error.message : String(error),
            }),
        }),

      runStream: (options: AgentRunOptions): AsyncIterable<unknown> => {
        const streamPromise = runner.run({
          input: options.input,
          model: options.model,
          ...(options.mcpServers && { mcpServers: options.mcpServers }),
          ...(options.tools && { tools: options.tools }),
          ...(options.maxSteps && { maxSteps: options.maxSteps }),
          ...(options.systemPrompt && { instructions: options.systemPrompt }),
          stream: true,
        });

        return {
          [Symbol.asyncIterator]: async function* () {
            const stream = await streamPromise;
            if (Symbol.asyncIterator in stream) {
              for await (const chunk of stream) {
                yield chunk;
              }
            }
          },
        };
      },
    })),
  ),
);

export const RouterAgentLive = Layer.effect(
  RouterAgent,
  AgentRunner.pipe(
    Effect.map(({ run }) => ({
      route: (input: string) =>
        pipe(
          run({
            input,
            model: "openai/gpt-4o-mini",
            systemPrompt: ROUTER_PROMPT,
          }),
          Effect.flatMap((result) =>
            Effect.try({
              try: () => JSON.parse(result.finalOutput),
              catch: () =>
                new RouterAgentError({
                  message: "Failed to parse router response as JSON",
                }),
            }),
          ),
          Effect.mapError(
            (error) =>
              new RouterAgentError({
                message:
                  error instanceof RouterAgentError
                    ? error.message
                    : `Router failed: ${error}`,
              }),
          ),
        ),
    })),
  ),
);

export const QueryAgentLive = Layer.effect(
  QueryAgent,
  AgentRunner.pipe(
    Effect.map(({ run }) => ({
      query: (input: string, context?: string, tools?: Array<Tool>) =>
        pipe(
          run({
            input: context
              ? `Context: ${context}\n\nQuestion: ${input}`
              : input,
            model: "anthropic/claude-sonnet-4-5-20250929",
            mcpServers: ["joerup/exa-mcp", "simon-liang/brave-search-mcp"],
            ...(tools && { tools }),
            maxSteps: 10,
          }),
          Effect.map((result) => ({ response: result.finalOutput })),
          Effect.mapError(
            (error) =>
              new QueryAgentError({
                message: `Query failed: ${error}`,
              }),
          ),
        ),
    })),
  ),
);

// Helper to extract JSON from a response that may have surrounding text
function extractJson(text: string): string {
  // Try to find JSON in code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object directly
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return text;
}

export const ParserAgentLive = Layer.effect(
  ParserAgent,
  AgentRunner.pipe(
    Effect.map(({ run }) => ({
      parse: (
        input: string,
        conversationHistory: Array<{
          role: "user" | "assistant";
          content: string;
        }>,
        tools?: Array<Tool>,
      ) =>
        pipe(
          run({
            input:
              conversationHistory.length > 0
                ? `Conversation so far:\n${conversationHistory.map((m) => `${m.role}: ${m.content}`).join("\n")}\n\nLatest user message: ${input}`
                : input,
            model: "anthropic/claude-sonnet-4-5-20250929",
            systemPrompt: PARSER_PROMPT,
            ...(tools && { tools }),
            maxSteps: 5,
          }),
          Effect.tap((result) =>
            Effect.sync(() =>
              console.log("Parser raw output:", result.finalOutput),
            ),
          ),
          Effect.flatMap((result) =>
            Effect.try({
              try: () => {
                const jsonStr = extractJson(result.finalOutput);
                return JSON.parse(jsonStr) as ParserResult;
              },
              catch: () =>
                new ParserAgentError({
                  message: "Failed to parse classifier response as JSON",
                }),
            }),
          ),
          Effect.mapError(
            (error) =>
              new ParserAgentError({
                message:
                  error instanceof ParserAgentError
                    ? error.message
                    : `Parser failed: ${error}`,
              }),
          ),
        ),
    })),
  ),
);

// Platform-specific site filters for Exa search
const PLATFORM_SITE_FILTERS: Record<Platform, string> = {
  x: "site:x.com OR site:twitter.com",
  substack: "site:substack.com",
  blog: "-site:x.com -site:twitter.com -site:substack.com -site:youtube.com -site:medium.com",
  youtube: "site:youtube.com",
};

export const OrchestratorAgentLive = Layer.effect(
  OrchestratorAgent,
  AgentRunner.pipe(
    Effect.map(({ run }) => ({
      searchCreators: (
        compatibilityString: string,
        platform: Platform,
        count: number,
      ) =>
        pipe(
          Effect.sync(() =>
            console.log(
              "OrchestratorAgent.searchCreators called with:",
              { compatibilityString, platform },
            ),
          ),
          Effect.flatMap(() =>
            run({
              input: `Search for content creators on ${platform} matching: "${compatibilityString}". Find up to ${count} creators. Use filter: ${PLATFORM_SITE_FILTERS[platform]}`,
              model: "anthropic/claude-sonnet-4-5-20250929",
              systemPrompt: ORCHESTRATOR_SEARCH_PROMPT,
              mcpServers: ["joerup/exa-mcp"],
              maxSteps: 5,
            }),
          ),
          Effect.tap((result) =>
            Effect.sync(() =>
              console.log(
                "OrchestratorAgent.searchCreators result:",
                result.finalOutput?.substring(0, 200),
              ),
            ),
          ),
          Effect.flatMap((result) =>
            Effect.try({
              try: () => {
                const parsed = JSON.parse(extractJson(result.finalOutput));
                return parsed.creators as Array<ContentCreator>;
              },
              catch: () =>
                new OrchestratorAgentError({
                  message: "Failed to parse search creators as JSON",
                }),
            }),
          ),
          Effect.mapError(
            (error) =>
              new OrchestratorAgentError({
                message:
                  error instanceof OrchestratorAgentError
                    ? error.message
                    : `Search failed: ${error}`,
              }),
          ),
        ),

      generateFootprint: (creator: ContentCreator) =>
        pipe(
          run({
            input: `Name: ${creator.name}\nPlatform: ${creator.platform}\nProfile: ${creator.profileUrl}\n${creator.bio ? `Bio: ${creator.bio}\n` : ""}\nRecent Content:\n${creator.recentContent.map((c, i) => `${i + 1}. ${c.title ? `[${c.title}] ` : ""}${c.excerpt}`).join("\n")}`,
            model: "anthropic/claude-opus-4-5",
            systemPrompt: ORCHESTRATOR_FOOTPRINT_PROMPT,
          }),
          Effect.flatMap((result) =>
            Effect.try({
              try: () => JSON.parse(extractJson(result.finalOutput)) as FootprintResult,
              catch: () =>
                new OrchestratorAgentError({
                  message: "Failed to parse footprint as JSON",
                }),
            }),
          ),
          Effect.mapError(
            (error) =>
              new OrchestratorAgentError({
                message:
                  error instanceof OrchestratorAgentError
                    ? error.message
                    : `Footprint generation failed: ${error}`,
              }),
          ),
        ),
    })),
  ),
);

export const JudgeAgentLive = Layer.effect(
  JudgeAgent,
  AgentRunner.pipe(
    Effect.map(({ run }) => ({
      evaluate: (
        userCriteria: ChemistryCriteria,
        candidateFootprint: ChemistryCriteria,
      ) =>
        pipe(
          run({
            input: `User Chemistry Criteria:\n${JSON.stringify(userCriteria, null, 2)}\n\nCandidate Footprint:\n${JSON.stringify(candidateFootprint, null, 2)}`,
            model: "openai/gpt-4o",
            systemPrompt: JUDGE_PROMPT,
          }),
          Effect.flatMap((result) =>
            Effect.try({
              try: () => JSON.parse(result.finalOutput) as JudgeResult,
              catch: () =>
                new JudgeAgentError({
                  message: "Failed to parse judge response as JSON",
                }),
            }),
          ),
          Effect.mapError(
            (error) =>
              new JudgeAgentError({
                message:
                  error instanceof JudgeAgentError
                    ? error.message
                    : `Judge failed: ${error}`,
              }),
          ),
        ),
    })),
  ),
);

export const DeepXSearchOrchestratorLive = Layer.effect(
  DeepXSearchOrchestrator,
  Effect.all([ParserAgent, OrchestratorAgent, JudgeAgent]).pipe(
    Effect.map(([parser, orchestrator, judge]) => ({
      execute: (
        userQuery: string,
        config: DeepSearchConfig,
        _cachedCriteria?: StoredChemistryCriteria,
      ) => {
        const loop = (
          compatibilityString: string,
          platform: Platform,
          chemistryCriteria: ChemistryCriteria,
          loopCount: number,
          totalSearched: number,
          qualifiedCreators: Array<{ user: Creator; score: JudgeResult }>,
          previousBestScore: number,
        ): Effect.Effect<DeepSearchResult, DeepSearchError> =>
          pipe(
            orchestrator.searchCreators(
              compatibilityString,
              platform,
              config.usersPerSearch,
            ),
            Effect.mapError(
              (e) =>
                new DeepSearchError({ message: e.message, phase: "searching" }),
            ),
            Effect.flatMap((creators) =>
              pipe(
                Effect.forEach(
                  creators,
                  (creator) => orchestrator.generateFootprint(creator),
                  { concurrency: 10 },
                ),
                Effect.mapError(
                  (e) =>
                    new DeepSearchError({
                      message: e.message,
                      phase: "searching",
                    }),
                ),
                Effect.map((footprintResults) =>
                  footprintResults
                    .map((r, i) => ({ result: r, creator: creators[i] }))
                    .filter(
                      (item): item is { result: { skip: false; footprint: ChemistryCriteria }; creator: ContentCreator } =>
                        !item.result.skip,
                    )
                    .map(({ result, creator }, i) => ({
                      id: `creator-${totalSearched + i}`,
                      name: creator.name,
                      platform: creator.platform,
                      profileUrl: creator.profileUrl,
                      bio: creator.bio,
                      footprint: result.footprint,
                      rawData: {},
                    })),
                ),
              ),
            ),
            Effect.flatMap((creators) =>
              pipe(
                Effect.forEach(
                  creators,
                  (creator) =>
                    pipe(
                      judge.evaluate(chemistryCriteria, creator.footprint),
                      Effect.map((score) => ({ user: creator, score })),
                    ),
                  { concurrency: 10 },
                ),
                Effect.mapError(
                  (e) =>
                    new DeepSearchError({
                      message: e.message,
                      phase: "judging",
                    }),
                ),
              ),
            ),
            Effect.flatMap((scoredCreators) => {
              const newQualified = scoredCreators.filter(
                (s) => s.score.score >= config.scoreThreshold,
              );
              const allQualified = [...qualifiedCreators, ...newQualified];
              const newTotalSearched = totalSearched + scoredCreators.length;
              const newLoopCount = loopCount + 1;

              const currentBestScore =
                scoredCreators.length > 0
                  ? Math.max(...scoredCreators.map((s) => s.score.score))
                  : 0;

              if (allQualified.length >= 3) {
                return Effect.succeed({
                  status: "success" as const,
                  qualifiedUsers: allQualified,
                  totalSearched: newTotalSearched,
                  loopsExecuted: newLoopCount,
                });
              }

              if (newLoopCount >= config.maxSearchLoops) {
                return Effect.succeed({
                  status: "exhausted" as const,
                  qualifiedUsers: allQualified,
                  totalSearched: newTotalSearched,
                  loopsExecuted: newLoopCount,
                });
              }

              if (
                newLoopCount >= 2 &&
                currentBestScore < previousBestScore - 10
              ) {
                return Effect.succeed({
                  status: "impossible_criteria" as const,
                  suggestion:
                    "Scores are declining across loops. Your chemistry criteria may be internally contradictory. Consider relaxing constraints on epistemic_architecture or value_hierarchy.primary_good.",
                  totalSearched: newTotalSearched,
                  loopsExecuted: newLoopCount,
                });
              }

              return loop(
                compatibilityString,
                platform,
                chemistryCriteria,
                newLoopCount,
                newTotalSearched,
                allQualified,
                Math.max(previousBestScore, currentBestScore),
              );
            }),
          );

        return pipe(
          parser.parse(userQuery, []),
          Effect.mapError(
            (e) =>
              new DeepSearchError({ message: e.message, phase: "parsing" }),
          ),
          Effect.flatMap((parserResult) => {
            if (parserResult.status === "needs_clarification") {
              return Effect.fail(
                new DeepSearchError({
                  message: `Clarification needed:\n${parserResult.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`,
                  phase: "parsing",
                }),
              );
            }
            return loop(
              parserResult.compatibility_string,
              parserResult.platform,
              parserResult.chemistry_criteria,
              0,
              0,
              [],
              0,
            );
          }),
        );
      },
    })),
  ),
);

export const AllAgentsLive = pipe(
  AgentRunnerLive,
  Layer.provideMerge(RouterAgentLive),
  Layer.provideMerge(QueryAgentLive),
  Layer.provideMerge(ParserAgentLive),
  Layer.provideMerge(OrchestratorAgentLive),
  Layer.provideMerge(JudgeAgentLive),
  Layer.provideMerge(DeepXSearchOrchestratorLive),
);

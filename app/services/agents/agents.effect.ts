import { Effect, Layer, pipe, Schema, JSONSchema } from "effect";
import type { RunResult } from "dedalus-labs/lib/runner/runner";
import type { Tool } from "dedalus-labs/lib/runner/types/tools";
import {
  ParserResult,
  SearchCreatorsResult,
  FootprintResult as FootprintResultSchema,
  JudgeResult as JudgeResultSchema,
  type AgentRunOptions,
  type ChemistryCriteria,
  type JudgeResult,
  type ContentCreator,
  type Platform,
  type FootprintResult,
  type Creator,
  type DeepSearchConfig,
  type DeepSearchResult,
  type StoredChemistryCriteria,
} from "./agents.types";
import {
  DedalusRunnerService,
  AgentRunner,
  QueryAgent,
  ParserAgent,
  OrchestratorAgent,
  JudgeAgent,
  DeepSearchOrchestrator,
  type OnSearchStartCallback,
} from "./agents.service";
import {
  AgentRunnerError,
  QueryAgentError,
  ParserAgentError,
  OrchestratorAgentError,
  JudgeAgentError,
  DeepSearchError,
} from "./agents.errors";
import {
  PARSER_PROMPT,
  ORCHESTRATOR_SEARCH_PROMPT,
  ORCHESTRATOR_FOOTPRINT_PROMPT,
  JUDGE_PROMPT,
} from "./prompts";

// Convert Effect's snake_case JSON Schema keys to standard camelCase
const fixJsonSchemaKeys = (obj: unknown): unknown => {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(fixJsonSchemaKeys);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Convert snake_case JSON Schema keywords to camelCase
    const newKey = key === "any_of" ? "anyOf"
      : key === "one_of" ? "oneOf"
      : key === "all_of" ? "allOf"
      : key === "additional_properties" ? "additionalProperties"
      : key === "min_length" ? "minLength"
      : key === "max_length" ? "maxLength"
      : key === "min_items" ? "minItems"
      : key === "max_items" ? "maxItems"
      : key;
    result[newKey] = fixJsonSchemaKeys(value);
  }
  return result;
};

// Wrap Effect's JSON Schema in OpenAI's response_format structure
const wrapJsonSchema = (schema: unknown, name: string) => {
  const fixed = fixJsonSchemaKeys(schema) as Record<string, unknown>;

  // Remove $schema as OpenAI doesn't want it
  delete fixed.$schema;

  // OpenAI requires root schema to have type: "object"
  // Effect may set type to undefined/null for unions - force it to "object"
  fixed.type = "object";

  return {
    type: "json_schema",
    json_schema: {
      name,
      strict: false,
      schema: fixed,
    },
  };
};

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
              ...(options.responseFormat && {
                responseFormat: options.responseFormat as unknown as { [key: string]: unknown },
              }),
              ...(options.policy && { policy: options.policy }),
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
          ...(options.responseFormat && {
            responseFormat: options.responseFormat as unknown as { [key: string]: unknown },
          }),
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
            model: "openai/gpt-5.1",
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

// Policy factory: forces "complete" status when user has already answered questions
const createParserPolicy = (hasAnsweredQuestions: boolean) => () => {
  if (hasAnsweredQuestions) {
    return {
      messagePrepend: [{
        role: "system",
        content: `CRITICAL OVERRIDE: The user has already answered your clarifying questions. You MUST return status: "complete" with all fields populated. Do NOT return "needs_clarification" again. Extract the platform, compatibility_string, and chemistry_criteria from their answers NOW.`,
      }],
    };
  }
  return {};
};

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
            model: "openai/gpt-5.1",
            systemPrompt: PARSER_PROMPT,
            responseFormat: wrapJsonSchema(JSONSchema.make(ParserResult), "parser_result"),
            policy: createParserPolicy(conversationHistory.length > 0),
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
              try: () => Schema.decodeUnknownSync(ParserResult)(JSON.parse(result.finalOutput)),
              catch: (error) =>
                new ParserAgentError({
                  message: `Failed to parse/validate response: ${error instanceof Error ? error.message : String(error)}`,
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
            console.log("OrchestratorAgent.searchCreators called with:", {
              compatibilityString,
              platform,
            }),
          ),
          Effect.flatMap(() =>
            run({
              input: `Search for content creators on ${platform} matching: "${compatibilityString}". Find up to ${count} creators. Use filter: ${PLATFORM_SITE_FILTERS[platform]}`,
              model: "openai/gpt-5.1",
              systemPrompt: ORCHESTRATOR_SEARCH_PROMPT,
              responseFormat: wrapJsonSchema(JSONSchema.make(SearchCreatorsResult), "search_creators_result"),
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
                const parsed = Schema.decodeUnknownSync(SearchCreatorsResult)(JSON.parse(result.finalOutput));
                return [...parsed.creators];
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
            model: "openai/gpt-5.1",
            systemPrompt: ORCHESTRATOR_FOOTPRINT_PROMPT,
            responseFormat: wrapJsonSchema(JSONSchema.make(FootprintResultSchema), "footprint_result"),
          }),
          Effect.flatMap((result) =>
            Effect.try({
              try: () => Schema.decodeUnknownSync(FootprintResultSchema)(JSON.parse(result.finalOutput)),
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
            responseFormat: wrapJsonSchema(JSONSchema.make(JudgeResultSchema), "judge_result"),
          }),
          Effect.flatMap((result) =>
            Effect.try({
              try: () => Schema.decodeUnknownSync(JudgeResultSchema)(JSON.parse(result.finalOutput)),
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

export const DeepSearchOrchestratorLive = Layer.effect(
  DeepSearchOrchestrator,
  Effect.all([ParserAgent, OrchestratorAgent, JudgeAgent]).pipe(
    Effect.map(([parser, orchestrator, judge]) => ({
      execute: (
        userQuery: string,
        config: DeepSearchConfig,
        conversationHistory: Array<{
          role: "user" | "assistant";
          content: string;
        }>,
        onSearchStart?: OnSearchStartCallback,
        cachedCriteria?: StoredChemistryCriteria,
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
                Effect.tap((footprintResults) =>
                  Effect.sync(() => {
                    const skipped = footprintResults.filter(
                      (r) => r.skip,
                    ).length;
                    console.log(
                      `Footprint results: ${footprintResults.length - skipped} valid, ${skipped} skipped`,
                    );
                  }),
                ),
                Effect.map((footprintResults) =>
                  footprintResults
                    .map((r, i) => ({ result: r, creator: creators[i] }))
                    .filter(
                      (
                        item,
                      ): item is {
                        result: FootprintResult & { footprint: ChemistryCriteria };
                        creator: ContentCreator;
                      } => !item.result.skip && item.result.footprint !== undefined,
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
            Effect.tap((scoredCreators) =>
              Effect.sync(() => {
                console.log("=== Scoring Results ===");
                scoredCreators.forEach((s) => {
                  console.log(
                    `  ${s.user.name}: ${s.score.score}% (${s.score.confidence}) - ${s.score.justification.substring(0, 50)}...`,
                  );
                });
              }),
            ),
            Effect.flatMap((scoredCreators) => {
              const newQualified = scoredCreators.filter(
                (s) => s.score.score >= config.scoreThreshold,
              );
              console.log(
                `Qualified this loop: ${newQualified.length}/${scoredCreators.length} (threshold: ${config.scoreThreshold})`,
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
                  chemistryCriteria,
                });
              }

              if (newLoopCount >= config.maxSearchLoops) {
                return Effect.succeed({
                  status: "exhausted" as const,
                  qualifiedUsers: allQualified,
                  totalSearched: newTotalSearched,
                  loopsExecuted: newLoopCount,
                  chemistryCriteria,
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

        // Build input with existing chemistry profile context if available
        const parserInput = cachedCriteria
          ? `EXISTING CHEMISTRY PROFILE (use as baseline):\n${JSON.stringify(cachedCriteria.criteria, null, 2)}\n\n---\n\nUser request: ${userQuery}`
          : userQuery;

        return pipe(
          parser.parse(parserInput, conversationHistory),
          Effect.mapError(
            (e) =>
              new DeepSearchError({ message: e.message, phase: "parsing" }),
          ),
          Effect.flatMap((parserResult) => {
            // Deterministic logic: only allow clarification on FIRST interaction
            // If conversation history exists, user already answered - force complete
            const alreadyAskedQuestions = conversationHistory.length > 0;

            if (parserResult.status.includes("clarification") && !alreadyAskedQuestions) {
              return Effect.succeed({
                status: "needs_clarification" as const,
                questions: parserResult.questions ?? [],
              });
            }

            // Either status is "complete" OR we're forcing complete because user already answered
            const { compatibility_string, platform, chemistry_criteria } = parserResult;
            if (!compatibility_string || !platform || !chemistry_criteria) {
              // If LLM still didn't provide fields after user answered, that's an error
              return Effect.fail(
                new DeepSearchError({
                  message: alreadyAskedQuestions
                    ? "Parser failed to extract required fields from user's answers"
                    : "Parser returned complete status but missing required fields",
                  phase: "parsing",
                }),
              );
            }
            // Emit acknowledgment before starting search
            return pipe(
              Effect.promise(async () => {
                await onSearchStart?.(
                  "Got it! I'll start searching for creators that match your criteria. This may take a minute — feel free to leave this chat and check back later for results.",
                );
              }),
              Effect.flatMap(() =>
                loop(
                  compatibility_string,
                  platform,
                  chemistry_criteria,
                  0,
                  0,
                  [],
                  0,
                ),
              ),
            );
          }),
        );
      },
    })),
  ),
);

export const AllAgentsLive = pipe(
  AgentRunnerLive,
  Layer.provideMerge(QueryAgentLive),
  Layer.provideMerge(ParserAgentLive),
  Layer.provideMerge(OrchestratorAgentLive),
  Layer.provideMerge(JudgeAgentLive),
  Layer.provideMerge(DeepSearchOrchestratorLive),
);

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
    const newKey =
      key === "any_of"
        ? "anyOf"
        : key === "one_of"
          ? "oneOf"
          : key === "all_of"
            ? "allOf"
            : key === "additional_properties"
              ? "additionalProperties"
              : key === "min_length"
                ? "minLength"
                : key === "max_length"
                  ? "maxLength"
                  : key === "min_items"
                    ? "minItems"
                    : key === "max_items"
                      ? "maxItems"
                      : key;
    result[newKey] = fixJsonSchemaKeys(value);
  }
  return result;
};

// Recursively convert null values to undefined (delete them) for Effect schema compatibility
// OpenAI strict mode returns null for optional fields, but Effect expects undefined
const sanitizeNulls = (obj: unknown): unknown => {
  if (obj === null) return undefined;
  if (Array.isArray(obj)) return obj.map(sanitizeNulls);
  if (typeof obj === "object" && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitized = sanitizeNulls(value);
      if (sanitized !== undefined) {
        result[key] = sanitized;
      }
    }
    return result;
  }
  return obj;
};

// Transform schema for OpenAI strict mode: all properties must be required, optional fields become nullable
const makeStrictSchema = (
  schema: Record<string, unknown>,
): Record<string, unknown> => {
  const result = { ...schema };

  if (result.properties && typeof result.properties === "object") {
    const properties = result.properties as Record<string, unknown>;
    const propertyKeys = Object.keys(properties);
    const currentRequired = Array.isArray(result.required)
      ? (result.required as Array<string>)
      : [];

    // Transform each property
    const newProperties: Record<string, unknown> = {};
    for (const key of propertyKeys) {
      const propSchema = properties[key] as Record<string, unknown>;
      const isOptional = !currentRequired.includes(key);

      if (isOptional) {
        // Make optional fields nullable by wrapping in anyOf with null
        newProperties[key] = {
          anyOf: [makeStrictSchema(propSchema), { type: "null" }],
        };
      } else {
        // Recursively process required fields
        newProperties[key] = makeStrictSchema(propSchema);
      }
    }

    result.properties = newProperties;
    result.required = propertyKeys; // All properties are now required
    result.additionalProperties = false; // Required for strict mode
  }

  // Recursively handle nested objects in anyOf/oneOf/allOf
  for (const combiner of ["anyOf", "oneOf", "allOf"]) {
    if (Array.isArray(result[combiner])) {
      result[combiner] = (result[combiner] as Array<unknown>).map((item) =>
        typeof item === "object" && item !== null
          ? makeStrictSchema(item as Record<string, unknown>)
          : item,
      );
    }
  }

  // Handle array items
  if (result.items && typeof result.items === "object") {
    result.items = makeStrictSchema(result.items as Record<string, unknown>);
  }

  return result;
};

// Wrap Effect's JSON Schema in OpenAI's response_format structure
const wrapJsonSchema = (schema: unknown, name: string) => {
  const fixed = fixJsonSchemaKeys(schema) as Record<string, unknown>;

  // Remove $schema as OpenAI doesn't want it
  delete fixed.$schema;

  // OpenAI requires root schema to have type: "object"
  fixed.type = "object";

  // Transform for strict mode: all properties required, optional fields nullable
  const strictSchema = makeStrictSchema(fixed);

  return {
    type: "json_schema",
    json_schema: {
      name,
      strict: true,
      schema: strictSchema,
    },
  };
};

// Helper to pick a random element from an array
const pickRandom = <T>(arr: Array<T>): T =>
  arr[Math.floor(Math.random() * arr.length)];

// Helper to generate a random number in range
const randomInRange = (min: number, max: number): number =>
  Math.round((Math.random() * (max - min) + min) * 10) / 10;

// Generate a random chemistry criteria for users who don't answer questions properly
export const generateRandomChemistryCriteria = (): ChemistryCriteria => ({
  epistemic_architecture: {
    primary_mode: pickRandom([
      "first_principles",
      "empirical",
      "narrative",
      "dialectical",
      "intuitive",
    ]),
    evidence_hierarchy: pickRandom([
      ["data", "expert opinion", "anecdotes"],
      ["logic", "empirical evidence", "tradition"],
      ["personal experience", "scientific studies", "intuition"],
    ]),
    certainty_stance: pickRandom([
      "seeking closure",
      "embracing ambiguity",
      "epistemic humility",
      "radical skepticism",
    ]),
    knowledge_model: pickRandom([
      "monolithic truth",
      "perspectival shards",
      "socially constructed",
      "pragmatic instrument",
    ]),
  },
  value_hierarchy: {
    primary_good: pickRandom([
      "truth",
      "freedom",
      "harmony",
      "progress",
      "justice",
    ]),
    non_negotiables: pickRandom([
      ["honesty", "autonomy"],
      ["fairness", "compassion"],
      ["integrity", "growth"],
    ]),
    typical_tradeoffs: pickRandom([
      "efficiency vs. thoroughness",
      "individual vs. collective",
      "stability vs. innovation",
    ]),
    moral_foundations: {
      care_vs_harm: randomInRange(0.3, 0.9),
      fairness_vs_cheating: randomInRange(0.3, 0.9),
      loyalty_vs_betrayal: randomInRange(0.3, 0.9),
      authority_vs_subversion: randomInRange(0.3, 0.9),
      sanctity_vs_degradation: randomInRange(0.3, 0.9),
      liberty_vs_oppression: randomInRange(0.3, 0.9),
    },
  },
  cognitive_fingerprint: {
    reasoning_pattern: pickRandom([
      "deductive reduction",
      "analogical mapping",
      "constraint propagation",
      "pattern synthesis",
    ]),
    abstraction_level: pickRandom([
      "concrete operations",
      "systems thinking",
      "meta-theoretic",
      "ontological",
    ]),
    recurrent_metaphors: pickRandom([
      ["building", "growing"],
      ["journey", "discovery"],
      ["battle", "strategy"],
    ]),
    mental_toolkit: pickRandom([
      ["first principles", "thought experiments"],
      ["data analysis", "pattern recognition"],
      ["storytelling", "analogies"],
    ]),
  },
  temporal_orientation: {
    past_weight: randomInRange(0.1, 0.5),
    present_weight: randomInRange(0.2, 0.5),
    future_weight: randomInRange(0.2, 0.5),
    change_velocity: pickRandom([
      "revolutionary",
      "evolutionary",
      "conservative",
      "cyclical",
    ]),
  },
  aspirational_vector: {
    target_state: pickRandom([
      "understanding",
      "mastery",
      "influence",
      "contribution",
    ]),
    utopia_distance: randomInRange(0.3, 0.8),
    action_orientation: pickRandom([
      "theory",
      "praxis",
      "propaganda",
      "community-building",
    ]),
  },
  affective_signature: {
    emotional_register: pickRandom([
      "playful irreverence",
      "grave responsibility",
      "earnest optimism",
      "detached analysis",
    ]),
    energy_level: pickRandom(["intense", "measured", "calm", "urgent"]),
    conflict_stance: pickRandom([
      "confrontational",
      "conciliatory",
      "avoidant",
      "dialectical",
    ]),
  },
  communication_geometry: {
    density: pickRandom([
      "terse aphorisms",
      "dense paragraphs",
      "exploratory threads",
    ]),
    formality: pickRandom([
      "academic",
      "conversational",
      "technical slang",
      "poetic",
    ]),
    audience_assumption: pickRandom([
      "peer expert",
      "educated layperson",
      "student",
      "adversary",
    ]),
  },
  edge_or_center: {
    contrarian_score: randomInRange(0.2, 0.8),
    orthodoxy_alignment: pickRandom([
      "dissident",
      "reformer",
      "insider",
      "establishment",
    ]),
    risk_tolerance: pickRandom([
      "revolutionary",
      "experimental",
      "cautious",
      "conservative",
    ]),
  },
});

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
                responseFormat: options.responseFormat as unknown as {
                  [key: string]: unknown;
                },
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
            responseFormat: options.responseFormat as unknown as {
              [key: string]: unknown;
            },
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
      messagePrepend: [
        {
          role: "system",
          content: `CRITICAL OVERRIDE: The user has already answered your clarifying questions. You MUST return status: "complete" with all fields populated. Do NOT return "needs_clarification" again. Extract the platform, compatibility_string, and chemistry_criteria from their answers NOW.`,
        },
      ],
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
            responseFormat: wrapJsonSchema(
              JSONSchema.make(ParserResult),
              "parser_result",
            ),
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
              try: () => {
                const parsed = sanitizeNulls(JSON.parse(result.finalOutput));
                return Schema.decodeUnknownSync(ParserResult)(parsed);
              },
              catch: () =>
                new ParserAgentError({
                  message:
                    "Insufficent information to proceed with deep search. Either answer parsing failed or questions supplied was not answered. ",
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
              responseFormat: wrapJsonSchema(
                JSONSchema.make(SearchCreatorsResult),
                "search_creators_result",
              ),
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
                const parsed = Schema.decodeUnknownSync(SearchCreatorsResult)(
                  sanitizeNulls(JSON.parse(result.finalOutput)),
                );
                return [...parsed.creators];
              },
              catch: (error) =>
                new OrchestratorAgentError({
                  message: `Failed to parse search creators: ${error instanceof Error ? error.message : String(error)}`,
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
            responseFormat: wrapJsonSchema(
              JSONSchema.make(FootprintResultSchema),
              "footprint_result",
            ),
          }),
          Effect.tap((result) =>
            Effect.sync(() =>
              console.log("Footprint raw output:", result.finalOutput),
            ),
          ),
          Effect.flatMap((result) =>
            Effect.try({
              try: () => {
                const parsed = sanitizeNulls(JSON.parse(result.finalOutput));
                return Schema.decodeUnknownSync(FootprintResultSchema)(parsed);
              },
              catch: (error) =>
                new OrchestratorAgentError({
                  message: `Failed to parse footprint: ${error instanceof Error ? error.message : String(error)}`,
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
            responseFormat: wrapJsonSchema(
              JSONSchema.make(JudgeResultSchema),
              "judge_result",
            ),
          }),
          Effect.flatMap((result) =>
            Effect.try({
              try: () =>
                Schema.decodeUnknownSync(JudgeResultSchema)(
                  sanitizeNulls(JSON.parse(result.finalOutput)),
                ),
              catch: (error) =>
                new JudgeAgentError({
                  message: `Failed to parse judge response: ${error instanceof Error ? error.message : String(error)}`,
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
          seenUrls: Set<string>,
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
            // Filter out creators we've already seen
            Effect.map((creators) => {
              const newCreators = creators.filter(
                (c) => !seenUrls.has(c.profileUrl),
              );
              console.log(
                `Deduplication: ${creators.length} found, ${newCreators.length} new (${creators.length - newCreators.length} already seen)`,
              );
              return newCreators;
            }),
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
                        result: FootprintResult & {
                          footprint: ChemistryCriteria;
                        };
                        creator: ContentCreator;
                      } =>
                        !item.result.skip &&
                        item.result.footprint !== undefined,
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

              // Add all processed URLs to seen set for deduplication
              const newSeenUrls = new Set(seenUrls);
              scoredCreators.forEach((s) => newSeenUrls.add(s.user.profileUrl));

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
                    "I'm having trouble finding good matches. The combination of traits you're looking for might be quite rare. Try broadening what you're looking for, or focus on fewer specific qualities.",
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
                newSeenUrls,
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

            // Schema enforces status is exactly "needs_clarification" or "complete"
            if (
              parserResult.status === "needs_clarification" &&
              !alreadyAskedQuestions
            ) {
              return Effect.succeed({
                status: "needs_clarification" as const,
                questions: parserResult.questions ?? [],
              });
            }

            // Either status is "complete" OR we're forcing complete because user already answered
            let { compatibility_string, platform, chemistry_criteria } =
              parserResult;

            // Handle missing fields with fallbacks
            if (!compatibility_string || !platform || !chemistry_criteria) {
              if (alreadyAskedQuestions) {
                // User didn't answer properly - use fallbacks
                console.log(
                  "Parser failed to extract fields from user answers, using fallbacks",
                );

                // Use cached criteria or generate random
                if (!chemistry_criteria) {
                  chemistry_criteria = cachedCriteria?.criteria ?? generateRandomChemistryCriteria();
                  console.log(
                    cachedCriteria
                      ? "Using cached chemistry criteria"
                      : "Generated random chemistry criteria",
                  );
                }

                // Default platform and compatibility string if missing
                if (!platform) {
                  platform = "substack";
                  console.log("Defaulting to platform: substack");
                }
                if (!compatibility_string) {
                  compatibility_string = "interesting thinkers and writers";
                  console.log("Using generic compatibility string");
                }
              } else {
                // First interaction - shouldn't happen, but error if it does
                return Effect.fail(
                  new DeepSearchError({
                    message: "Parser returned complete status but missing required fields",
                    phase: "parsing",
                  }),
                );
              }
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
                  new Set<string>(),
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

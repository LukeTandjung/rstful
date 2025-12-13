import { Effect, Context } from "effect";
import type { DedalusRunner } from "dedalus-labs";
import type { RunResult } from "dedalus-labs/lib/runner/runner";
import type { Tool } from "dedalus-labs/lib/runner/types/tools";
import type {
  AgentRunOptions,
  ParserResult,
  ChemistryCriteria,
  ContentCreator,
  Platform,
  FootprintResult,
  JudgeResult,
  DeepSearchConfig,
  DeepSearchResult,
  StoredChemistryCriteria,
} from "./agents.types";
import {
  AgentRunnerError,
  RouterAgentError,
  QueryAgentError,
  ParserAgentError,
  OrchestratorAgentError,
  JudgeAgentError,
  DeepSearchError,
} from "./agents.errors";

export class DedalusRunnerService extends Context.Tag("DedalusRunnerService")<
  DedalusRunnerService,
  {
    readonly runner: DedalusRunner;
  }
>() {}

export class AgentRunner extends Context.Tag("AgentRunner")<
  AgentRunner,
  {
    readonly run: (
      options: AgentRunOptions
    ) => Effect.Effect<RunResult, AgentRunnerError>;
    readonly runStream: (
      options: AgentRunOptions
    ) => AsyncIterable<unknown>;
  }
>() {}

export class RouterAgent extends Context.Tag("RouterAgent")<
  RouterAgent,
  {
    readonly route: (
      input: string
    ) => Effect.Effect<
      { intent: "simple_query" | "web_search" | "deep_search"; confidence: number },
      RouterAgentError
    >;
  }
>() {}

export class QueryAgent extends Context.Tag("QueryAgent")<
  QueryAgent,
  {
    readonly query: (
      input: string,
      context?: string,
      tools?: Array<Tool>
    ) => Effect.Effect<{ response: string }, QueryAgentError>;
  }
>() {}

export class ParserAgent extends Context.Tag("ParserAgent")<
  ParserAgent,
  {
    readonly parse: (
      input: string,
      conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
      tools?: Array<Tool>
    ) => Effect.Effect<ParserResult, ParserAgentError>;
  }
>() {}

export class OrchestratorAgent extends Context.Tag("OrchestratorAgent")<
  OrchestratorAgent,
  {
    readonly searchCreators: (
      compatibilityString: string,
      platform: Platform,
      count: number
    ) => Effect.Effect<Array<ContentCreator>, OrchestratorAgentError>;
    readonly generateFootprint: (
      creator: ContentCreator
    ) => Effect.Effect<FootprintResult, OrchestratorAgentError>;
  }
>() {}

export class JudgeAgent extends Context.Tag("JudgeAgent")<
  JudgeAgent,
  {
    readonly evaluate: (
      userCriteria: ChemistryCriteria,
      candidateFootprint: ChemistryCriteria
    ) => Effect.Effect<JudgeResult, JudgeAgentError>;
  }
>() {}

export class DeepXSearchOrchestrator extends Context.Tag("DeepXSearchOrchestrator")<
  DeepXSearchOrchestrator,
  {
    readonly execute: (
      userQuery: string,
      config: DeepSearchConfig,
      cachedCriteria?: StoredChemistryCriteria
    ) => Effect.Effect<DeepSearchResult, DeepSearchError>;
  }
>() {}

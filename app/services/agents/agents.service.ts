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

export type OnSearchStartCallback = (acknowledgment: string) => void | Promise<void>;

export class DeepSearchOrchestrator extends Context.Tag("DeepSearchOrchestrator")<
  DeepSearchOrchestrator,
  {
    readonly execute: (
      userQuery: string,
      config: DeepSearchConfig,
      conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
      onSearchStart?: OnSearchStartCallback,
      cachedCriteria?: StoredChemistryCriteria
    ) => Effect.Effect<DeepSearchResult, DeepSearchError>;
  }
>() {}

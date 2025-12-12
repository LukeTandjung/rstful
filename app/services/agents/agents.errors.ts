import { Data } from "effect";

export class AgentRunnerError extends Data.TaggedError("AgentRunnerError")<{
  message: string;
}> {}

export class RouterAgentError extends Data.TaggedError("RouterAgentError")<{
  message: string;
}> {}

export class QueryAgentError extends Data.TaggedError("QueryAgentError")<{
  message: string;
}> {}

export class ParserAgentError extends Data.TaggedError("ParserAgentError")<{
  message: string;
}> {}

export class OrchestratorAgentError extends Data.TaggedError(
  "OrchestratorAgentError",
)<{
  message: string;
}> {}

export class JudgeAgentError extends Data.TaggedError("JudgeAgentError")<{
  message: string;
}> {}

export class DeepSearchError extends Data.TaggedError("DeepSearchError")<{
  message: string;
  phase: "parsing" | "searching" | "judging" | "orchestration";
}> {}

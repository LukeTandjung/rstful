import type { Tool } from "dedalus-labs/lib/runner/types/tools";
import { Schema } from "effect";

export interface PolicyContext {
  step: number;
  messages: Array<{ role: string; content: string }>;
  tools_called: Array<string>;
}

export interface PolicyResult {
  messagePrepend?: Array<{ role: string; content: string }>;
  messageAppend?: Array<{ role: string; content: string }>;
  maxSteps?: number;
  stop?: boolean;
}

export type Policy = (ctx: PolicyContext) => PolicyResult;

export interface AgentRunOptions {
  input?: string;
  model: string;
  messages?: Array<{ role: string; content: string }>;
  mcpServers?: Array<string>;
  tools?: Array<Tool>;
  maxSteps?: number;
  systemPrompt?: string;
  stream?: boolean;
  policy?: Policy;
  responseFormat?: {
    type: string;
    json_schema: {
      name: string;
      strict: boolean;
      schema: unknown;
    };
  };
}

export const Platform = Schema.Literal("substack", "blog", "youtube");

export const ContentCreator = Schema.Struct({
  name: Schema.String,
  platform: Platform,
  profileUrl: Schema.String,
  bio: Schema.optional(Schema.String),
  recentContent: Schema.Array(
    Schema.Struct({
      title: Schema.optional(Schema.String),
      excerpt: Schema.String,
      url: Schema.String,
    })
  ),
});

// Legacy alias for backwards compatibility during migration
export const XHandle = ContentCreator;

// Structured fact schema for LLM output (parser, footprint extraction)
// Uses subject/predicate/object triples for proper knowledge graph storage
export const ExtractedFact = Schema.Struct({
  subject: Schema.String,   // e.g., "user", "distributed systems"
  predicate: Schema.String, // e.g., "prefers", "is interested in", "values"
  object: Schema.String,    // e.g., "first-principles reasoning", "Rust programming"
  category: Schema.String,  // e.g., "value", "interest", "thinking_style", "preference"
  confidence: Schema.Number, // 0.0-1.0
});

export const FootprintResult = Schema.Struct({
  skip: Schema.Boolean,
  // Present when skip is true
  reason: Schema.optional(Schema.String),
  // Present when skip is false - array of extracted facts about the creator
  facts: Schema.optional(Schema.Array(ExtractedFact)),
});

export const Creator = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  platform: Platform,
  profileUrl: Schema.String,
  bio: Schema.optional(Schema.String),
  facts: Schema.Array(ExtractedFact),
  rawData: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
});

// Legacy alias for backwards compatibility during migration
export const XUser = Creator;

export const JudgeResult = Schema.Struct({
  score: Schema.Number,
  justification: Schema.String,
  confidence: Schema.Literal("high", "medium", "low"),
  mismatch_fields: Schema.Array(Schema.String),
});

export const SearchCreatorsResult = Schema.Struct({
  creators: Schema.Array(ContentCreator),
});

export const ParserResult = Schema.Struct({
  status: Schema.Literal("needs_clarification", "complete"),
  // Present when status is "needs_clarification"
  questions: Schema.optional(Schema.Array(Schema.String)),
  // Present when status is "complete"
  platform: Schema.optional(Platform),
  compatibility_string: Schema.optional(Schema.String),
  // User facts extracted from conversation
  user_facts: Schema.optional(Schema.Array(ExtractedFact)),
});

export const DeepSearchConfig = Schema.Struct({
  scoreThreshold: Schema.Number,
  maxSearchLoops: Schema.Number,
  usersPerSearch: Schema.Number,
});

export const DeepSearchResult = Schema.Union(
  Schema.Struct({
    status: Schema.Literal("success"),
    qualifiedUsers: Schema.Array(Schema.Struct({ user: XUser, score: JudgeResult })),
    totalSearched: Schema.Number,
    loopsExecuted: Schema.Number,
    userFacts: Schema.Array(ExtractedFact),
  }),
  Schema.Struct({
    status: Schema.Literal("exhausted"),
    qualifiedUsers: Schema.Array(Schema.Struct({ user: XUser, score: JudgeResult })),
    totalSearched: Schema.Number,
    loopsExecuted: Schema.Number,
    userFacts: Schema.Array(ExtractedFact),
  }),
  Schema.Struct({
    status: Schema.Literal("impossible_criteria"),
    suggestion: Schema.String,
    totalSearched: Schema.Number,
    loopsExecuted: Schema.Number,
  }),
  Schema.Struct({
    status: Schema.Literal("needs_clarification"),
    questions: Schema.Array(Schema.String),
  })
);

// Knowledge Graph Schemas
export const KnowledgeGraphEntityMetaData = Schema.Struct({
  weight: Schema.Number,
  last_updated: Schema.Number,
  entity_type: Schema.optional(Schema.String),
});

export const KnowledgeGraphEntity = Schema.Struct({
  content: Schema.String,
  meta_data: KnowledgeGraphEntityMetaData,
});

export const KnowledgeGraphRelationshipMetaData = Schema.Struct({
  weight: Schema.Number,
  last_updated: Schema.Number,
  relationship_type: Schema.optional(Schema.String),
});

export const KnowledgeGraphRelationship = Schema.Struct({
  tail_vertex: Schema.String,
  head_vertex: Schema.String,
  content: Schema.String,
  meta_data: KnowledgeGraphRelationshipMetaData,
});

export const KnowledgeGraphUpdate = Schema.Struct({
  entities: Schema.Array(KnowledgeGraphEntity),
  relationships: Schema.Array(KnowledgeGraphRelationship),
});

// Article Chat Response - wrapper schema for structured output
export const ArticleChatResponse = Schema.Struct({
  response: Schema.String,
  knowledge_update: Schema.Struct({
    entities: Schema.Array(KnowledgeGraphEntity),
    relationships: Schema.Array(KnowledgeGraphRelationship),
  }),
});

// Knowledge Graph Query Result
export const KnowledgeGraphVertex = Schema.Struct({
  content: Schema.String,
  weight: Schema.Number,
  hops: Schema.Number,
  entity_type: Schema.optional(Schema.String),
});

export const KnowledgeGraphEdge = Schema.Struct({
  from: Schema.String,
  to: Schema.String,
  relationship: Schema.String,
});

export const KnowledgeGraphSubgraph = Schema.Struct({
  vertices: Schema.Array(KnowledgeGraphVertex),
  edges: Schema.Array(KnowledgeGraphEdge),
});

export type Platform = typeof Platform.Type;
export type ContentCreator = typeof ContentCreator.Type;
export type XHandle = typeof XHandle.Type; // Legacy alias
export type ExtractedFact = typeof ExtractedFact.Type;
export type FootprintResult = typeof FootprintResult.Type;
export type Creator = typeof Creator.Type;
export type XUser = typeof XUser.Type; // Legacy alias
export type JudgeResult = typeof JudgeResult.Type;
export type SearchCreatorsResult = typeof SearchCreatorsResult.Type;
export type ParserResult = typeof ParserResult.Type;
export type DeepSearchConfig = typeof DeepSearchConfig.Type;
export type DeepSearchResult = typeof DeepSearchResult.Type;
export type KnowledgeGraphEntityMetaData =
  typeof KnowledgeGraphEntityMetaData.Type;
export type KnowledgeGraphEntity = typeof KnowledgeGraphEntity.Type;
export type KnowledgeGraphRelationshipMetaData =
  typeof KnowledgeGraphRelationshipMetaData.Type;
export type KnowledgeGraphRelationship =
  typeof KnowledgeGraphRelationship.Type;
export type KnowledgeGraphUpdate = typeof KnowledgeGraphUpdate.Type;
export type ArticleChatResponse = typeof ArticleChatResponse.Type;
export type KnowledgeGraphVertex = typeof KnowledgeGraphVertex.Type;
export type KnowledgeGraphEdge = typeof KnowledgeGraphEdge.Type;
export type KnowledgeGraphSubgraph = typeof KnowledgeGraphSubgraph.Type;

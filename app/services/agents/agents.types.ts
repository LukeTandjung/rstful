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
  input: string;
  model: string;
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

export const ChemistryCriteria = Schema.Struct({
  epistemic_architecture: Schema.Struct({
    primary_mode: Schema.String, // "first_principles" | "empirical" | "narrative" | "dialectical" | "intuitive"
    evidence_hierarchy: Schema.Array(Schema.String),
    certainty_stance: Schema.String, // "seeking closure" | "embracing ambiguity" | "epistemic humility" | "radical skepticism"
    knowledge_model: Schema.String, // "monolithic truth" | "perspectival shards" | "socially constructed" | "pragmatic instrument"
  }),
  value_hierarchy: Schema.Struct({
    primary_good: Schema.String,
    non_negotiables: Schema.Array(Schema.String),
    typical_tradeoffs: Schema.String,
    moral_foundations: Schema.Struct({
      care_vs_harm: Schema.Number,
      fairness_vs_cheating: Schema.Number,
      loyalty_vs_betrayal: Schema.Number,
      authority_vs_subversion: Schema.Number,
      sanctity_vs_degradation: Schema.Number,
      liberty_vs_oppression: Schema.Number,
    }),
  }),
  cognitive_fingerprint: Schema.Struct({
    reasoning_pattern: Schema.String, // "deductive reduction" | "analogical mapping" | "constraint propagation" | "pattern synthesis"
    abstraction_level: Schema.String, // "concrete operations" | "systems thinking" | "meta-theoretic" | "ontological"
    recurrent_metaphors: Schema.Array(Schema.String),
    mental_toolkit: Schema.Array(Schema.String),
  }),
  temporal_orientation: Schema.Struct({
    past_weight: Schema.Number,
    present_weight: Schema.Number,
    future_weight: Schema.Number,
    change_velocity: Schema.String, // "revolutionary" | "evolutionary" | "conservative" | "cyclical"
  }),
  aspirational_vector: Schema.Struct({
    target_state: Schema.String,
    utopia_distance: Schema.Number,
    action_orientation: Schema.String, // "theory" | "praxis" | "propaganda" | "community-building"
  }),
  affective_signature: Schema.Struct({
    emotional_register: Schema.String, // "playful irreverence" | "grave responsibility" | "earnest optimism" | "detached analysis"
    energy_level: Schema.String, // "intense" | "measured" | "calm" | "urgent"
    conflict_stance: Schema.String, // "confrontational" | "conciliatory" | "avoidant" | "dialectical"
  }),
  communication_geometry: Schema.Struct({
    density: Schema.String, // "terse aphorisms" | "dense paragraphs" | "exploratory threads"
    formality: Schema.String, // "academic" | "conversational" | "technical slang" | "poetic"
    audience_assumption: Schema.String, // "peer expert" | "educated layperson" | "student" | "adversary"
  }),
  edge_or_center: Schema.Struct({
    contrarian_score: Schema.Number,
    orthodoxy_alignment: Schema.String, // "dissident" | "reformer" | "insider" | "establishment"
    risk_tolerance: Schema.String, // "revolutionary" | "experimental" | "cautious" | "conservative"
  }),
});

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

export const FootprintResult = Schema.Struct({
  skip: Schema.Boolean,
  // Present when skip is true
  reason: Schema.optional(Schema.String),
  // Present when skip is false
  footprint: Schema.optional(ChemistryCriteria),
});

export const Creator = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  platform: Platform,
  profileUrl: Schema.String,
  bio: Schema.optional(Schema.String),
  footprint: ChemistryCriteria,
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
  chemistry_criteria: Schema.optional(ChemistryCriteria),
});

export const StoredChemistryCriteria = Schema.Struct({
  userId: Schema.String,
  criteria: ChemistryCriteria,
  createdAt: Schema.Number,
  updatedAt: Schema.Number,
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
    chemistryCriteria: ChemistryCriteria,
  }),
  Schema.Struct({
    status: Schema.Literal("exhausted"),
    qualifiedUsers: Schema.Array(Schema.Struct({ user: XUser, score: JudgeResult })),
    totalSearched: Schema.Number,
    loopsExecuted: Schema.Number,
    chemistryCriteria: ChemistryCriteria,
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

export type ChemistryCriteria = typeof ChemistryCriteria.Type;
export type Platform = typeof Platform.Type;
export type ContentCreator = typeof ContentCreator.Type;
export type XHandle = typeof XHandle.Type; // Legacy alias
export type FootprintResult = typeof FootprintResult.Type;
export type Creator = typeof Creator.Type;
export type XUser = typeof XUser.Type; // Legacy alias
export type JudgeResult = typeof JudgeResult.Type;
export type SearchCreatorsResult = typeof SearchCreatorsResult.Type;
export type ParserResult = typeof ParserResult.Type;
export type StoredChemistryCriteria = typeof StoredChemistryCriteria.Type;
export type DeepSearchConfig = typeof DeepSearchConfig.Type;
export type DeepSearchResult = typeof DeepSearchResult.Type;

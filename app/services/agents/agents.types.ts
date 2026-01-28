import { Schema } from "effect";

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

export type KnowledgeGraphEntityMetaData =
  typeof KnowledgeGraphEntityMetaData.Type;
export type KnowledgeGraphEntity = typeof KnowledgeGraphEntity.Type;
export type KnowledgeGraphRelationshipMetaData =
  typeof KnowledgeGraphRelationshipMetaData.Type;
export type KnowledgeGraphRelationship =
  typeof KnowledgeGraphRelationship.Type;
export type KnowledgeGraphUpdate = typeof KnowledgeGraphUpdate.Type;
export type KnowledgeGraphVertex = typeof KnowledgeGraphVertex.Type;
export type KnowledgeGraphEdge = typeof KnowledgeGraphEdge.Type;
export type KnowledgeGraphSubgraph = typeof KnowledgeGraphSubgraph.Type;

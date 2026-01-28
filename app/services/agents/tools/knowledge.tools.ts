import { Tool } from "@luketandjung/ariadne";
import { Schema } from "effect";
import type { Id, Doc } from "convex/_generated/dataModel";
import type {
  KnowledgeGraphUpdate,
  KnowledgeGraphSubgraph,
} from "../agents.types";
import {
  KnowledgeGraphEntity,
  KnowledgeGraphRelationship,
} from "../agents.types";

export const UpdateKnowledgeTool = Tool.make("UpdateKnowledge", {
  description:
    "Report discovered user preferences, interests, or thinking patterns revealed during conversation. Call this whenever you detect entities or relationships worth tracking about the user.",
  parameters: {
    entities: Schema.Array(KnowledgeGraphEntity),
    relationships: Schema.Array(KnowledgeGraphRelationship),
  },
  success: Schema.String,
  failure: Schema.String,
  failureMode: "return" as const,
});

/**
 * Convert weight (0-1) to a confidence qualifier
 */
function weightToQualifier(weight: number): string {
  if (weight >= 0.9) return "strongly";
  if (weight >= 0.7) return "likely";
  if (weight >= 0.5) return "possibly";
  return "tentatively";
}

/**
 * Verbalize a knowledge graph subgraph into natural language sentences.
 * This is used to present graph data to LLMs in a more natural format.
 */
export function verbalizeGraph(subgraph: KnowledgeGraphSubgraph): Array<string> {
  const sentences: Array<string> = [];

  // Verbalize vertices as entity statements
  for (const vertex of subgraph.vertices) {
    const qualifier = weightToQualifier(vertex.weight);
    const typePrefix = vertex.entity_type ? `[${vertex.entity_type}] ` : "";
    sentences.push(`${typePrefix}${qualifier}: ${vertex.content}`);
  }

  // Verbalize edges as relationship statements
  for (const edge of subgraph.edges) {
    sentences.push(`${edge.from} → ${edge.relationship} → ${edge.to}`);
  }

  return sentences;
}

/**
 * Verbalize graph to a single formatted string block for prompts
 */
export function verbalizeGraphForPrompt(
  subgraph: KnowledgeGraphSubgraph,
  label: string = "Known facts",
): string {
  const sentences = verbalizeGraph(subgraph);
  if (sentences.length === 0) {
    return "";
  }
  return `<${label.toLowerCase().replace(/\s+/g, "_")}>\n${sentences.join("\n")}\n</${label.toLowerCase().replace(/\s+/g, "_")}>`;
}

export interface KnowledgeGraphToolDependencies {
  createEmbedding: (text: string) => Promise<Array<number>>;

  searchVertices: (args: {
    user_id: Id<"users">;
    embedding: Array<number>;
    limit: number;
    threshold: number;
  }) => Promise<Array<Doc<"user_knowledge_vertex"> & { _score: number }>>;

  upsertVertex: (args: {
    user_id: Id<"users">;
    content: string;
    embedding: Array<number>;
    meta_data: {
      weight: number;
      last_updated: bigint;
      entity_type?: string;
    };
    existing_id?: Id<"user_knowledge_vertex">;
  }) => Promise<Id<"user_knowledge_vertex">>;

  upsertEdge: (args: {
    user_id: Id<"users">;
    tail_vertex: Id<"user_knowledge_vertex">;
    head_vertex: Id<"user_knowledge_vertex">;
    content: string;
    embedding: Array<number>;
    meta_data: {
      weight: number;
      last_updated: bigint;
      relationship_type?: string;
    };
    existing_id?: Id<"user_knowledge_edge">;
  }) => Promise<Id<"user_knowledge_edge">>;

  getEdgesByVertex: (args: {
    vertex_id: Id<"user_knowledge_vertex">;
    direction: "outgoing" | "incoming" | "both";
  }) => Promise<Array<Doc<"user_knowledge_edge">>>;

  getVerticesByIds: (args: {
    vertex_ids: Array<Id<"user_knowledge_vertex">>;
  }) => Promise<Array<Doc<"user_knowledge_vertex"> | null>>;
}

export function createKnowledgeGraphTools(
  userId: Id<"users">,
  deps: KnowledgeGraphToolDependencies,
) {
  async function update_knowledge_graph(
    update: KnowledgeGraphUpdate,
  ): Promise<string> {
    const now = BigInt(Date.now());
    const entityMap = new Map<string, Id<"user_knowledge_vertex">>();

    // Process entities with entity resolution
    for (const entity of update.entities) {
      const embedding = await deps.createEmbedding(entity.content);

      // Search for similar existing entities (threshold 0.9)
      const similar = await deps.searchVertices({
        user_id: userId,
        embedding,
        limit: 1,
        threshold: 0.9,
      });

      const existingId = similar.length > 0 ? similar[0]._id : undefined;

      const meta_data: {
        weight: number;
        last_updated: bigint;
        entity_type?: string;
      } = {
        weight: entity.meta_data.weight,
        last_updated: now,
      };
      if (entity.meta_data.entity_type !== undefined) {
        meta_data.entity_type = entity.meta_data.entity_type;
      }

      const upsertArgs: {
        user_id: Id<"users">;
        content: string;
        embedding: Array<number>;
        meta_data: { weight: number; last_updated: bigint; entity_type?: string };
        existing_id?: Id<"user_knowledge_vertex">;
      } = {
        user_id: userId,
        content: entity.content,
        embedding,
        meta_data,
      };
      if (existingId !== undefined) {
        upsertArgs.existing_id = existingId;
      }
      const vertexId = await deps.upsertVertex(upsertArgs);

      entityMap.set(entity.content, vertexId);
    }

    // Process relationships
    for (const rel of update.relationships) {
      // Resolve vertices by content (first check our map, then search)
      let tailId = entityMap.get(rel.tail_vertex);
      let headId = entityMap.get(rel.head_vertex);

      if (!tailId) {
        const tailEmbed = await deps.createEmbedding(rel.tail_vertex);
        const tailSearch = await deps.searchVertices({
          user_id: userId,
          embedding: tailEmbed,
          limit: 1,
          threshold: 0.9,
        });
        if (tailSearch.length > 0) {
          tailId = tailSearch[0]._id;
        } else {
          // Create new vertex for unknown entity
          tailId = await deps.upsertVertex({
            user_id: userId,
            content: rel.tail_vertex,
            embedding: tailEmbed,
            meta_data: { weight: 0.5, last_updated: now },
          });
        }
      }

      if (!headId) {
        const headEmbed = await deps.createEmbedding(rel.head_vertex);
        const headSearch = await deps.searchVertices({
          user_id: userId,
          embedding: headEmbed,
          limit: 1,
          threshold: 0.9,
        });
        if (headSearch.length > 0) {
          headId = headSearch[0]._id;
        } else {
          headId = await deps.upsertVertex({
            user_id: userId,
            content: rel.head_vertex,
            embedding: headEmbed,
            meta_data: { weight: 0.5, last_updated: now },
          });
        }
      }

      const relEmbedding = await deps.createEmbedding(rel.content);
      const edgeMeta: {
        weight: number;
        last_updated: bigint;
        relationship_type?: string;
      } = {
        weight: rel.meta_data.weight,
        last_updated: now,
      };
      if (rel.meta_data.relationship_type !== undefined) {
        edgeMeta.relationship_type = rel.meta_data.relationship_type;
      }
      await deps.upsertEdge({
        user_id: userId,
        tail_vertex: tailId,
        head_vertex: headId,
        content: rel.content,
        embedding: relEmbedding,
        meta_data: edgeMeta,
      });
    }

    return `Updated knowledge graph: ${update.entities.length} entities, ${update.relationships.length} relationships`;
  }

  async function query_knowledge_graph(
    query: string,
  ): Promise<KnowledgeGraphSubgraph> {
    const queryEmbedding = await deps.createEmbedding(query);

    // Initial vector search (threshold 0.7)
    const seedVertices = await deps.searchVertices({
      user_id: userId,
      embedding: queryEmbedding,
      limit: 10,
      threshold: 0.7,
    });

    if (seedVertices.length === 0) {
      return { vertices: [], edges: [] };
    }

    const visitedVertices = new Map<
      string,
      { content: string; weight: number; hops: number; entity_type?: string }
    >();
    const collectedEdges: Array<{
      from: string;
      to: string;
      relationship: string;
    }> = [];

    // Add seed vertices (hop 0)
    for (const v of seedVertices) {
      const vertexData: { content: string; weight: number; hops: number; entity_type?: string } = {
        content: v.content,
        weight: v.meta_data.weight,
        hops: 0,
      };
      if (v.meta_data.entity_type !== undefined) {
        vertexData.entity_type = v.meta_data.entity_type;
      }
      visitedVertices.set(v._id, vertexData);
    }

    // Hop 1 and 2: Get edges from vertices
    let currentVertexIds = seedVertices.map((v) => v._id);

    for (let hop = 1; hop <= 2; hop++) {
      const nextVertexIds: Array<Id<"user_knowledge_vertex">> = [];

      for (const vertexId of currentVertexIds) {
        const edges = await deps.getEdgesByVertex({
          vertex_id: vertexId,
          direction: "both",
        });

        for (const edge of edges) {
          const fromVertex = visitedVertices.get(edge.tail_vertex);
          const toVertex = visitedVertices.get(edge.head_vertex);

          // Collect edge info
          collectedEdges.push({
            from: fromVertex?.content || edge.tail_vertex,
            to: toVertex?.content || edge.head_vertex,
            relationship: edge.content,
          });

          // Queue adjacent vertices for next hop
          const adjacentId =
            edge.tail_vertex === vertexId
              ? edge.head_vertex
              : edge.tail_vertex;

          if (!visitedVertices.has(adjacentId)) {
            nextVertexIds.push(adjacentId);
          }
        }
      }

      // Fetch and add new vertices
      if (nextVertexIds.length > 0) {
        const newVertices = await deps.getVerticesByIds({
          vertex_ids: nextVertexIds,
        });
        for (const v of newVertices) {
          if (v && !visitedVertices.has(v._id)) {
            const vertexData: { content: string; weight: number; hops: number; entity_type?: string } = {
              content: v.content,
              weight: v.meta_data.weight,
              hops: hop,
            };
            if (v.meta_data.entity_type !== undefined) {
              vertexData.entity_type = v.meta_data.entity_type;
            }
            visitedVertices.set(v._id, vertexData);
          }
        }
        currentVertexIds = nextVertexIds;
      } else {
        break;
      }
    }

    return {
      vertices: Array.from(visitedVertices.values()),
      edges: collectedEdges,
    };
  }

  return { update_knowledge_graph, query_knowledge_graph };
}

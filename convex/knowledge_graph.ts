import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Query to get vertex by ID
export const get_vertex = query({
  args: { vertex_id: v.id("user_knowledge_vertex") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.vertex_id);
  },
});

// Internal query for actions to call
export const get_vertex_internal = internalQuery({
  args: { vertex_id: v.id("user_knowledge_vertex") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.vertex_id);
  },
});

// Query to get vertices by IDs (batch)
export const get_vertices_by_ids = query({
  args: { vertex_ids: v.array(v.id("user_knowledge_vertex")) },
  handler: async (ctx, args) => {
    return await Promise.all(args.vertex_ids.map((id) => ctx.db.get(id)));
  },
});

// Internal version for actions
export const get_vertices_by_ids_internal = internalQuery({
  args: { vertex_ids: v.array(v.id("user_knowledge_vertex")) },
  handler: async (ctx, args) => {
    return await Promise.all(args.vertex_ids.map((id) => ctx.db.get(id)));
  },
});

// Query edges by vertex (for graph traversal)
export const get_edges_by_vertex = query({
  args: {
    vertex_id: v.id("user_knowledge_vertex"),
    direction: v.union(
      v.literal("outgoing"),
      v.literal("incoming"),
      v.literal("both"),
    ),
  },
  handler: async (ctx, args) => {
    const results = [];
    if (args.direction === "outgoing" || args.direction === "both") {
      const outgoing = await ctx.db
        .query("user_knowledge_edge")
        .withIndex("by_tail_vertex", (q) =>
          q.eq("tail_vertex", args.vertex_id),
        )
        .collect();
      results.push(...outgoing);
    }
    if (args.direction === "incoming" || args.direction === "both") {
      const incoming = await ctx.db
        .query("user_knowledge_edge")
        .withIndex("by_head_vertex", (q) =>
          q.eq("head_vertex", args.vertex_id),
        )
        .collect();
      results.push(...incoming);
    }
    return results;
  },
});

// Internal version for actions
export const get_edges_by_vertex_internal = internalQuery({
  args: {
    vertex_id: v.id("user_knowledge_vertex"),
    direction: v.union(
      v.literal("outgoing"),
      v.literal("incoming"),
      v.literal("both"),
    ),
  },
  handler: async (ctx, args) => {
    const results = [];
    if (args.direction === "outgoing" || args.direction === "both") {
      const outgoing = await ctx.db
        .query("user_knowledge_edge")
        .withIndex("by_tail_vertex", (q) =>
          q.eq("tail_vertex", args.vertex_id),
        )
        .collect();
      results.push(...outgoing);
    }
    if (args.direction === "incoming" || args.direction === "both") {
      const incoming = await ctx.db
        .query("user_knowledge_edge")
        .withIndex("by_head_vertex", (q) =>
          q.eq("head_vertex", args.vertex_id),
        )
        .collect();
      results.push(...incoming);
    }
    return results;
  },
});

// Internal mutation to upsert vertex
export const upsert_vertex = internalMutation({
  args: {
    user_id: v.id("users"),
    content: v.string(),
    embedding: v.array(v.float64()),
    meta_data: v.object({
      weight: v.number(),
      last_updated: v.int64(),
      entity_type: v.optional(v.string()),
    }),
    existing_id: v.optional(v.id("user_knowledge_vertex")),
  },
  handler: async (ctx, args) => {
    if (args.existing_id) {
      await ctx.db.patch(args.existing_id, {
        content: args.content,
        embedding: args.embedding,
        meta_data: args.meta_data,
      });
      return args.existing_id;
    }
    return await ctx.db.insert("user_knowledge_vertex", {
      user_id: args.user_id,
      content: args.content,
      embedding: args.embedding,
      meta_data: args.meta_data,
    });
  },
});

// Internal mutation to upsert edge
export const upsert_edge = internalMutation({
  args: {
    user_id: v.id("users"),
    tail_vertex: v.id("user_knowledge_vertex"),
    head_vertex: v.id("user_knowledge_vertex"),
    content: v.string(),
    embedding: v.array(v.float64()),
    meta_data: v.object({
      weight: v.number(),
      last_updated: v.int64(),
      relationship_type: v.optional(v.string()),
    }),
    existing_id: v.optional(v.id("user_knowledge_edge")),
  },
  handler: async (ctx, args) => {
    if (args.existing_id) {
      await ctx.db.patch(args.existing_id, {
        content: args.content,
        embedding: args.embedding,
        meta_data: args.meta_data,
      });
      return args.existing_id;
    }
    return await ctx.db.insert("user_knowledge_edge", {
      user_id: args.user_id,
      tail_vertex: args.tail_vertex,
      head_vertex: args.head_vertex,
      content: args.content,
      embedding: args.embedding,
      meta_data: args.meta_data,
    });
  },
});

// Vector search action for vertices
export const search_vertices = action({
  args: {
    user_id: v.id("users"),
    embedding: v.array(v.float64()),
    limit: v.number(),
    threshold: v.number(),
  },
  handler: async (ctx, args): Promise<Array<{
    _id: Id<"user_knowledge_vertex">;
    _creationTime: number;
    user_id: Id<"users">;
    content: string;
    embedding: Array<number>;
    meta_data: {
      weight: number;
      last_updated: bigint;
      entity_type?: string;
    };
    _score: number;
  }>> => {
    const results = await ctx.vectorSearch(
      "user_knowledge_vertex",
      "by_embedding",
      {
        vector: args.embedding,
        limit: args.limit,
        filter: (q) => q.eq("user_id", args.user_id),
      },
    );

    // Filter by threshold and fetch full documents
    const filtered = results.filter((r) => r._score >= args.threshold);
    const vertices: Array<{
      _id: Id<"user_knowledge_vertex">;
      _creationTime: number;
      user_id: Id<"users">;
      content: string;
      embedding: Array<number>;
      meta_data: {
        weight: number;
        last_updated: bigint;
        entity_type?: string;
      };
      _score: number;
    } | null> = await Promise.all(
      filtered.map(async (r): Promise<{
        _id: Id<"user_knowledge_vertex">;
        _creationTime: number;
        user_id: Id<"users">;
        content: string;
        embedding: Array<number>;
        meta_data: {
          weight: number;
          last_updated: bigint;
          entity_type?: string;
        };
        _score: number;
      } | null> => {
        const doc = await ctx.runQuery(
          internal.knowledge_graph.get_vertex_internal,
          {
            vertex_id: r._id,
          },
        );
        return doc ? { ...doc, _score: r._score } : null;
      }),
    );
    return vertices.filter(
      (v): v is NonNullable<typeof v> => v !== null,
    );
  },
});

// Vector search action for edges (for relationship matching)
export const search_edges = action({
  args: {
    user_id: v.id("users"),
    embedding: v.array(v.float64()),
    limit: v.number(),
    threshold: v.number(),
  },
  handler: async (ctx, args) => {
    const results = await ctx.vectorSearch(
      "user_knowledge_edge",
      "by_embedding",
      {
        vector: args.embedding,
        limit: args.limit,
        filter: (q) => q.eq("user_id", args.user_id),
      },
    );

    // Filter by threshold
    return results.filter((r) => r._score >= args.threshold);
  },
});

// Get edge by ID (internal)
export const get_edge_internal = internalQuery({
  args: { edge_id: v.id("user_knowledge_edge") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.edge_id);
  },
});

// Internal search for use in migrations
export const search_vertices_internal = internalAction({
  args: {
    user_id: v.id("users"),
    embedding: v.array(v.float64()),
    limit: v.number(),
    threshold: v.number(),
  },
  handler: async (ctx, args): Promise<Array<{
    _id: Id<"user_knowledge_vertex">;
    _score: number;
  }>> => {
    const results = await ctx.vectorSearch(
      "user_knowledge_vertex",
      "by_embedding",
      {
        vector: args.embedding,
        limit: args.limit,
        filter: (q) => q.eq("user_id", args.user_id),
      },
    );

    return results
      .filter((r) => r._score >= args.threshold)
      .map((r) => ({ _id: r._id, _score: r._score }));
  },
});

// Public action wrappers for mutations (callable from HTTP client)
export const upsert_vertex_action = action({
  args: {
    user_id: v.id("users"),
    content: v.string(),
    embedding: v.array(v.float64()),
    meta_data: v.object({
      weight: v.number(),
      last_updated: v.int64(),
      entity_type: v.optional(v.string()),
    }),
    existing_id: v.optional(v.id("user_knowledge_vertex")),
  },
  handler: async (ctx, args): Promise<Id<"user_knowledge_vertex">> => {
    return await ctx.runMutation(internal.knowledge_graph.upsert_vertex, args);
  },
});

export const upsert_edge_action = action({
  args: {
    user_id: v.id("users"),
    tail_vertex: v.id("user_knowledge_vertex"),
    head_vertex: v.id("user_knowledge_vertex"),
    content: v.string(),
    embedding: v.array(v.float64()),
    meta_data: v.object({
      weight: v.number(),
      last_updated: v.int64(),
      relationship_type: v.optional(v.string()),
    }),
    existing_id: v.optional(v.id("user_knowledge_edge")),
  },
  handler: async (ctx, args): Promise<Id<"user_knowledge_edge">> => {
    return await ctx.runMutation(internal.knowledge_graph.upsert_edge, args);
  },
});

import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  // Override users table to add required fields

  users: defineTable({
    name: v.string(),
    image: v.optional(v.id("_storage")),
    email: v.string(),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // TODO: Remove v.optional after running migrations:backfill_unread_counts
    total_unread_count: v.optional(v.int64()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  settings: defineTable({
    user_id: v.id("users"),
    // Token usage (resets each billing cycle)
    messages_used: v.number(),
    deep_search_used: v.number(),
    // Billing cycle tracking
    subscription_period_start: v.number(),
  }).index("by_user_id", ["user_id"]),

  rss_feed: defineTable({
    user_id: v.id("users"),
    name: v.string(),
    category: v.string(),
    url: v.string(),
    website_url: v.string(),
    status: v.string(),
    last_fetched: v.int64(),
    failure_count: v.optional(v.number()),
    // TODO: Remove v.optional after running migrations:backfill_unread_counts
    unread_count: v.optional(v.int64()),
  })
    .index("by_user_id", ["user_id"])
    .index("by_last_fetched", ["last_fetched"]),

  saved_content: defineTable({
    user_id: v.id("users"),
    rss_feed_id: v.optional(v.id("rss_feed")),
    title: v.string(),
    description: v.optional(v.string()),
    content: v.string(),
    link: v.string(),
    pub_date: v.optional(v.int64()),
    author: v.optional(v.string()),
    embedding: v.optional(v.array(v.float64())),
  })
    .index("by_user_id", ["user_id"])
    .index("by_rss_feed_id", ["rss_feed_id"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["user_id"],
    }),

  cached_content: defineTable({
    user_id: v.id("users"),
    rss_feed_id: v.optional(v.id("rss_feed")),
    title: v.string(),
    description: v.optional(v.string()),
    content: v.string(),
    link: v.string(),
    pub_date: v.optional(v.int64()),
    is_read: v.boolean(),
    author: v.optional(v.string()),
    embedding: v.optional(v.array(v.float64())),
  })
    .index("by_user_id", ["user_id"])
    .index("by_rss_feed_id", ["rss_feed_id"])
    .index("by_link", ["link"])
    .index("by_user_id_pub_date", ["user_id", "pub_date"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["user_id"],
    }),

  group_chat: defineTable({
    name: v.string(),
    created_at: v.int64(),
    mode: v.union(
      v.literal("regular"),
      v.literal("deep_search"),
      v.literal("user"),
    ),
  }),

  group_chat_members: defineTable({
    group_chat_id: v.id("group_chat"),
    user_id: v.id("users"),
  })
    .index("by_group_chat_id", ["group_chat_id"])
    .index("by_user_id", ["user_id"]),

  message: defineTable({
    group_chat_id: v.id("group_chat"),
    sender_id: v.id("users"),
    content: v.string(),
    created_at: v.int64(),
    role: v.optional(v.union(v.literal("user"), v.literal("assistant"))),
  })
    .index("by_group_chat_id", ["group_chat_id"])
    .index("by_sender_id", ["sender_id"]),

  // Knowledge graph for persistent user memory
  user_knowledge_vertex: defineTable({
    user_id: v.id("users"),
    content: v.string(),
    embedding: v.array(v.float64()),
    meta_data: v.object({
      weight: v.number(),
      last_updated: v.int64(),
      entity_type: v.optional(v.string()),
    }),
  })
    .index("by_user_id", ["user_id"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["user_id"],
    }),

  user_knowledge_edge: defineTable({
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
  })
    .index("by_user_id", ["user_id"])
    .index("by_tail_vertex", ["tail_vertex"])
    .index("by_head_vertex", ["head_vertex"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["user_id"],
    }),
});

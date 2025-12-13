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
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  settings: defineTable({
    user_id: v.id("users"),
    auto_refresh_feed: v.boolean(),
    read_on_scroll: v.boolean(),
    show_unread_content: v.boolean(),
    open_new_tab: v.boolean(),
    show_full_article: v.boolean(),
  }).index("by_user_id", ["user_id"]),

  rss_feed: defineTable({
    user_id: v.id("users"),
    name: v.string(),
    category: v.string(),
    url: v.string(),
    status: v.string(),
    last_fetched: v.int64(),
    failure_count: v.optional(v.number()),
  }).index("by_user_id", ["user_id"]),

  saved_content: defineTable({
    user_id: v.id("users"),
    rss_feed_id: v.optional(v.id("rss_feed")),
    title: v.string(),
    description: v.optional(v.string()),
    content: v.string(),
    link: v.string(),
    pub_date: v.optional(v.int64()),
    is_read: v.boolean(),
    author: v.optional(v.string()),
  })
    .index("by_user_id", ["user_id"])
    .index("by_rss_feed_id", ["rss_feed_id"]),

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
  })
    .index("by_user_id", ["user_id"])
    .index("by_rss_feed_id", ["rss_feed_id"])
    .index("by_link", ["link"]),

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

  chemistry_embedding: defineTable({
    user_id: v.id("users"),
    created_at: v.int64(),
    updated_at: v.int64(),
    criteria: v.object({
      epistemic_architecture: v.object({
        primary_mode: v.string(),
        evidence_hierarchy: v.array(v.string()),
        certainty_stance: v.string(),
        knowledge_model: v.string(),
      }),
      value_hierarchy: v.object({
        primary_good: v.string(),
        non_negotiables: v.array(v.string()),
        typical_tradeoffs: v.string(),
        moral_foundations: v.object({
          care_vs_harm: v.number(),
          fairness_vs_cheating: v.number(),
          loyalty_vs_betrayal: v.number(),
          authority_vs_subversion: v.number(),
          sanctity_vs_degradation: v.number(),
          liberty_vs_oppression: v.number(),
        }),
      }),
      cognitive_fingerprint: v.object({
        reasoning_pattern: v.string(),
        abstraction_level: v.string(),
        recurrent_metaphors: v.array(v.string()),
        mental_toolkit: v.array(v.string()),
      }),
      temporal_orientation: v.object({
        past_weight: v.number(),
        present_weight: v.number(),
        future_weight: v.number(),
        change_velocity: v.string(),
      }),
      aspirational_vector: v.object({
        target_state: v.string(),
        utopia_distance: v.number(),
        action_orientation: v.string(),
      }),
      affective_signature: v.object({
        emotional_register: v.string(),
        energy_level: v.string(),
        conflict_stance: v.string(),
      }),
      communication_geometry: v.object({
        density: v.string(),
        formality: v.string(),
        audience_assumption: v.string(),
      }),
      edge_or_center: v.object({
        contrarian_score: v.number(),
        orthodoxy_alignment: v.string(),
        risk_tolerance: v.string(),
      }),
    }),
  }).index("by_user_id", ["user_id"]),
});

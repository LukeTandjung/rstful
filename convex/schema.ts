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
    category: v.string(),
    url: v.string(),
    status: v.string(),
    last_fetched: v.int64(),
  }).index("by_user_id", ["user_id"]),

  saved_content: defineTable({
    user_id: v.id("users"),
    content: v.string(),
    rss_feed_id: v.optional(v.id("rss_feed")),
  })
    .index("by_user_id", ["user_id"])
    .index("by_rss_feed_id", ["rss_feed_id"]),

  group_chat: defineTable({
    name: v.string(),
    created_at: v.int64(),
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
  })
    .index("by_group_chat_id", ["group_chat_id"])
    .index("by_sender_id", ["sender_id"]),
});

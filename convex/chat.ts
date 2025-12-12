import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get_or_create_ai_chat = mutation({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("group_chat_members")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
      .first();

    if (membership) {
      const chat = await ctx.db.get(membership.group_chat_id);
      if (chat && chat.name === "AI Assistant") {
        return membership.group_chat_id;
      }
    }

    const chatId = await ctx.db.insert("group_chat", {
      name: "AI Assistant",
      created_at: BigInt(Date.now()),
    });

    await ctx.db.insert("group_chat_members", {
      group_chat_id: chatId,
      user_id: args.user_id,
    });

    return chatId;
  },
});

export const get_messages = query({
  args: { group_chat_id: v.id("group_chat") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("message")
      .withIndex("by_group_chat_id", (q) => q.eq("group_chat_id", args.group_chat_id))
      .order("asc")
      .collect();
    return messages;
  },
});

export const send_message = mutation({
  args: {
    group_chat_id: v.id("group_chat"),
    sender_id: v.id("users"),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("message", {
      group_chat_id: args.group_chat_id,
      sender_id: args.sender_id,
      content: args.content,
      created_at: BigInt(Date.now()),
      role: args.role,
    });
    return messageId;
  },
});

export const update_message = mutation({
  args: {
    message_id: v.id("message"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.message_id, {
      content: args.content,
    });
    return args.message_id;
  },
});

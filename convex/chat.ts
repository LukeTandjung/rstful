import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const chatModeValidator = v.union(
  v.literal("regular"),
  v.literal("deep_search"),
  v.literal("user")
);

export const create_conversation = mutation({
  args: {
    user_id: v.id("users"),
    name: v.string(),
    mode: chatModeValidator,
  },
  handler: async (ctx, args) => {
    const chatId = await ctx.db.insert("group_chat", {
      name: args.name,
      created_at: BigInt(Date.now()),
      mode: args.mode,
    });

    await ctx.db.insert("group_chat_members", {
      group_chat_id: chatId,
      user_id: args.user_id,
    });

    return chatId;
  },
});

export const get_user_conversations = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("group_chat_members")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
      .collect();

    const conversations = await Promise.all(
      memberships.map(async (membership) => {
        const chat = await ctx.db.get(membership.group_chat_id);
        return chat;
      })
    );

    return conversations
      .filter((chat): chat is NonNullable<typeof chat> => chat !== null)
      .sort((a, b) => Number(b.created_at - a.created_at));
  },
});

export const delete_conversation = mutation({
  args: { group_chat_id: v.id("group_chat") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("message")
      .withIndex("by_group_chat_id", (q) => q.eq("group_chat_id", args.group_chat_id))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    const memberships = await ctx.db
      .query("group_chat_members")
      .withIndex("by_group_chat_id", (q) => q.eq("group_chat_id", args.group_chat_id))
      .collect();

    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    await ctx.db.delete(args.group_chat_id);
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

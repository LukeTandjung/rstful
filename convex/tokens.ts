import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const TOKEN_LIMITS = {
  MESSAGES: 1000,
};

export const getTokenBalance = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user_id", (q) => q.eq("user_id", userId))
      .unique();

    if (!settings) {
      return null;
    }

    return {
      messagesUsed: settings.messages_used,
      messagesRemaining: TOKEN_LIMITS.MESSAGES - settings.messages_used,
      messagesLimit: TOKEN_LIMITS.MESSAGES,
      subscriptionPeriodStart: settings.subscription_period_start,
    };
  },
});

export const deductMessageToken = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user_id", (q) => q.eq("user_id", userId))
      .unique();

    if (!settings) {
      throw new Error("No active subscription");
    }

    if (settings.messages_used >= TOKEN_LIMITS.MESSAGES) {
      throw new Error("Message token limit reached");
    }

    await ctx.db.patch(settings._id, {
      messages_used: settings.messages_used + 1,
    });

    return {
      messagesUsed: settings.messages_used + 1,
      messagesRemaining: TOKEN_LIMITS.MESSAGES - settings.messages_used - 1,
    };
  },
});

export const initializeUserTokens = internalMutation({
  args: {
    userId: v.string(),
    subscriptionPeriodStart: v.number(),
  },
  handler: async (ctx, args) => {
    const existingSettings = await ctx.db
      .query("settings")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId as any))
      .unique();

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, {
        messages_used: 0,
        subscription_period_start: args.subscriptionPeriodStart,
      });
    } else {
      await ctx.db.insert("settings", {
        user_id: args.userId as any,
        messages_used: 0,
        subscription_period_start: args.subscriptionPeriodStart,
      });
    }
  },
});

export const resetUserTokens = internalMutation({
  args: {
    userId: v.string(),
    newPeriodStart: v.number(),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId as any))
      .unique();

    if (!settings) {
      return;
    }

    if (args.newPeriodStart > settings.subscription_period_start) {
      await ctx.db.patch(settings._id, {
        messages_used: 0,
        subscription_period_start: args.newPeriodStart,
      });
    }
  },
});

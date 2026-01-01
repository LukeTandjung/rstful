import { Polar } from "@convex-dev/polar";
import { query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, components } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

type UserInfo = { userId: string; email: string };

export const polar = new Polar(components.polar, {
  getUserInfo: async (ctx): Promise<UserInfo> => {
    const user: Doc<"users"> | null = await ctx.runQuery(api.auth.currentUser);
    if (!user) {
      throw new Error("User not authenticated");
    }
    return {
      userId: user._id,
      email: user.email,
    };
  },
  products: {
    monthlySubscription: process.env.POLAR_PRODUCT_ID!,
  },
});

// Export API methods per https://www.convex.dev/components/polar
export const {
  generateCustomerPortalUrl,
  cancelCurrentSubscription,
  getConfiguredProducts,
  generateCheckoutLink,
} = polar.api();

// One-time sync action - run via: bunx convex run polar:syncProducts
export const syncProducts = action({
  args: {},
  handler: async (ctx) => {
    await polar.syncProducts(ctx);
  },
});

export const hasActiveSubscription = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    const subscription = await polar.getCurrentSubscription(ctx, {
      userId: userId,
    });

    return subscription !== null && subscription.status === "active";
  },
});

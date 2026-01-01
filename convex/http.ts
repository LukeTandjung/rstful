import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { polar } from "./polar";
import { internal } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

polar.registerRoutes(http, {
  onSubscriptionCreated: async (ctx, event) => {
    // The library stores userId in customer metadata, which may be embedded in the subscription
    const userId = (event.data.customer?.metadata?.userId ?? event.data.metadata?.userId) as string | undefined;
    if (!userId) {
      console.error("No userId found in customer or subscription metadata");
      console.error("Event data:", JSON.stringify(event.data, null, 2));
      return;
    }

    const periodStart = new Date(event.data.currentPeriodStart).getTime();
    await ctx.runMutation(internal.tokens.initializeUserTokens, {
      userId,
      subscriptionPeriodStart: periodStart,
    });
  },
  onSubscriptionUpdated: async (ctx, event) => {
    // The library stores userId in customer metadata, which may be embedded in the subscription
    const userId = (event.data.customer?.metadata?.userId ?? event.data.metadata?.userId) as string | undefined;
    if (!userId) {
      console.error("No userId found in customer or subscription metadata");
      console.error("Event data:", JSON.stringify(event.data, null, 2));
      return;
    }

    const periodStart = new Date(event.data.currentPeriodStart).getTime();
    await ctx.runMutation(internal.tokens.resetUserTokens, {
      userId,
      newPeriodStart: periodStart,
    });
  },
});

export default http;

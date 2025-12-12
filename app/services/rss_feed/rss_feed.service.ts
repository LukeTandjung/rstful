import { Effect, Context } from "effect";
import type { Id } from "convex/_generated/dataModel";
import { RssFeedMutationError, RssFeedValidationError } from "./rss_feed.errors";

export interface RssFeedDoc {
  _id: Id<"rss_feed">;
  _creationTime: number;
  user_id: Id<"users">;
  name: string;
  category: string;
  url: string;
  status: string;
  last_fetched: bigint;
  failure_count: number;
}

export interface FetchFeedsResult {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  message?: string;
}

export class RssFeedService extends Context.Tag("RssFeedService")<
  RssFeedService,
  {
    readonly create_rss_feed: (
      user_id: Id<"users">,
      name: string,
      category: string,
      url: string
    ) => Effect.Effect<Id<"rss_feed">, RssFeedMutationError | RssFeedValidationError>;

    readonly update_rss_feed: (
      rss_feed_id: Id<"rss_feed">,
      name: string,
      category: string,
      url: string
    ) => Effect.Effect<Id<"rss_feed">, RssFeedMutationError | RssFeedValidationError>;

    readonly delete_rss_feed: (
      rss_feed_id: Id<"rss_feed">
    ) => Effect.Effect<Id<"rss_feed">, RssFeedMutationError>;

    readonly fetch_feeds: (
      user_id: Id<"users">
    ) => Effect.Effect<FetchFeedsResult, RssFeedMutationError>;

    readonly refresh_feed: (
      feed_id: Id<"rss_feed">
    ) => Effect.Effect<{ success: boolean }, RssFeedMutationError>;
  }
>() {}

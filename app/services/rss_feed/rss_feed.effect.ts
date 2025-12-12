import { Effect, Layer, Match } from "effect";
import type { Id } from "convex/_generated/dataModel";
import { RssFeedService } from "./rss_feed.service";
import { RssFeedMutationError, RssFeedValidationError } from "./rss_feed.errors";

// Validation using Match for pattern matching
const validate_feed_inputs = (name: string, url: string, category: string) =>
  Match.value({ name: name.trim(), url: url.trim(), category: category.trim() }).pipe(
    Match.when(
      { name: (n) => n.length === 0 },
      () => Effect.fail(new RssFeedValidationError({ message: "Feed name cannot be empty" }))
    ),
    Match.when(
      { url: (u) => u.length === 0 },
      () => Effect.fail(new RssFeedValidationError({ message: "Feed URL cannot be empty" }))
    ),
    Match.when(
      { category: (c) => c.length === 0 },
      () => Effect.fail(new RssFeedValidationError({ message: "Category cannot be empty" }))
    ),
    Match.orElse((validated) => Effect.succeed(validated))
  );

// Create the service Layer for mutations and actions
export const make_rss_feed_service_live = (
  postRssFeedMutation: (args: { user_id: Id<"users">, name: string, category: string, url: string, status: string, last_fetched: bigint, failure_count?: number }) => Promise<Id<"rss_feed">>,
  putRssFeedMutation: (args: { rss_feed_id: Id<"rss_feed">, name: string, category: string, url: string }) => Promise<Id<"rss_feed">>,
  deleteRssFeedMutation: (args: { rss_feed_id: Id<"rss_feed"> }) => Promise<Id<"rss_feed">>,
  fetchUserFeedsAction: (args: { user_id: Id<"users"> }) => Promise<{ success: boolean; total: number; successful: number; failed: number; message?: string }>,
  refreshFeedAction: (args: { feed_id: Id<"rss_feed"> }) => Promise<{ success: boolean }>
) =>
  Layer.succeed(RssFeedService, {
    create_rss_feed: (user_id: Id<"users">, name: string, category: string, url: string) =>
      validate_feed_inputs(name, url, category).pipe(
        Effect.flatMap(({ name, url, category }) =>
          Effect.tryPromise({
            try: () => postRssFeedMutation({
              user_id,
              name,
              category,
              url,
              status: "active",
              last_fetched: BigInt(Date.now()),
              failure_count: 0,
            }),
            catch: (error) => new RssFeedMutationError({ message: String(error) }),
          })
        )
      ),

    update_rss_feed: (rss_feed_id: Id<"rss_feed">, name: string, category: string, url: string) =>
      validate_feed_inputs(name, url, category).pipe(
        Effect.flatMap(({ name, url, category }) =>
          Effect.tryPromise({
            try: () => putRssFeedMutation({ rss_feed_id, name, category, url }),
            catch: (error) => new RssFeedMutationError({ message: String(error) }),
          })
        )
      ),

    delete_rss_feed: (rss_feed_id: Id<"rss_feed">) =>
      Effect.tryPromise({
        try: () => deleteRssFeedMutation({ rss_feed_id }),
        catch: (error) => new RssFeedMutationError({ message: String(error) }),
      }),

    fetch_feeds: (user_id: Id<"users">) =>
      Effect.tryPromise({
        try: () => fetchUserFeedsAction({ user_id }),
        catch: (error) => new RssFeedMutationError({ message: String(error) }),
      }),

    refresh_feed: (feed_id: Id<"rss_feed">) =>
      Effect.tryPromise({
        try: () => refreshFeedAction({ feed_id }),
        catch: (error) => new RssFeedMutationError({ message: String(error) }),
      }),
  });

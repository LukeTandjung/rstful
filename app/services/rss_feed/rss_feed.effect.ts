import { Effect, Layer, Match } from "effect";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { RssFeedService } from "./rss_feed.service";
import { RssFeedQueryError, RssFeedMutationError, RssFeedValidationError } from "./rss_feed.errors";

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

// Create the service Layer
export const make_rss_feed_service_live = (
  queryFn: typeof useQuery,
  mutateFn: typeof useMutation
) =>
  Layer.succeed(RssFeedService, {
    get_rss_feeds: (user_id: Id<"users">) =>
      Effect.tryPromise({
        try: () => queryFn(api.rss_feed.api.get_rss_feed, { user_id }),
        catch: (error) => new RssFeedQueryError({ message: String(error) }),
      }),

    create_rss_feed: (user_id: Id<"users">, name: string, category: string, url: string) =>
      validate_feed_inputs(name, url, category).pipe(
        Effect.flatMap(({ name, url, category }) =>
          Effect.tryPromise({
            try: () => {
              const mutation = mutateFn(api.rss_feed.api.post_rss_feed);
              return mutation({
                user_id,
                name,
                category,
                url,
                status: "active",
                last_fetched: BigInt(Date.now()),
              });
            },
            catch: (error) => new RssFeedMutationError({ message: String(error) }),
          })
        )
      ),

    update_rss_feed: (rss_feed_id: Id<"rss_feed">, name: string, category: string, url: string) =>
      validate_feed_inputs(name, url, category).pipe(
        Effect.flatMap(({ name, url, category }) =>
          Effect.tryPromise({
            try: () => {
              const mutation = mutateFn(api.rss_feed.api.put_rss_feed);
              return mutation({ rss_feed_id, name, category, url });
            },
            catch: (error) => new RssFeedMutationError({ message: String(error) }),
          })
        )
      ),

    delete_rss_feed: (rss_feed_id: Id<"rss_feed">) =>
      Effect.tryPromise({
        try: () => {
          const mutation = mutateFn(api.rss_feed.api.delete_rss_feed);
          return mutation({ rss_feed_id });
        },
        catch: (error) => new RssFeedMutationError({ message: String(error) }),
      }),
  });

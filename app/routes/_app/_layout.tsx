import { useEffect, useRef } from "react";
import { Outlet, Navigate } from "react-router";
import { Separator } from "@base-ui-components/react/separator";
import { MenuBar } from "components";
import { Authenticated, Unauthenticated, AuthLoading, useQuery, useMutation, useAction } from "convex/react";
import { api } from "convex/_generated/api";
import { Effect } from "effect";
import { RssFeedService, make_rss_feed_service_live } from "services/rss_feed";

const FETCH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export default function Layout() {
  const viewer = useQuery(api.auth.currentUser);
  const user_id = viewer?._id;

  // Get Convex functions
  const postRssFeed = useMutation(api.rss_feed.post_rss_feed);
  const putRssFeed = useMutation(api.rss_feed.put_rss_feed);
  const deleteRssFeed = useMutation(api.rss_feed.delete_rss_feed);
  const fetchUserFeeds = useAction(api.rss_fetcher.fetch_user_feeds);
  const refreshFeed = useAction(api.rss_fetcher.fetch_single_feed_action);

  // Create the service Layer
  const RssFeedServiceLayer = make_rss_feed_service_live(
    postRssFeed,
    putRssFeed,
    deleteRssFeed,
    fetchUserFeeds,
    refreshFeed
  );

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    // Only set up fetching if user is authenticated
    if (!user_id) {
      return;
    }

    // Function to fetch feeds using Effect service
    const performFetch = () => {
      // Prevent concurrent fetches
      if (isFetchingRef.current) {
        console.log("Feed fetch already in progress, skipping...");
        return;
      }

      isFetchingRef.current = true;

      const program = RssFeedService.pipe(
        Effect.flatMap((service) => service.fetch_feeds(user_id)),
        Effect.tap((result) =>
          Effect.sync(() => {
            console.log("RSS feeds fetched:", result);
            isFetchingRef.current = false;
          })
        ),
        Effect.provide(RssFeedServiceLayer),
        Effect.catchAll((error) =>
          Effect.sync(() => {
            console.error("Failed to fetch RSS feeds:", error);
            isFetchingRef.current = false;
          })
        )
      );

      Effect.runPromise(program);
    };

    // Fetch immediately on mount (when user logs in or enters app)
    performFetch();

    // Set up interval to fetch every hour while user is active
    intervalRef.current = setInterval(performFetch, FETCH_INTERVAL_MS);

    // Cleanup: clear interval when component unmounts (user closes/leaves app)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user_id, RssFeedServiceLayer]);

  return (
    <>
      <AuthLoading>
        <div className="flex items-center justify-center h-screen w-full">
          <p>Loading...</p>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <Navigate to="/login" replace />
      </Unauthenticated>

      <Authenticated>
        <div className="flex flex-col gap-6 h-screen p-6 w-full">
          <MenuBar userName={viewer?.name} />
          <Separator className="w-full bg-border-unfocus h-0.5 shrink-0" />
          <Outlet />
        </div>
      </Authenticated>
    </>
  );
}

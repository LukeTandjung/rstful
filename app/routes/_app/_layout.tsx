import { useEffect, useRef, useState } from "react";
import { Outlet, Navigate } from "react-router";
import { MenuBar } from "components";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "convex/_generated/api";
import { Effect } from "effect";
import { RssFeedService, make_rss_feed_service_live } from "services/rss_feed";

const FETCH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export default function Layout() {
  const viewer = useQuery(api.auth.currentUser);
  const hasSubscription = useQuery(api.polar.hasActiveSubscription);
  const configuredProducts = useQuery(api.polar.getConfiguredProducts);
  const generateCheckoutLink = useAction(api.polar.generateCheckoutLink);
  const [isRedirectingToCheckout, setIsRedirectingToCheckout] = useState(false);
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
    refreshFeed,
  );

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  // Derived state for cleaner conditionals
  const isAuthenticated = viewer !== undefined && viewer !== null;
  const isEmailVerified = viewer?.emailVerificationTime != null;
  const productId = configuredProducts?.monthlySubscription?.id;
  const needsCheckoutRedirect =
    isAuthenticated &&
    isEmailVerified &&
    hasSubscription === false &&
    productId;
  const isReady =
    isAuthenticated && isEmailVerified && hasSubscription === true;

  // Redirect to checkout if authenticated, verified, but no subscription
  useEffect(() => {
    if (needsCheckoutRedirect && !isRedirectingToCheckout && productId) {
      setIsRedirectingToCheckout(true);
      generateCheckoutLink({
        productIds: [productId],
        origin: window.location.origin,
        successUrl: window.location.origin,
      })
        .then((result) => {
          if (result?.url) {
            window.location.href = result.url;
          }
        })
        .catch((err) => {
          console.error("Failed to generate checkout link:", err);
          setIsRedirectingToCheckout(false);
        });
    }
  }, [
    needsCheckoutRedirect,
    isRedirectingToCheckout,
    generateCheckoutLink,
    productId,
  ]);

  useEffect(() => {
    // Only set up fetching if user is fully ready (authenticated, verified, subscribed)
    if (!isReady || !user_id) {
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
          }),
        ),
        Effect.provide(RssFeedServiceLayer),
        Effect.catchAll((error) =>
          Effect.sync(() => {
            console.error("Failed to fetch RSS feeds:", error);
            isFetchingRef.current = false;
          }),
        ),
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
  }, [isReady, user_id, RssFeedServiceLayer]);

  // Loading state - waiting for auth
  if (viewer === undefined) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <p className="text-background">Loading...</p>
      </div>
    );
  }

  // Unauthenticated - redirect to login
  if (viewer === null) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to verify-email if email not verified
  if (!isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  // Show loading while checking subscription or redirecting to checkout
  if (hasSubscription === undefined || hasSubscription === false) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <p className="text-text">
          {isRedirectingToCheckout
            ? "Redirecting to checkout..."
            : "Loading..."}
        </p>
      </div>
    );
  }

  // User is authenticated, verified, and has subscription - show the app
  return (
    <div className="flex flex-col gap-6 h-screen p-6 w-full">
      <MenuBar />
      <Outlet />
    </div>
  );
}

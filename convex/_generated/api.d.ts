/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as auth_ResendOTPEmailVerification from "../auth/ResendOTPEmailVerification.js";
import type * as auth_ResendOTPPasswordReset from "../auth/ResendOTPPasswordReset.js";
import type * as cached_content from "../cached_content.js";
import type * as chat from "../chat.js";
import type * as chemistry_embedding from "../chemistry_embedding.js";
import type * as http from "../http.js";
import type * as rss_feed from "../rss_feed.js";
import type * as rss_fetcher from "../rss_fetcher.js";
import type * as saved_content from "../saved_content.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "auth/ResendOTPEmailVerification": typeof auth_ResendOTPEmailVerification;
  "auth/ResendOTPPasswordReset": typeof auth_ResendOTPPasswordReset;
  cached_content: typeof cached_content;
  chat: typeof chat;
  chemistry_embedding: typeof chemistry_embedding;
  http: typeof http;
  rss_feed: typeof rss_feed;
  rss_fetcher: typeof rss_fetcher;
  saved_content: typeof saved_content;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

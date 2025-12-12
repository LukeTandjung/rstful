import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import { XMLParser } from "fast-xml-parser";
import { api, internal } from "./_generated/api";

// Action to fetch RSS feeds (can make HTTP requests)
export const fetch_user_feeds = action({
  args: { user_id: v.id("users") },
  handler: async (ctx, args): Promise<{ success: boolean; total: number; successful: number; failed: number; message?: string }> => {
    // Get all RSS feeds for the user
    const feeds = await ctx.runQuery(api.rss_feed.get_rss_feed, {
      user_id: args.user_id,
    });

    if (feeds.length === 0) {
      return { success: true, total: 0, successful: 0, failed: 0, message: "No feeds to fetch" };
    }

    const results = await Promise.allSettled(
      feeds.map((feed: Doc<"rss_feed">) => fetch_single_feed(ctx, feed))
    );

    return {
      success: true,
      total: feeds.length,
      successful: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
    };
  },
});

// Action to fetch a single RSS feed
export const fetch_single_feed_action = action({
  args: { feed_id: v.id("rss_feed") },
  handler: async (ctx, args) => {
    // Get the feed
    const feed = await ctx.runQuery(api.rss_feed.get_rss_feed_by_id, {
      feed_id: args.feed_id,
    });

    if (!feed) {
      throw new Error("Feed not found");
    }

    await fetch_single_feed(ctx, feed);

    return { success: true };
  },
});

async function fetch_single_feed(
  ctx: any,
  feed: {
    _id: Id<"rss_feed">;
    user_id: Id<"users">;
    url: string;
    failure_count?: number;
  }
) {
  try {
    // Fetch the RSS feed XML
    const response = await fetch(feed.url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlText = await response.text();

    if (!xmlText || xmlText.trim() === "") {
      throw new Error("Empty RSS feed");
    }

    // Parse XML and extract articles
    const articles = parse_rss_xml(xmlText);

    // Filter out malformed articles (must have link and title)
    const valid_articles = articles.filter(
      (article) => article.link && article.title
    );

    // Store articles in cached_content (deduplication handled in mutation)
    const inserted_count = await ctx.runMutation(internal.rss_fetcher.store_cached_articles, {
      user_id: feed.user_id,
      rss_feed_id: feed._id,
      articles: valid_articles,
    });

    // Update feed status to active and reset failure count
    await ctx.runMutation(internal.rss_fetcher.update_feed_status, {
      rss_feed_id: feed._id,
      status: "active",
      failure_count: 0,
      last_fetched: BigInt(Date.now()),
    });

    return { success: true, articles_count: valid_articles.length };
  } catch (error) {
    // Increment failure count (default to 0 if undefined)
    const current_failure_count = feed.failure_count ?? 0;
    const new_failure_count = current_failure_count + 1;
    const new_status = new_failure_count >= 3 ? "error" : "inactive";

    await ctx.runMutation(internal.rss_fetcher.update_feed_status, {
      rss_feed_id: feed._id,
      status: new_status,
      failure_count: new_failure_count,
      last_fetched: BigInt(Date.now()),
    });

    throw error;
  }
}

// Internal mutation to store cached articles and clean up stale entries
export const store_cached_articles = internalMutation({
  args: {
    user_id: v.id("users"),
    rss_feed_id: v.id("rss_feed"),
    articles: v.array(
      v.object({
        link: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        content: v.string(),
        author: v.optional(v.string()),
        pub_date: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args): Promise<number> => {
    const currentLinks = new Set(args.articles.map((a) => a.link));

    // Get all existing cached articles for this feed
    const existingArticles = await ctx.db
      .query("cached_content")
      .withIndex("by_rss_feed_id", (q) => q.eq("rss_feed_id", args.rss_feed_id))
      .collect();

    // Delete articles no longer in the feed
    for (const existing of existingArticles) {
      if (!currentLinks.has(existing.link)) {
        await ctx.db.delete(existing._id);
      }
    }

    // Insert new articles
    let inserted_count = 0;
    const existingLinks = new Set(existingArticles.map((a) => a.link));

    for (const article of args.articles) {
      if (!existingLinks.has(article.link)) {
        await ctx.db.insert("cached_content", {
          user_id: args.user_id,
          rss_feed_id: args.rss_feed_id,
          link: article.link,
          title: article.title,
          ...(article.description && { description: article.description }),
          content: article.content,
          ...(article.author && { author: article.author }),
          ...(article.pub_date && { pub_date: BigInt(article.pub_date) }),
          is_read: false,
        });
        inserted_count++;
      }
    }

    return inserted_count;
  },
});

// Internal mutation to update feed status
export const update_feed_status = internalMutation({
  args: {
    rss_feed_id: v.id("rss_feed"),
    status: v.string(),
    failure_count: v.number(),
    last_fetched: v.int64(),
  },
  handler: async (ctx, args) => {
    const feed = await ctx.db.get(args.rss_feed_id);
    if (!feed) {
      throw new Error("Feed not found");
    }

    await ctx.db.patch(args.rss_feed_id, {
      status: args.status,
      failure_count: args.failure_count,
      last_fetched: args.last_fetched,
    });
  },
});

// RSS XML parser using fast-xml-parser
export function parse_rss_xml(xmlText: string): Array<{
  link: string;
  title: string;
  description?: string;
  content: string;
  author?: string;
  pub_date?: number;
}> {
  const articles: Array<{
    link: string;
    title: string;
    description?: string;
    content: string;
    author?: string;
    pub_date?: number;
  }> = [];

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });

    const parsed = parser.parse(xmlText);

    // Handle both RSS and Atom feeds
    let items: Array<any> = [];

    // RSS 2.0 format
    if (parsed.rss && parsed.rss.channel && parsed.rss.channel.item) {
      items = Array.isArray(parsed.rss.channel.item)
        ? parsed.rss.channel.item
        : [parsed.rss.channel.item];
    }
    // Atom format
    else if (parsed.feed && parsed.feed.entry) {
      items = Array.isArray(parsed.feed.entry)
        ? parsed.feed.entry
        : [parsed.feed.entry];
    }

    for (const item of items) {
      try {
        // Extract link (handle different formats)
        let link = "";
        if (item.link) {
          if (typeof item.link === "string") {
            link = item.link;
          } else if (item.link["@_href"]) {
            link = item.link["@_href"];
          }
        }

        if (!link || link.trim() === "") {
          continue; // Skip items without links
        }

        // Extract title, description, and content separately
        const title = item.title || "";
        const description = item.description || item.summary || "";

        // Try to get full content, fallback to description, then fallback message
        const fullContent = item["content:encoded"] || item.content || "";
        const content =
          fullContent ||
          description ||
          "This RSS feed does not show content. Click the link above to see the full content.";

        const author = item.author || item.creator || item["dc:creator"] || "";

        if (!title) {
          continue; // Skip items without title
        }

        // Extract publication date
        let pub_date: number | undefined;
        const pubDateStr = item.pubDate || item.published || item.updated;
        if (pubDateStr) {
          const date = new Date(pubDateStr);
          if (!isNaN(date.getTime())) {
            pub_date = date.getTime();
          }
        }

        articles.push({
          link: link.trim(),
          title,
          ...(description && { description }),
          content,
          ...(author && { author }),
          ...(pub_date && { pub_date }),
        });
      } catch (error) {
        // Skip malformed articles
        continue;
      }
    }
  } catch (error) {
    // Return empty array if XML is completely malformed
    return [];
  }

  return articles;
}

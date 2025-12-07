import { Effect, pipe } from "effect";
import type { RssFeed, RssArticle } from "types";

// RSS Feed Service using Effect-TS
export class RssService {
  // Fetch feeds with Effect
  static fetchFeeds = Effect.gen(function* () {
    // Simulated fetch - in production, this would call an API
    yield* Effect.sleep("100 millis");
    
    const feeds: RssFeed[] = [
      {
        id: "1",
        name: "Hacker News",
        url: "https://news.ycombinator.com/rss",
        category: "Tech",
        unreadCount: 12,
        status: "active",
        lastFetched: new Date(),
      },
      {
        id: "2",
        name: "TechCrunch",
        url: "https://techcrunch.com/feed/",
        category: "Tech",
        unreadCount: 8,
        status: "active",
        lastFetched: new Date(),
      },
      {
        id: "3",
        name: "The Verge",
        url: "https://www.theverge.com/rss/index.xml",
        category: "Tech",
        unreadCount: 5,
        status: "active",
        lastFetched: new Date(),
      },
      {
        id: "4",
        name: "Ars Technica",
        url: "https://feeds.arstechnica.com/arstechnica/index",
        category: "Tech",
        unreadCount: 3,
        status: "error",
        lastFetched: new Date(Date.now() - 86400000),
      },
      {
        id: "5",
        name: "MIT Technology Review",
        url: "https://www.technologyreview.com/feed/",
        category: "Science",
        unreadCount: 7,
        status: "active",
        lastFetched: new Date(),
      },
    ];
    
    return feeds;
  });

  // Fetch articles for a feed
  static fetchArticles = (feedId: string) =>
    Effect.gen(function* () {
      yield* Effect.sleep("150 millis");
      
      const articles: RssArticle[] = Array.from({ length: 15 }, (_, i) => ({
        id: `${feedId}-article-${i}`,
        feedId,
        feedName: "Sample Feed",
        title: `Article ${i + 1}: Understanding Effect-TS and Functional Programming`,
        link: `https://example.com/article-${i}`,
        description: `This is a sample article description that provides a brief overview of the content. It discusses various aspects of modern software development and best practices.`,
        content: `<p>Full article content goes here. This would typically contain the complete HTML content of the article.</p>`,
        author: i % 3 === 0 ? "John Doe" : i % 3 === 1 ? "Jane Smith" : undefined,
        pubDate: new Date(Date.now() - i * 3600000),
        isRead: i < 5,
        isStarred: i % 4 === 0,
      }));
      
      return articles;
    });

  // Refresh a specific feed
  static refreshFeed = (feedId: string) =>
    Effect.gen(function* () {
      yield* Effect.sleep("200 millis");
      return { success: true, feedId };
    });

  // Mark article as read
  static markAsRead = (articleId: string) =>
    Effect.gen(function* () {
      yield* Effect.sleep("50 millis");
      return { success: true, articleId };
    });

  // Toggle star on article
  static toggleStar = (articleId: string) =>
    Effect.gen(function* () {
      yield* Effect.sleep("50 millis");
      return { success: true, articleId };
    });

  // Add new feed
  static addFeed = (url: string, name: string, category: string) =>
    Effect.gen(function* () {
      yield* Effect.sleep("300 millis");
      
      const newFeed: RssFeed = {
        id: Date.now().toString(),
        name,
        url,
        category,
        unreadCount: 0,
        status: "loading",
        lastFetched: new Date(),
      };
      
      return newFeed;
    });

  // Delete feed
  static deleteFeed = (feedId: string) =>
    Effect.gen(function* () {
      yield* Effect.sleep("100 millis");
      return { success: true, feedId };
    });
}

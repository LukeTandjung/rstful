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
      
      const articles: RssArticle[] = Array.from({ length: 15 }, (_, i) => {
        const baseArticle = {
          id: `${feedId}-article-${i}`,
          feedId,
          feedName: "Sample Feed",
          title: `Article ${i + 1}: Understanding Effect-TS and Functional Programming`,
          link: `https://example.com/article-${i}`,
          description: `This is a sample article description that provides a brief overview of the content. It discusses various aspects of modern software development and best practices.`,
          content: `<p>Full article content goes here. This would typically contain the complete HTML content of the article.</p>`,
          pubDate: new Date(Date.now() - i * 3600000),
          isRead: i < 5,
          isStarred: i % 4 === 0,
        };

        return i % 3 === 0
          ? { ...baseArticle, author: "John Doe" }
          : i % 3 === 1
          ? { ...baseArticle, author: "Jane Smith" }
          : baseArticle;
      });
      
      return articles;
    });

  // Fetch starred articles across all feeds
  static fetchStarredArticles = Effect.gen(function* () {
    yield* Effect.sleep("150 millis");
    
    // Simulated starred articles from multiple feeds
    const starredArticles: RssArticle[] = Array.from({ length: 8 }, (_, i) => ({
      id: `starred-article-${i}`,
      feedId: `${(i % 3) + 1}`,
      feedName: i % 3 === 0 ? "Hacker News" : i % 3 === 1 ? "TechCrunch" : "The Verge",
      title: `Starred Article ${i + 1}: Important Topic on ${i % 3 === 0 ? "Programming" : i % 3 === 1 ? "Startups" : "Technology"}`,
      link: `https://example.com/starred-${i}`,
      description: `This is an important starred article that you saved for later reading. It covers essential topics in the tech industry.`,
      content: `<p>Full starred article content goes here with detailed information about the topic.</p>`,
      author: i % 2 === 0 ? "Jane Doe" : "John Smith",
      pubDate: new Date(Date.now() - i * 7200000),
      isRead: i < 3,
      isStarred: true,
    }));
    
    return starredArticles;
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
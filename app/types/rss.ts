import type { Id } from "convex/_generated/dataModel";

export interface RssFeed {
  _id: Id<"rss_feed">;
  _creationTime: number;
  user_id: Id<"users">;
  name: string;
  url: string;
  category: string;
  last_fetched: bigint;
  unread_count: number;
  status: string;
}

export interface RssArticle {
  id: string;
  feedId: string;
  feedName: string;
  title: string;
  link: string;
  description: string;
  content?: string;
  author?: string;
  pubDate: Date;
  isRead: boolean;
  isStarred: boolean;
}

export interface FeedGroup {
  category: string;
  feeds: RssFeed[];
}

export interface RssFeed {
  id: string;
  name: string;
  url: string;
  category: string;
  lastFetched?: Date;
  unreadCount: number;
  status: "active" | "error" | "loading";
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

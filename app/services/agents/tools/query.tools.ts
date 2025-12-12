import type { Id, Doc } from "convex/_generated/dataModel";

export interface SavedArticle {
  id: string;
  title: string;
  content: string;
  link: string;
  description?: string;
  author?: string;
  pubDate?: number;
}

export interface QueryToolDependencies {
  getSavedContent: (args: {
    user_id: Id<"users">;
  }) => Promise<Array<Doc<"saved_content">>>;
}

export function createQueryTools(
  userId: Id<"users">,
  deps: QueryToolDependencies
) {
  /**
   * Fetches the user's saved articles from the database.
   * Use this to search through articles the user has previously saved.
   */
  async function fetchSavedArticles(): Promise<Array<SavedArticle>> {
    const results = await deps.getSavedContent({ user_id: userId });
    return results.map((doc) => ({
      id: doc._id,
      title: doc.title,
      content: doc.content,
      link: doc.link,
      ...(doc.description && { description: doc.description }),
      ...(doc.author && { author: doc.author }),
      ...(doc.pub_date && { pubDate: Number(doc.pub_date) }),
    }));
  }

  /**
   * Searches the user's saved articles by keyword.
   * Returns articles where the title or content contains the search term.
   */
  async function searchSavedArticles(query: string): Promise<Array<SavedArticle>> {
    const results = await deps.getSavedContent({ user_id: userId });
    const lowerQuery = query.toLowerCase();
    return results
      .filter(
        (doc) =>
          doc.title.toLowerCase().includes(lowerQuery) ||
          doc.content.toLowerCase().includes(lowerQuery)
      )
      .map((doc) => ({
        id: doc._id,
        title: doc.title,
        content: doc.content,
        link: doc.link,
        ...(doc.description && { description: doc.description }),
        ...(doc.author && { author: doc.author }),
        ...(doc.pub_date && { pubDate: Number(doc.pub_date) }),
      }));
  }

  return { fetchSavedArticles, searchSavedArticles };
}

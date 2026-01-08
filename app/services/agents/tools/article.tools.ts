import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

export interface ArticleContent {
  title: string;
  content: string;
  textContent: string;
  excerpt: string;
  byline: string | null;
  siteName: string | null;
}

/**
 * Fetches a URL and extracts the article content using Mozilla's Readability.
 * This tool should be used when you need to get the full text content of an article.
 *
 * @param url - The URL of the article to fetch
 * @returns The extracted article content including title, text, and metadata
 */
export async function fetchArticleContent(url: string): Promise<ArticleContent | string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RSTful/1.0; +https://rstful.app)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return `Failed to fetch URL: HTTP ${response.status} ${response.statusText}`;
    }

    const html = await response.text();
    const { document } = parseHTML(html);

    // Set the documentURI for Readability
    Object.defineProperty(document, "documentURI", {
      value: url,
      writable: false,
    });

    const reader = new Readability(document as unknown as Document);
    const article = reader.parse();

    if (!article) {
      return "Could not extract article content from this URL. The page may not contain a readable article.";
    }

    return {
      title: article.title,
      content: article.content,
      textContent: article.textContent,
      excerpt: article.excerpt,
      byline: article.byline,
      siteName: article.siteName,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error fetching article: ${message}`;
  }
}

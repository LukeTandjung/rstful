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

interface JinaReaderResponse {
  code: number;
  status: number;
  data: {
    url: string;
    title: string;
    content: string;
    publishedTime?: string;
  };
}

/**
 * Fallback: Fetches URL directly and extracts content using Mozilla Readability.
 */
async function fetchWithReadability(url: string): Promise<ArticleContent | string> {
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
}

/**
 * Primary: Fetches URL using Jina Reader API.
 */
async function fetchWithJina(url: string): Promise<ArticleContent | null> {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const headers: Record<string, string> = {
    "Accept": "application/json",
  };

  if (process.env.JINA_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.JINA_API_KEY}`;
  }

  const response = await fetch(jinaUrl, { headers });

  if (!response.ok) {
    return null;
  }

  const result = (await response.json()) as JinaReaderResponse;

  if (!result.data?.content) {
    return null;
  }

  const { title, content } = result.data;
  const excerpt = content.slice(0, 200).trim() + (content.length > 200 ? "..." : "");

  return {
    title: title || "Untitled",
    content,
    textContent: content,
    excerpt,
    byline: null,
    siteName: null,
  };
}

/**
 * Fetches a URL and extracts the article content.
 * Tries Jina Reader first, falls back to Mozilla Readability on failure.
 *
 * @param url - The URL of the article to fetch
 * @returns The extracted article content including title, text, and metadata
 */
export async function fetchArticleContent(url: string): Promise<ArticleContent | string> {
  try {
    const jinaResult = await fetchWithJina(url);
    if (jinaResult) {
      return jinaResult;
    }

    return await fetchWithReadability(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error fetching article: ${message}`;
  }
}

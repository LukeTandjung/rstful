import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import Dedalus from "dedalus-labs";
import { parseHTML } from "linkedom";

const client = new Dedalus();

// OpenAI text-embedding-3-small handles ~8k tokens, roughly 32k chars.
// We use 8k chars as a safe limit to avoid truncation issues.
const MAX_CONTENT_CHARS = 8000;

// Generate embedding for a single article
export const generate_article_embedding = internalAction({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    content: v.string(),
  },
  handler: async (_ctx, args): Promise<Array<number>> => {
    // Title is always included
    const parts: Array<string> = [args.title];

    // Add description if present and non-empty
    if (args.description && args.description.trim()) {
      let desc = args.description;
      // Check for HTML tags: matches <tagname followed by anything, then >
      // The [a-z] ensures we match actual tags, not things like "5 < 10"
      if (/<[a-z][\s\S]*>/i.test(desc)) {
        const { document } = parseHTML(desc);
        desc = document.body?.textContent || "";
      }
      if (desc.trim()) parts.push(desc.trim());
    }

    // Add content if not URL-only
    const trimmedContent = args.content.trim();
    // Check if content is just a URL: starts with http(s)://, followed by non-whitespace
    // and contains no spaces (a URL with text around it would have spaces)
    const isUrlOnly = /^https?:\/\/\S+$/.test(trimmedContent) && !trimmedContent.includes(" ");
    if (!isUrlOnly) {
      let text = args.content;
      // Strip HTML if detected
      if (/<[a-z][\s\S]*>/i.test(text)) {
        const { document } = parseHTML(text);
        text = document.body?.textContent || "";
      }
      // Truncate if too long to avoid embedding API limits
      if (text.length > MAX_CONTENT_CHARS) {
        text = text.slice(0, MAX_CONTENT_CHARS);
      }
      if (text.trim()) parts.push(text.trim());
    }

    const embeddingText = parts.join(" ");
    const response = await client.embeddings.create({
      input: embeddingText,
      model: "openai/text-embedding-3-small",
    });
    return response.data[0].embedding as Array<number>;
  },
});

// Generate embeddings for multiple articles in a single API call
export const generate_article_embeddings_batch = internalAction({
  args: {
    articles: v.array(
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        content: v.string(),
      })
    ),
  },
  handler: async (_ctx, args): Promise<Array<Array<number>>> => {
    if (args.articles.length === 0) return [];

    const texts = args.articles.map((article) => {
      const parts: Array<string> = [article.title];

      if (article.description && article.description.trim()) {
        let desc = article.description;
        // Strip HTML tags if present
        if (/<[a-z][\s\S]*>/i.test(desc)) {
          const { document } = parseHTML(desc);
          desc = document.body?.textContent || "";
        }
        if (desc.trim()) parts.push(desc.trim());
      }

      const trimmedContent = article.content.trim();
      // Skip content that's just a bare URL (no meaningful text to embed)
      const isUrlOnly = /^https?:\/\/\S+$/.test(trimmedContent) && !trimmedContent.includes(" ");
      if (!isUrlOnly) {
        let text = article.content;
        // Strip HTML tags if present
        if (/<[a-z][\s\S]*>/i.test(text)) {
          const { document } = parseHTML(text);
          text = document.body?.textContent || "";
        }
        // Truncate to stay within embedding model limits
        if (text.length > MAX_CONTENT_CHARS) {
          text = text.slice(0, MAX_CONTENT_CHARS);
        }
        if (text.trim()) parts.push(text.trim());
      }

      return parts.join(" ");
    });

    const response = await client.embeddings.create({
      input: texts,
      model: "openai/text-embedding-3-small",
    });
    return response.data.map((d) => d.embedding as Array<number>);
  },
});

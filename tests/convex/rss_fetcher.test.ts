import { describe, it, expect } from "vitest";
import { parse_rss_xml } from "../../convex/rss_fetcher";

describe("RSS Feed Parser", () => {
  describe("Valid RSS 2.0 Feeds", () => {
    it("should parse a valid RSS 2.0 feed with single item", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Test Feed</title>
            <item>
              <title>Article Title</title>
              <link>https://example.com/article1</link>
              <description>Article description</description>
              <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>`;

      const result = parse_rss_xml(xml);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        link: "https://example.com/article1",
        content: "Article Title\n\nArticle description",
        pub_date: new Date("Mon, 01 Jan 2024 00:00:00 GMT").getTime(),
      });
    });

    it("should parse a valid RSS 2.0 feed with multiple items", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Test Feed</title>
            <item>
              <title>Article 1</title>
              <link>https://example.com/article1</link>
              <description>Description 1</description>
            </item>
            <item>
              <title>Article 2</title>
              <link>https://example.com/article2</link>
              <description>Description 2</description>
            </item>
            <item>
              <title>Article 3</title>
              <link>https://example.com/article3</link>
              <description>Description 3</description>
            </item>
          </channel>
        </rss>`;

      const result = parse_rss_xml(xml);

      expect(result).toHaveLength(3);
      expect(result[0].link).toBe("https://example.com/article1");
      expect(result[1].link).toBe("https://example.com/article2");
      expect(result[2].link).toBe("https://example.com/article3");
    });

    it("should handle RSS feed without pubDate", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Article Title</title>
              <link>https://example.com/article1</link>
              <description>Article description</description>
            </item>
          </channel>
        </rss>`;

      const result = parse_rss_xml(xml);

      expect(result).toHaveLength(1);
      expect(result[0].pub_date).toBeUndefined();
    });
  });

  describe("Valid Atom Feeds", () => {
    it("should parse a valid Atom feed", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Test Feed</title>
          <entry>
            <title>Article Title</title>
            <link href="https://example.com/article1"/>
            <summary>Article summary</summary>
            <published>2024-01-01T00:00:00Z</published>
          </entry>
        </feed>`;

      const result = parse_rss_xml(xml);

      expect(result).toHaveLength(1);
      expect(result[0].link).toBe("https://example.com/article1");
      expect(result[0].content).toContain("Article Title");
      expect(result[0].content).toContain("Article summary");
    });

    it("should parse Atom feed with multiple entries", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry>
            <title>Entry 1</title>
            <link href="https://example.com/entry1"/>
            <summary>Summary 1</summary>
          </entry>
          <entry>
            <title>Entry 2</title>
            <link href="https://example.com/entry2"/>
            <summary>Summary 2</summary>
          </entry>
        </feed>`;

      const result = parse_rss_xml(xml);

      expect(result).toHaveLength(2);
    });
  });

  describe("Edge Cases - Malformed XML", () => {
    it("should return empty array for completely malformed XML", () => {
      const xml = "This is not XML at all!";

      const result = parse_rss_xml(xml);

      expect(result).toEqual([]);
    });

    it("should return empty array for invalid XML structure", () => {
      const xml = `<?xml version="1.0"?>
        <invalid>
          <structure>
            <that>is not RSS or Atom</that>
          </structure>
        </invalid>`;

      const result = parse_rss_xml(xml);

      expect(result).toEqual([]);
    });

    it("should skip items with missing links", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>No Link Article</title>
              <description>This article has no link</description>
            </item>
            <item>
              <title>Valid Article</title>
              <link>https://example.com/valid</link>
              <description>This is valid</description>
            </item>
          </channel>
        </rss>`;

      const result = parse_rss_xml(xml);

      expect(result).toHaveLength(1);
      expect(result[0].link).toBe("https://example.com/valid");
    });

    it("should skip items with empty links", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Empty Link Article</title>
              <link></link>
              <description>This article has empty link</description>
            </item>
            <item>
              <title>Valid Article</title>
              <link>https://example.com/valid</link>
              <description>This is valid</description>
            </item>
          </channel>
        </rss>`;

      const result = parse_rss_xml(xml);

      expect(result).toHaveLength(1);
      expect(result[0].link).toBe("https://example.com/valid");
    });

    it("should skip items with no content (no title and no description)", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <link>https://example.com/no-content</link>
            </item>
            <item>
              <title>Valid Article</title>
              <link>https://example.com/valid</link>
              <description>This is valid</description>
            </item>
          </channel>
        </rss>`;

      const result = parse_rss_xml(xml);

      expect(result).toHaveLength(1);
      expect(result[0].link).toBe("https://example.com/valid");
    });
  });

  describe("Edge Cases - Empty and Null Feeds", () => {
    it("should handle empty XML string", () => {
      const result = parse_rss_xml("");

      expect(result).toEqual([]);
    });

    it("should handle whitespace-only XML string", () => {
      const result = parse_rss_xml("   \n\n   ");

      expect(result).toEqual([]);
    });

    it("should handle empty RSS feed (no items)", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Empty Feed</title>
            <description>This feed has no items</description>
          </channel>
        </rss>`;

      const result = parse_rss_xml(xml);

      expect(result).toEqual([]);
    });

    it("should handle empty Atom feed (no entries)", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Empty Feed</title>
        </feed>`;

      const result = parse_rss_xml(xml);

      expect(result).toEqual([]);
    });
  });

  describe("Content Extraction", () => {
    it("should extract content from description field", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Title</title>
              <link>https://example.com/article</link>
              <description>Description content</description>
            </item>
          </channel>
        </rss>`;

      const result = parse_rss_xml(xml);

      expect(result[0].content).toContain("Description content");
    });

    it("should extract content from summary field (Atom)", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry>
            <title>Title</title>
            <link href="https://example.com/article"/>
            <summary>Summary content</summary>
          </entry>
        </feed>`;

      const result = parse_rss_xml(xml);

      expect(result[0].content).toContain("Summary content");
    });

    it("should handle title-only articles", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Only Title</title>
              <link>https://example.com/article</link>
            </item>
          </channel>
        </rss>`;

      const result = parse_rss_xml(xml);

      expect(result[0].content).toBe("Only Title");
    });
  });

  describe("Date Parsing", () => {
    it("should parse valid RFC 822 date format", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Article</title>
              <link>https://example.com/article</link>
              <description>Content</description>
              <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>`;

      const result = parse_rss_xml(xml);

      expect(result[0].pub_date).toBeDefined();
      expect(typeof result[0].pub_date).toBe("number");
    });

    it("should parse valid ISO 8601 date format (Atom)", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry>
            <title>Article</title>
            <link href="https://example.com/article"/>
            <summary>Content</summary>
            <published>2024-01-01T12:00:00Z</published>
          </entry>
        </feed>`;

      const result = parse_rss_xml(xml);

      expect(result[0].pub_date).toBeDefined();
      expect(typeof result[0].pub_date).toBe("number");
    });

    it("should handle invalid date formats gracefully", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Article</title>
              <link>https://example.com/article</link>
              <description>Content</description>
              <pubDate>Invalid Date String</pubDate>
            </item>
          </channel>
        </rss>`;

      const result = parse_rss_xml(xml);

      expect(result[0].pub_date).toBeUndefined();
    });
  });

  describe("Link Trimming and Normalization", () => {
    it("should trim whitespace from links", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Article</title>
              <link>  https://example.com/article  </link>
              <description>Content</description>
            </item>
          </channel>
        </rss>`;

      const result = parse_rss_xml(xml);

      expect(result[0].link).toBe("https://example.com/article");
    });

    it("should handle links with special characters", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Article</title>
              <link>https://example.com/article?param=value&amp;other=123</link>
              <description>Content</description>
            </item>
          </channel>
        </rss>`;

      const result = parse_rss_xml(xml);

      expect(result[0].link).toContain("https://example.com/article");
    });
  });
});

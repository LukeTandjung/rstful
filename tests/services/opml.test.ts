/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { generateOpml, parseOpml, type FeedData } from "../../app/services/opml";

describe("OPML Utilities", () => {
  describe("generateOpml", () => {
    it("should generate valid OPML from feeds", () => {
      const feeds: Array<FeedData> = [
        { name: "Hacker News", url: "https://news.ycombinator.com/rss", category: "Tech" },
        { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "Tech" },
        { name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml", category: "News" },
      ];

      const result = generateOpml(feeds);

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<opml version="2.0">');
      expect(result).toContain("<title>RSS Feeds Export</title>");
      expect(result).toContain('text="Tech"');
      expect(result).toContain('text="News"');
      expect(result).toContain('xmlUrl="https://news.ycombinator.com/rss"');
      expect(result).toContain('xmlUrl="https://techcrunch.com/feed/"');
    });

    it("should group feeds by category", () => {
      const feeds: Array<FeedData> = [
        { name: "Feed 1", url: "https://example.com/feed1", category: "Cat A" },
        { name: "Feed 2", url: "https://example.com/feed2", category: "Cat B" },
        { name: "Feed 3", url: "https://example.com/feed3", category: "Cat A" },
      ];

      const result = generateOpml(feeds);

      // Cat A should contain Feed 1 and Feed 3
      const catAMatch = result.match(/<outline text="Cat A"[\s\S]*?<\/outline>/);
      expect(catAMatch).toBeTruthy();
      expect(catAMatch![0]).toContain("Feed 1");
      expect(catAMatch![0]).toContain("Feed 3");
    });

    it("should handle empty feeds array", () => {
      const result = generateOpml([]);

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain("<opml");
      expect(result).toContain("</opml>");
    });

    it("should escape special XML characters", () => {
      const feeds: Array<FeedData> = [
        { name: "Feed & News <test>", url: "https://example.com/feed?a=1&b=2", category: "Tech's \"Best\"" },
      ];

      const result = generateOpml(feeds);

      expect(result).toContain("&amp;");
      expect(result).toContain("&lt;");
      expect(result).toContain("&gt;");
      expect(result).toContain("&quot;");
      expect(result).toContain("&apos;");
    });

    it("should use 'Uncategorized' for feeds without category", () => {
      const feeds: Array<FeedData> = [
        { name: "Feed 1", url: "https://example.com/feed1", category: "" },
      ];

      const result = generateOpml(feeds);

      expect(result).toContain('text="Uncategorized"');
    });
  });

  describe("parseOpml", () => {
    it("should parse valid OPML with categories", () => {
      const opml = `<?xml version="1.0" encoding="UTF-8"?>
        <opml version="2.0">
          <head><title>Test</title></head>
          <body>
            <outline text="Tech" title="Tech">
              <outline type="rss" text="Hacker News" xmlUrl="https://news.ycombinator.com/rss"/>
              <outline type="rss" text="TechCrunch" xmlUrl="https://techcrunch.com/feed/"/>
            </outline>
            <outline text="News">
              <outline type="rss" text="BBC" xmlUrl="https://feeds.bbci.co.uk/news/rss.xml"/>
            </outline>
          </body>
        </opml>`;

      const { feeds, errors } = parseOpml(opml);

      expect(errors).toHaveLength(0);
      expect(feeds).toHaveLength(3);
      expect(feeds[0]).toEqual({
        name: "Hacker News",
        url: "https://news.ycombinator.com/rss",
        category: "Tech",
      });
      expect(feeds[2].category).toBe("News");
    });

    it("should parse OPML with flat structure (no categories)", () => {
      const opml = `<?xml version="1.0" encoding="UTF-8"?>
        <opml version="2.0">
          <body>
            <outline type="rss" text="Feed 1" xmlUrl="https://example.com/feed1"/>
            <outline type="rss" text="Feed 2" xmlUrl="https://example.com/feed2"/>
          </body>
        </opml>`;

      const { feeds, errors } = parseOpml(opml);

      expect(errors).toHaveLength(0);
      expect(feeds).toHaveLength(2);
      expect(feeds[0].category).toBe("Imported");
      expect(feeds[1].category).toBe("Imported");
    });

    it("should parse feeds without explicit type attribute", () => {
      const opml = `<?xml version="1.0" encoding="UTF-8"?>
        <opml version="2.0">
          <body>
            <outline text="Some Feed" xmlUrl="https://example.com/feed"/>
          </body>
        </opml>`;

      const { feeds, errors } = parseOpml(opml);

      expect(errors).toHaveLength(0);
      expect(feeds).toHaveLength(1);
      expect(feeds[0].url).toBe("https://example.com/feed");
    });

    it("should use title attribute when text is missing", () => {
      const opml = `<?xml version="1.0" encoding="UTF-8"?>
        <opml version="2.0">
          <body>
            <outline title="My Feed" xmlUrl="https://example.com/feed"/>
          </body>
        </opml>`;

      const { feeds, errors } = parseOpml(opml);

      expect(feeds[0].name).toBe("My Feed");
    });

    it("should use URL as name when both text and title are missing", () => {
      const opml = `<?xml version="1.0" encoding="UTF-8"?>
        <opml version="2.0">
          <body>
            <outline xmlUrl="https://example.com/feed"/>
          </body>
        </opml>`;

      const { feeds, errors } = parseOpml(opml);

      expect(feeds[0].name).toBe("https://example.com/feed");
    });

    // Edge cases
    it("should return error for empty OPML content", () => {
      const { feeds, errors } = parseOpml("");

      expect(feeds).toHaveLength(0);
      expect(errors).toContain("Empty OPML content");
    });

    it("should return error for whitespace-only content", () => {
      const { feeds, errors } = parseOpml("   \n\n   ");

      expect(feeds).toHaveLength(0);
      expect(errors).toContain("Empty OPML content");
    });

    it("should return error for malformed XML", () => {
      const { feeds, errors } = parseOpml("This is not XML at all!");

      expect(feeds).toHaveLength(0);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should return error for XML without body element", () => {
      const opml = `<?xml version="1.0" encoding="UTF-8"?>
        <opml version="2.0">
          <head><title>Test</title></head>
        </opml>`;

      const { feeds, errors } = parseOpml(opml);

      expect(feeds).toHaveLength(0);
      expect(errors).toContain("Invalid OPML: missing body element");
    });

    it("should handle empty OPML (no feeds)", () => {
      const opml = `<?xml version="1.0" encoding="UTF-8"?>
        <opml version="2.0">
          <body></body>
        </opml>`;

      const { feeds, errors } = parseOpml(opml);

      expect(feeds).toHaveLength(0);
      expect(errors).toHaveLength(0);
    });

    it("should skip outlines without xmlUrl", () => {
      const opml = `<?xml version="1.0" encoding="UTF-8"?>
        <opml version="2.0">
          <body>
            <outline text="Just a folder"/>
            <outline type="rss" text="Valid Feed" xmlUrl="https://example.com/feed"/>
          </body>
        </opml>`;

      const { feeds, errors } = parseOpml(opml);

      expect(feeds).toHaveLength(1);
      expect(feeds[0].name).toBe("Valid Feed");
    });

    it("should handle deeply nested categories", () => {
      const opml = `<?xml version="1.0" encoding="UTF-8"?>
        <opml version="2.0">
          <body>
            <outline text="Level 1">
              <outline text="Level 2">
                <outline type="rss" text="Deep Feed" xmlUrl="https://example.com/deep"/>
              </outline>
            </outline>
          </body>
        </opml>`;

      const { feeds, errors } = parseOpml(opml);

      expect(feeds).toHaveLength(1);
      expect(feeds[0].category).toBe("Level 2");
    });
  });

  describe("Round-trip (generate then parse)", () => {
    it("should preserve feeds through generate/parse cycle", () => {
      const originalFeeds: Array<FeedData> = [
        { name: "Feed A", url: "https://example.com/a", category: "Category 1" },
        { name: "Feed B", url: "https://example.com/b", category: "Category 1" },
        { name: "Feed C", url: "https://example.com/c", category: "Category 2" },
      ];

      const opmlString = generateOpml(originalFeeds);
      const { feeds: parsedFeeds, errors } = parseOpml(opmlString);

      expect(errors).toHaveLength(0);
      expect(parsedFeeds).toHaveLength(3);

      // Check that all original feeds are present
      for (const original of originalFeeds) {
        const found = parsedFeeds.find((f) => f.url === original.url);
        expect(found).toBeDefined();
        expect(found!.name).toBe(original.name);
        expect(found!.category).toBe(original.category);
      }
    });
  });
});

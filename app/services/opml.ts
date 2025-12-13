// OPML parsing and generation utilities (browser-compatible)

export interface FeedData {
  name: string;
  url: string;
  category: string;
}

// Generate OPML XML from feeds
export function generateOpml(feeds: Array<FeedData>, title = "RSS Feeds Export"): string {
  // Group feeds by category
  const feedsByCategory = new Map<string, Array<FeedData>>();
  for (const feed of feeds) {
    const category = feed.category || "Uncategorized";
    if (!feedsByCategory.has(category)) {
      feedsByCategory.set(category, []);
    }
    feedsByCategory.get(category)!.push(feed);
  }

  // Build OPML XML
  const escapeXml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<opml version="2.0">\n';
  xml += "  <head>\n";
  xml += `    <title>${escapeXml(title)}</title>\n`;
  xml += `    <dateCreated>${new Date().toUTCString()}</dateCreated>\n`;
  xml += "  </head>\n";
  xml += "  <body>\n";

  for (const [category, categoryFeeds] of feedsByCategory) {
    xml += `    <outline text="${escapeXml(category)}" title="${escapeXml(category)}">\n`;
    for (const feed of categoryFeeds) {
      xml += `      <outline type="rss" text="${escapeXml(feed.name)}" title="${escapeXml(feed.name)}" xmlUrl="${escapeXml(feed.url)}"/>\n`;
    }
    xml += "    </outline>\n";
  }

  xml += "  </body>\n";
  xml += "</opml>";

  return xml;
}

// Parse OPML XML to feeds
export function parseOpml(opmlText: string): { feeds: Array<FeedData>; errors: Array<string> } {
  const feeds: Array<FeedData> = [];
  const errors: Array<string> = [];

  if (!opmlText.trim()) {
    errors.push("Empty OPML content");
    return { feeds, errors };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(opmlText, "text/xml");

    // Check for parse errors
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      errors.push("Invalid XML: " + parseError.textContent);
      return { feeds, errors };
    }

    // Extract feeds recursively
    const extractFeeds = (element: Element, parentCategory?: string) => {
      const outlines = element.querySelectorAll(":scope > outline");

      for (const outline of outlines) {
        const xmlUrl = outline.getAttribute("xmlUrl");
        const type = outline.getAttribute("type");
        const text = outline.getAttribute("text") || outline.getAttribute("title") || "";
        const hasChildren = outline.querySelector("outline") !== null;

        if (xmlUrl) {
          // This is a feed
          feeds.push({
            name: text || xmlUrl,
            url: xmlUrl,
            category: parentCategory || "Imported",
          });
        } else if (hasChildren) {
          // This is a category/folder - recurse
          extractFeeds(outline, text || parentCategory);
        }
      }
    };

    const body = doc.querySelector("opml > body");
    if (body) {
      extractFeeds(body);
    } else {
      errors.push("Invalid OPML: missing body element");
    }
  } catch (e) {
    errors.push(`Failed to parse OPML: ${e}`);
  }

  return { feeds, errors };
}

// Download OPML as file
export function downloadOpml(feeds: Array<FeedData>, filename = "feeds.opml"): void {
  const opmlContent = generateOpml(feeds);
  const blob = new Blob([opmlContent], { type: "text/xml" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Read OPML file from input
export function readOpmlFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

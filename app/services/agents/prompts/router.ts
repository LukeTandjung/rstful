export const ROUTER_PROMPT = `Classify the user's intent into exactly one of: "simple_query" (questions about saved articles), "web_search" (general web searches), or "deep_search" (finding content creators matching criteria).

Output JSON: {"intent": "simple_query" | "web_search" | "deep_search", "confidence": 0.0-1.0}`;

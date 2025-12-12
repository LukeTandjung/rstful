export const ROUTER_PROMPT = `Classify the user's intent into exactly one of: "simple_query" (questions about saved articles), "web_search" (general web searches), or "deep_x_search" (finding X/Twitter users matching criteria).

Output JSON: {"intent": "simple_query" | "web_search" | "deep_x_search", "confidence": 0.0-1.0}`;

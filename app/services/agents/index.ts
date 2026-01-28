// Types
export {
  KnowledgeGraphEntity,
  KnowledgeGraphRelationship,
  KnowledgeGraphUpdate,
  KnowledgeGraphVertex,
  KnowledgeGraphEdge,
  KnowledgeGraphSubgraph,
} from "./agents.types";

// Shared layers and models
export {
  DedalusClientLive,
  Gpt5,
  Gpt4oMini,
  TextEmbedding,
} from "./agents.effect";

// Tools
export {
  ChatToolkit,
  createChatToolkitLayer,
  type ChatToolDependencies,
  fetchArticleContent,
  type ArticleContent,
  createKnowledgeGraphTools,
  verbalizeGraph,
  verbalizeGraphForPrompt,
  type KnowledgeGraphToolDependencies,
  type SearchToolDependencies,
} from "./tools";

// Prompts
export { ARTICLE_CHAT_PROMPT } from "./prompts";

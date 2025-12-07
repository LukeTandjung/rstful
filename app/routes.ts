import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("starred", "routes/starred.tsx"),
  route("chat", "routes/chat.tsx"),
  route("settings", "routes/settings.tsx"),
  route("styles", "routes/styles.tsx"),
] satisfies RouteConfig;
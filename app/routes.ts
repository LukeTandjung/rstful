import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("home", "routes/home.tsx"),
  route("starred", "routes/starred.tsx"),
  route("chat", "routes/chat.tsx"),
  route("settings", "routes/settings.tsx"),
  route("login", "routes/login.tsx"),
  route("sign-up", "routes/sign-up.tsx"),
] satisfies RouteConfig;

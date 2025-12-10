import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),
  route("reset-password", "routes/reset-password.tsx"),
  route("sign-up", "routes/sign-up.tsx"),
  route("verify-email.tsx", "routes/verify-email.tsx"),
  layout("routes/_app/_layout.tsx", [
    index("routes/_app/index.tsx"),
    route("starred", "routes/_app/starred.tsx"),
    route("chat", "routes/_app/chat.tsx"),
    route("settings", "routes/_app/settings.tsx"),
  ]),
] satisfies RouteConfig;

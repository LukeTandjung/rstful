import { ManagedRuntime, Layer } from "effect";
import type { useAuthActions } from "@convex-dev/auth/react";
import { AuthService, ConvexAuthActions, AuthServiceLive } from "services/auth";

export let appRuntime: ManagedRuntime.ManagedRuntime<
  AuthService,
  never
> | null = null;

export function createAppRuntime(
  convexAuthActions: ReturnType<typeof useAuthActions>,
) {
  const ConvexAuthActionsLive = Layer.succeed(ConvexAuthActions, {
    use_actions: convexAuthActions,
  });

  appRuntime = ManagedRuntime.make(
    Layer.provide(AuthServiceLive, ConvexAuthActionsLive),
  );

  return appRuntime;
}

export function disposeAppRuntime() {
  if (appRuntime) {
    appRuntime.dispose();
    appRuntime = null;
  }
}

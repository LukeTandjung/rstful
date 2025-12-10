import { Effect, Context } from "effect";
import { useAuthActions } from "@convex-dev/auth/react";
import type { Email, Password } from "./auth.types";
import { AuthenticationError, ValidationError } from "./auth.errors";

export class AuthService extends Context.Tag("AuthService")<
  AuthService,
  {
    readonly sign_up: (
      name: string,
      email: Email,
      password: Password,
    ) => Effect.Effect<void, AuthenticationError | ValidationError>;
    readonly login: (
      email: Email,
      password: Password,
    ) => Effect.Effect<void, AuthenticationError>;
    readonly logout: Effect.Effect<void, AuthenticationError>;
    readonly verify_email: (
      email: Email,
      code: string,
    ) => Effect.Effect<void, AuthenticationError | ValidationError>;
    readonly request_password_reset: (
      email: Email,
    ) => Effect.Effect<void, AuthenticationError | ValidationError>;
    readonly reset_password: (
      email: Email,
      code: string,
      new_password: Password,
    ) => Effect.Effect<void, AuthenticationError | ValidationError>;
  }
>() {}

export class ConvexAuthActions extends Context.Tag("ConvexAuthActions")<
  ConvexAuthActions,
  {
    readonly use_actions: ReturnType<typeof useAuthActions>;
  }
>() {}

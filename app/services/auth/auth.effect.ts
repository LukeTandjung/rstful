import { Effect, Layer } from "effect";
import { AuthService, ConvexAuthActions } from "./auth.service";
import { AuthenticationError, ValidationError } from "./auth.errors";
import { Email, Password } from "./auth.types"; 

export const AuthServiceLive = Layer.effect(
  AuthService,
  ConvexAuthActions.pipe(
    Effect.map((convexAuth) => ({
      sign_up: (name: string, email: string, password: string) =>
        Effect.all([
          Effect.try(() => Email(email)),
          Effect.try(() => Password(password))
        ]).pipe(
          Effect.mapError(() => new ValidationError()),
          Effect.flatMap(([validEmail, validPassword]) =>
            Effect.sync(() => {
              const formData = new FormData();
              formData.append("email", validEmail);
              formData.append("password", validPassword);
              formData.append("flow", "signUp");
              return formData;
            })
          ),
          Effect.flatMap((formData) =>
            Effect.tryPromise({
              try: () => convexAuth.use_actions.signIn("password", formData),
              catch: () => new AuthenticationError(),
            })
          )
        ),

      login: (email: string, password: string) =>
        Effect.sync(() => {
          const formData = new FormData();
          formData.append("email", email);
          formData.append("password", password);
          formData.append("flow", "signIn");
          return formData;
        }).pipe(
          Effect.flatMap((formData) =>
            Effect.tryPromise({
              try: () => convexAuth.use_actions.signIn("password", formData),
              catch: () => new AuthenticationError(),
            }),
          ),
        ),

      logout: Effect.tryPromise({
        try: () => convexAuth.use_actions.signOut(),
        catch: () => new AuthenticationError(),
      }),
    })),
  ),
);

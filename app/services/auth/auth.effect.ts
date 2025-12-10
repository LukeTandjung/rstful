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
          Effect.try({
            try: () => {
              if (!name || name.trim().length === 0) {
                throw new Error("Name cannot be blank");
              }
              return name.trim();
            },
            catch: (e) => new ValidationError({
              message: e instanceof Error ? e.message : "Name cannot be blank"
            }),
          }),
          Effect.try({
            try: () => Email(email),
            catch: () => new ValidationError({ message: "Invalid email format" }),
          }),
          Effect.try({
            try: () => Password(password),
            catch: () => new ValidationError({
              message: "Invalid password. Must be at least 8 characters with a number and special character"
            }),
          })
        ]).pipe(
          Effect.flatMap(([validName, validEmail, validPassword]) =>
            Effect.sync(() => {
              const formData = new FormData();
              formData.append("name", validName);
              formData.append("email", validEmail);
              formData.append("password", validPassword);
              formData.append("flow", "signUp");
              return formData;
            })
          ),
          Effect.flatMap((formData) =>
            Effect.tryPromise({
              try: () => convexAuth.use_actions.signIn("password", formData),
              catch: () => new AuthenticationError({ message: "Sign up failed. This email may already be in use." }),
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
              catch: () => new AuthenticationError({ message: "Login failed. Please check your credentials." }),
            }),
          ),
        ),

      logout: Effect.tryPromise({
        try: () => convexAuth.use_actions.signOut(),
        catch: () => new AuthenticationError({ message: "Logout failed." }),
      }),

      verify_email: (email: string, code: string) =>
        Effect.try(() => Email(email)).pipe(
          Effect.mapError(() => new ValidationError({ message: "Invalid email format" })),
          Effect.flatMap((validEmail) =>
            Effect.sync(() => {
              const formData = new FormData();
              formData.append("email", validEmail);
              formData.append("code", code);
              formData.append("flow", "email-verification");
              return formData;
            })
          ),
          Effect.flatMap((formData) =>
            Effect.tryPromise({
              try: () => convexAuth.use_actions.signIn("password", formData),
              catch: () => new AuthenticationError({ message: "Email verification failed." }),
            })
          )
        ),

      request_password_reset: (email: string) =>
        Effect.try(() => Email(email)).pipe(
          Effect.mapError(() => new ValidationError({ message: "Invalid email format" })),
          Effect.flatMap((validEmail) =>
            Effect.sync(() => {
              const formData = new FormData();
              formData.append("email", validEmail);
              formData.append("flow", "reset");
              return formData;
            })
          ),
          Effect.flatMap((formData) =>
            Effect.tryPromise({
              try: () => convexAuth.use_actions.signIn("password", formData),
              catch: () => new AuthenticationError({ message: "Password reset request failed." }),
            })
          )
        ),

      reset_password: (email: string, code: string, new_password: string) =>
        Effect.all([
          Effect.try(() => Email(email)),
          Effect.try(() => Password(new_password))
        ]).pipe(
          Effect.mapError(() => new ValidationError({ message: "Invalid email or password format" })),
          Effect.flatMap(([validEmail, validPassword]) =>
            Effect.sync(() => {
              const formData = new FormData();
              formData.append("email", validEmail);
              formData.append("code", code);
              formData.append("newPassword", validPassword);
              formData.append("flow", "reset-verification");
              return formData;
            })
          ),
          Effect.flatMap((formData) =>
            Effect.tryPromise({
              try: () => convexAuth.use_actions.signIn("password", formData),
              catch: () => new AuthenticationError({ message: "Password reset failed." }),
            })
          )
        ),
    })),
  ),
);

import type { Route } from "./+types/login";
import { Form } from "@base-ui-components/react/form";
import { Button } from "@base-ui-components/react/button";
import { FormField } from "components";
import { Link, useNavigate } from "react-router";
import * as React from "react";
import { Effect } from "effect";
import { AuthService, Email, Password } from "services/auth";
import { appRuntime } from "services/runtime";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Login - RSS Reader" },
    { name: "description", content: "Login to your RSS Reader account" },
  ];
}

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as Email;
    const password = formData.get("password") as Password;

    if (!appRuntime) {
      setError("App not initialized");
      return;
    }

    const program = Effect.gen(function* () {
      const authService = yield* AuthService;
      yield* authService.login(email, password);
      navigate("/");
    }).pipe(
      Effect.catchTags({
        AuthenticationError: (error) =>
          Effect.sync(() => {
            setError("Login failed. Please check your credentials.");
            console.error(error);
          }),
      }),
    );

    appRuntime.runPromise(program);
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="/assets/yoshida_login.jpg"
          alt="Japanese harbor scene"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Right side - Login Form */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 bg-background px-8 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <h1 className="font-bold text-3xl leading-9 text-text mb-2">
              Welcome back
            </h1>
            <p className="font-normal text-base leading-6 text-text-alt">
              Login to your RSS Reader account
            </p>
          </div>

          <Form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <FormField
              name="email"
              label="Email"
              placeholder="you@example.com"
            />

            <div className="flex flex-col gap-2">
              <FormField
                name="password"
                label="Password"
                placeholder="Enter your password"
              />
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-border-focus hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && (
              <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-border-focus hover:bg-border-focus/80 px-4 py-3 rounded-lg font-medium text-base leading-6 text-text transition-colors mt-2"
            >
              Login
            </Button>

            <div className="text-center">
              <p className="font-normal text-sm leading-6 text-text-alt">
                Don't have an account?{" "}
                <Link
                  to="/sign-up"
                  className="text-border-focus hover:underline font-medium"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}

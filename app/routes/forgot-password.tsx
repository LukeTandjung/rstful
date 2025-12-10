import type { Route } from "./+types/forgot-password";
import { Form } from "@base-ui-components/react/form";
import { Button } from "@base-ui-components/react/button";
import { FormField } from "components";
import { Link } from "react-router";
import * as React from "react";
import { Effect } from "effect";
import { AuthService, Email } from "services/auth";
import { appRuntime } from "services/runtime";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Forgot Password - RSS Reader" },
    { name: "description", content: "Reset your RSS Reader password" },
  ];
}

export default function ForgotPassword() {
  const [emailSent, setEmailSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as Email;

    if (!appRuntime) {
      setError("App not initialized");
      return;
    }

    const program = Effect.gen(function* () {
      const authService = yield* AuthService;
      yield* authService.request_password_reset(email);
      setEmailSent(true);
    }).pipe(
      Effect.catchTags({
        ValidationError: (error) =>
          Effect.sync(() => {
            setError("Invalid email format.");
            console.error(error);
          }),
        AuthenticationError: (error) =>
          Effect.sync(() => {
            setError("Failed to send password reset email. Please try again.");
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

      {/* Right side - Forgot Password Form */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 bg-background px-8 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {!emailSent ? (
            <>
              <div className="mb-8">
                <h1 className="font-bold text-3xl leading-9 text-text mb-2">
                  Forgot password?
                </h1>
                <p className="font-normal text-base leading-6 text-text-alt">
                  Enter your email and we'll send you a link to reset your
                  password
                </p>
              </div>

              <Form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <FormField
                  name="email"
                  label="Email"
                  placeholder="you@example.com"
                />

                {error && (
                  <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-border-focus hover:bg-border-focus/80 px-4 py-3 rounded-lg font-medium text-base leading-6 text-text transition-colors mt-2"
                >
                  Send reset link
                </Button>

                <div className="text-center">
                  <p className="font-normal text-sm leading-6 text-text-alt">
                    Remember your password?{" "}
                    <Link
                      to="/login"
                      className="text-border-focus hover:underline font-medium"
                    >
                      Back to login
                    </Link>
                  </p>
                </div>
              </Form>
            </>
          ) : (
            <>
              <div className="mb-8">
                <div className="w-16 h-16 rounded-full bg-ok/10 flex items-center justify-center mb-6">
                  <svg
                    className="w-8 h-8 text-ok"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h1 className="font-bold text-3xl leading-9 text-text mb-2">
                  Check your email
                </h1>
                <p className="font-normal text-base leading-6 text-text-alt">
                  We've sent a password reset link to your email address. Please
                  check your inbox and follow the instructions.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <p className="font-normal text-sm leading-6 text-text-alt">
                  Didn't receive the email? Check your spam folder or{" "}
                  <Button
                    onClick={() => setEmailSent(false)}
                    className="text-border-focus hover:underline font-medium"
                  >
                    Try again
                  </Button>
                </p>

                <Link
                  to="/login"
                  className="text-center w-full bg-background-select hover:bg-background-alt px-4 py-3 rounded-lg font-medium text-base leading-6 text-text transition-colors"
                >
                  Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import type { Route } from "./+types/verify-email";
import { Form } from "@base-ui-components/react/form";
import { Button } from "@base-ui-components/react/button";
import { FormField } from "components";
import { Link } from "react-router";
import * as React from "react";
import { Effect } from "effect";
import { AuthService, Email } from "services/auth";
import { appRuntime } from "services/runtime";
import { useHighlighter } from "services/highlighter";
import { useAction, useQuery } from "convex/react";
import { api } from "convex/_generated/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Verify Email - RSS Reader" },
    { name: "description", content: "Verify your email address" },
  ];
}

export default function VerifyEmail() {
  const [error, setError] = React.useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const hlButton = useHighlighter();
  const configuredProducts = useQuery(api.polar.getConfiguredProducts);
  const generateCheckoutLink = useAction(api.polar.generateCheckoutLink);
  const productId = configuredProducts?.monthlySubscription?.id;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as Email;
    const code = formData.get("code") as string;

    if (!appRuntime) {
      setError("App not initialized");
      return;
    }

    const verifyProgram = Effect.gen(function* () {
      const authService = yield* AuthService;
      yield* authService.verify_email(email, code);
    }).pipe(
      Effect.catchTags({
        ValidationError: () =>
          Effect.fail("Invalid email format." as const),
        AuthenticationError: () =>
          Effect.fail("Email verification failed. Please check your email and code." as const),
      }),
    );

    appRuntime.runPromise(verifyProgram).then(
      async () => {
        if (!productId) {
          setError("Product configuration not loaded. Please try again.");
          return;
        }
        setIsRedirecting(true);
        try {
          const result = await generateCheckoutLink({
            productIds: [productId],
            origin: window.location.origin,
            successUrl: window.location.origin,
          });
          if (result?.url) {
            window.location.href = result.url;
          } else {
            setError("Failed to start trial. Please try again.");
            setIsRedirecting(false);
          }
        } catch {
          setError("Failed to start trial. Please try again.");
          setIsRedirecting(false);
        }
      },
      (errorMessage) => {
        setError(errorMessage);
        setIsRedirecting(false);
      },
    );
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="/assets/yoshida_login.webp"
          alt="Man waiting at the train station"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Right side - Verify Email Form */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 bg-background px-8 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <h1 className="font-bold text-3xl leading-9 text-text font-header mb-2">
              Verify your email
            </h1>
            <p className="font-normal text-base leading-6 text-text-alt">
              Enter the verification code sent to your email address
            </p>
          </div>

          <Form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <FormField
              name="email"
              label="Email"
              placeholder="you@example.com"
            />

            <FormField
              name="code"
              label="Verification Code"
              placeholder="Enter the code from your email"
            />

            {error && (
              <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isRedirecting}
              style={
                {
                  "--hl-bg": hlButton.bg,
                  "--hl-text": hlButton.text,
                } as React.CSSProperties
              }
              className="w-full bg-(--hl-bg) text-(--hl-text) px-4 py-3 rounded-lg font-medium text-base leading-6 transition-colors mt-2 disabled:opacity-50"
            >
              {isRedirecting ? "Redirecting to checkout..." : "Verify Email"}
            </Button>

            <div className="text-center">
              <p className="font-normal text-sm leading-6 text-text-alt">
                Back to{" "}
                <Link
                  to="/login"
                  className="text-border-focus hover:underline font-medium"
                >
                  Login
                </Link>
              </p>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}

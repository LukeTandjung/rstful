import type { Route } from "./+types/verify-email";
import { Button } from "@base-ui-components/react/button";
import { Link } from "react-router";
import { useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Verify Email - RSS Reader" },
    { name: "description", content: "Verify your email address" },
  ];
}

export default function VerifyEmail() {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = () => {
    setResending(true);
    // TODO: Implement actual resend logic
    setTimeout(() => {
      setResending(false);
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    }, 1000);
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/4776b226-4f34-4fe7-ae89-3d4ab73b0ec4/generated_images/japanese-harbor-scene-with-boats-and-mou-bcad3e72-20251207045227.jpg"
          alt="Japanese harbor scene"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Right side - Verify Email Content */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 bg-background px-8 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-full bg-urgent/10 flex items-center justify-center mb-6">
              <svg
                className="w-8 h-8 text-urgent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="font-bold text-3xl leading-9 text-text mb-2">
              Verify your email
            </h1>
            <p className="font-normal text-base leading-6 text-text-alt mb-4">
              We've sent a verification link to your email address. Please check
              your inbox and click the link to verify your account.
            </p>
            <p className="font-normal text-base leading-6 text-text-alt">
              Once verified, you'll be able to access all features of RSS
              Reader.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-background-select rounded-lg p-4 border border-border-unfocus">
              <p className="font-normal text-sm leading-6 text-text-alt mb-3">
                Didn't receive the email?
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-text-alt mb-4">
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct email</li>
                <li>Wait a few minutes for the email to arrive</li>
              </ul>
              <Button
                onClick={handleResend}
                disabled={resending || resent}
                className="w-full bg-border-focus hover:bg-border-focus/80 disabled:bg-border-unfocus disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium text-sm leading-6 text-text transition-colors"
              >
                {resending
                  ? "Sending..."
                  : resent
                    ? "Email sent!"
                    : "Resend verification email"}
              </Button>
            </div>

            <Link
              to="/login"
              className="text-center w-full bg-background-select hover:bg-background-alt px-4 py-3 rounded-lg font-medium text-base leading-6 text-text transition-colors"
            >
              Back to login
            </Link>

            <div className="text-center">
              <p className="font-normal text-sm leading-6 text-text-alt">
                Need help?{" "}
                <a
                  href="mailto:support@example.com"
                  className="text-border-focus hover:underline font-medium"
                >
                  Contact support
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import type { Route } from "./+types/sign-up";
import { Form } from "@base-ui-components/react/form";
import { Button } from "@base-ui-components/react/button";
import { FormField } from "components";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sign Up - RSS Reader" },
    { name: "description", content: "Create your RSS Reader account" },
  ];
}

export default function SignUp() {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    console.log("Sign up:", {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });
    // TODO: Implement actual sign-up logic
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

      {/* Right side - Sign Up Form */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 bg-background px-8 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <h1 className="font-bold text-3xl leading-9 text-text mb-2">
              Create an account
            </h1>
            <p className="font-normal text-base leading-6 text-text-alt">
              Start managing your RSS feeds today
            </p>
          </div>

          <Form.Root onSubmit={handleSubmit} className="flex flex-col gap-6">
            <FormField
              name="name"
              label="Name"
              placeholder="Your full name"
            />

            <FormField
              name="email"
              label="Email"
              placeholder="you@example.com"
            />

            <FormField
              name="password"
              label="Password"
              placeholder="Create a password"
            />

            <Button
              type="submit"
              className="w-full bg-border-focus hover:bg-border-focus/80 px-4 py-3 rounded-lg font-medium text-base leading-6 text-text transition-colors mt-2"
            >
              Sign Up
            </Button>

            <div className="text-center">
              <p className="font-normal text-sm leading-6 text-text-alt">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-border-focus hover:underline font-medium"
                >
                  Login
                </Link>
              </p>
            </div>
          </Form.Root>
        </div>
      </div>
    </div>
  );
}
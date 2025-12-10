import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
import { type RandomReader, generateRandomString } from "@oslojs/crypto/random";
import { Effect, Data } from "effect";

class EmailSendError extends Data.TaggedError("EmailSendError")<{
  readonly cause: unknown;
}> {}

const sendVerificationEmail = (email: string, token: string) =>
  Effect.tryPromise({
    try: async () => {
      const resend = new ResendAPI(process.env.AUTH_RESEND_KEY!);
      const result = await resend.emails.send({
        from: "RSS Reader <noreply@rstful.com>",
        to: [email],
        subject: `Verify your email for RSS Reader`,
        text: `Your email verification code is ${token}`,
      });

      if (result.error) {
        console.error("Resend API error:", result.error);
        throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
      }

      return result;
    },
    catch: (cause) => {
      console.error("Email send error:", cause);
      return new EmailSendError({ cause });
    },
  });

const generateVerificationToken = () =>
  Effect.sync(() => {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };

    const alphabet = "0123456789";
    const length = 8;
    return generateRandomString(random, alphabet, length);
  });

export const ResendOTPEmailVerification = Resend({
  id: "resend-otp-verification",
  apiKey: process.env.AUTH_RESEND_KEY!,
  async generateVerificationToken() {
    return Effect.runPromise(generateVerificationToken());
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    await Effect.runPromise(sendVerificationEmail(email, token));
  },
});

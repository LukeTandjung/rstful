import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
import { type RandomReader, generateRandomString } from "@oslojs/crypto/random";
import { Effect, Data } from "effect";

class EmailSendError extends Data.TaggedError("EmailSendError")<{
  readonly cause: unknown;
}> {}

const sendPasswordResetEmail = (email: string, token: string) =>
  Effect.tryPromise({
    try: () => {
      const resend = new ResendAPI(process.env.AUTH_RESEND_KEY!);
      return resend.emails.send({
        from: "RSS Reader <onboarding@resend.dev>",
        to: [email],
        subject: `Reset your password in RSS Reader`,
        text: `Your password reset code is ${token}`,
      });
    },
    catch: (cause) => new EmailSendError({ cause }),
  }).pipe(
    Effect.flatMap((result) =>
      result.error
        ? Effect.fail(new EmailSendError({ cause: result.error }))
        : Effect.succeed(result),
    ),
  );

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

export const ResendOTPPasswordReset = Resend({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY!,
  async generateVerificationToken() {
    return Effect.runPromise(generateVerificationToken());
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    await Effect.runPromise(sendPasswordResetEmail(email, token));
  },
});

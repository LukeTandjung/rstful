import { Brand } from "effect";

// In order, this defines:
// 1. The Email branded type, and the corresponding
//    constructor using 'refined' to enforce email values.
// 2. The Password branded type, and the corresponding
//    constructor using 'refined' to enforce password requirements.

export type Email = string & Brand.Brand<"Email">;
export const Email = Brand.refined<Email>(
  (email_string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_string),
  (_) => Brand.error("Invalid email"),
);

export type Password = string & Brand.Brand<"Password">;
export const Password = Brand.refined<Password>(
  (password) => /^(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/.test(password),
  (_) =>
    Brand.error(
      "Your password is either shorter than 8 characters, or missing a number and special character",
    ),
);

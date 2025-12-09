import { Data } from "effect";

export class AuthenticationError extends Data.TaggedError(
  "AuthenticationError",
)<Readonly<{}>> {}

export class ValidationError extends Data.TaggedError("ValidationError")<
  Readonly<{}>
> {}

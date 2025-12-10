import { Data } from "effect";

export class RssFeedQueryError extends Data.TaggedError("RssFeedQueryError")<{
  readonly message: string;
}> {}

export class RssFeedMutationError extends Data.TaggedError("RssFeedMutationError")<{
  readonly message: string;
}> {}

export class RssFeedValidationError extends Data.TaggedError("RssFeedValidationError")<{
  readonly message: string;
}> {}

# Welcome to your Convex functions directory!

Write your Convex functions here.
See https://docs.convex.dev/functions for more.

## Using Effect-TS with Convex

This guide shows how to use Effect-TS patterns when consuming Convex functions in React (frontend).

## Why Not Use Effect-TS in Convex Backend?

**Convex's tight coupling of backend + database is incompatible with Effect-TS's philosophy:**

- **Convex**: Backend and database are unified. `ctx.db` is provided by Convex's runtime and cannot be easily mocked or swapped
- **Effect-TS**: Designed for dependency injection and testability through Layers/Services
- **The mismatch**: Effect's main advantage (mocking services for testing) doesn't work well with Convex's `ctx` magic

**Recommendation:** Use Convex's native patterns for queries/mutations. Use Effect-TS in the frontend and for complex business logic outside of Convex.

---

## Frontend: Consuming Convex with Effect-TS in React

### Effect Service Layer (Recommended)

Create a unified database service that wraps Convex operations:

```ts
// app/services/database.ts
import { Effect, Context, Layer, Data, pipe } from "effect";
import { ConvexReactClient } from "convex/react";
import { api } from "convex/_generated/api";

// Define errors using Data.TaggedError
export class QueryError extends Data.TaggedError("QueryError")<{
  readonly message: string;
}> {}

export class MutationError extends Data.TaggedError("MutationError")<{
  readonly message: string;
}> {}

// Define the service interface
export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  {
    readonly queryMessages: (args: { first: number; second: string }) =>
      Effect.Effect<Array<any>, QueryError>;
    readonly createMessage: (args: { first: string; second: string }) =>
      Effect.Effect<any, MutationError>;
  }
>() {}

// Create Layer that provides DatabaseService
export const makeDatabaseServiceLive = (client: ConvexReactClient) =>
  Layer.succeed(DatabaseService, {
    queryMessages: (args) =>
      Effect.tryPromise({
        try: () => client.query(api.myFunctions.myQueryFunction, args),
        catch: (error) => new QueryError({ message: String(error) })
      }),
    createMessage: (args) =>
      Effect.tryPromise({
        try: () => client.mutation(api.myFunctions.myMutationFunction, args),
        catch: (error) => new MutationError({ message: String(error) })
      })
  });
```

### Using the Service in Components

```tsx
// app/components/MessageList.tsx
import { useEffect, useState } from "react";
import { Effect, pipe } from "effect";
import { useConvex } from "convex/react";
import { DatabaseService, makeDatabaseServiceLive } from "services/database";

export function MessageList() {
  const [messages, setMessages] = useState<Array<any>>([]);
  const [error, setError] = useState<string | null>(null);
  const client = useConvex();

  useEffect(() => {
    const program = pipe(
      DatabaseService,
      Effect.flatMap((db) => db.queryMessages({ first: 10, second: "hello" })),
      Effect.tap((msgs) => Effect.sync(() => setMessages(msgs))),
      Effect.provide(makeDatabaseServiceLive(client)),
      Effect.catchAll((error) =>
        Effect.sync(() => setError(error.message))
      )
    );

    Effect.runPromise(program);
  }, [client]);

  if (error) return <div>Error: {error}</div>;
  return <div>{/* render messages */}</div>;
}
```

### Using Mutations with the Service

```tsx
// app/components/MessageForm.tsx
import { useState } from "react";
import { Effect, Data, pipe } from "effect";
import { useConvex } from "convex/react";
import { DatabaseService, makeDatabaseServiceLive } from "services/database";

export function MessageForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const client = useConvex();

  const handleSubmit = (first: string, second: string) => {
    const program = pipe(
      Effect.sync(() => setStatus("submitting")),
      Effect.flatMap(() => DatabaseService),
      Effect.flatMap((db) => db.createMessage({ first, second })),
      Effect.tap((result) =>
        Effect.sync(() => {
          console.log("Message created:", result);
          setStatus("success");
        })
      ),
      Effect.provide(makeDatabaseServiceLive(client)),
      Effect.catchTag("MutationError", (error) =>
        Effect.sync(() => {
          console.error("Failed:", error.message);
          setStatus("error");
        })
      )
    );

    Effect.runPromise(program);
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit("Hello!", "me");
    }}>
      <button disabled={status === "submitting"}>
        {status === "submitting" ? "Submitting..." : "Submit"}
      </button>
      {status === "error" && <p>Error submitting message</p>}
      {status === "success" && <p>Message created!</p>}
    </form>
  );
}
```

---

## Recommendation

**Use Effect-TS in the Frontend:**
- Create a **unified DatabaseService Layer** wrapping Convex operations
- Use pipe syntax for composing database calls with business logic
- Handle errors with Effect.catchTag for specific error types
- Benefits: type-safe operations, centralized error handling, easy testing, composability

**Use Convex Natively in the Backend:**
- Write queries/mutations using Convex's standard patterns
- Use `ctx.db` directly without wrapping in Effect
- Test using Convex's built-in test environment
- Keep backend logic simple and focused

**Key Effect-TS Patterns for Frontend:**
- Use `Data.TaggedError` for error definitions (not plain classes)
- Use `Layer.succeed` for simple services, `Layer.effect` for services with dependencies
- Use `Effect.provide` to supply Layer implementations
- Compose layers with `Layer.provide`
- Default to pipe syntax, use Effect.gen only when justified (multiple value references)

---

Use the Convex CLI to push your functions to a deployment. See everything
the Convex CLI can do by running `npx convex -h` in your project root
directory. To learn more, launch the docs with `npx convex docs`.

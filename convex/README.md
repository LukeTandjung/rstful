# Welcome to your Convex functions directory!

Write your Convex functions here.
See https://docs.convex.dev/functions for more.

## Using Effect-TS with Convex

This guide shows how to use Effect-TS patterns both inside Convex functions (backend) and when consuming them in React (frontend).

---

## Backend: Effect-TS Inside Convex Functions

### Basic Query with Effect

```ts
// convex/myFunctions.ts
import { query } from "./_generated/server";
import { v } from "convex/values";
import { Effect, pipe } from "effect";

export const myQueryFunction = query({
  args: {
    first: v.number(),
    second: v.string(),
  },
  handler: async (ctx, args) => {
    // Wrap Convex operations in Effect for composability
    const program = pipe(
      Effect.promise(() => ctx.db.query("tablename").collect()),
      Effect.tap((documents) =>
        Effect.sync(() => console.log(args.first, args.second))
      ),
      Effect.map((documents) => {
        // Transform, filter, or process documents here
        return documents;
      })
    );

    // Run the Effect program and return the result
    return Effect.runPromise(program);
  },
});
```

### Mutation with Proper Error Handling

```ts
// convex/myFunctions.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Effect, Data, pipe } from "effect";

// Define custom error types using Data.TaggedError
class MessageInsertError extends Data.TaggedError("MessageInsertError")<{
  readonly message: string;
}> {}

class DocumentNotFoundError extends Data.TaggedError("DocumentNotFoundError")<{
  readonly id: string;
}> {}

export const myMutationFunction = mutation({
  args: {
    first: v.string(),
    second: v.string(),
  },
  handler: async (ctx, args) => {
    const program = pipe(
      Effect.succeed({ body: args.first, author: args.second }),
      Effect.flatMap((message) =>
        Effect.tryPromise({
          try: () => ctx.db.insert("messages", message),
          catch: (error) => new MessageInsertError({ message: String(error) }),
        })
      ),
      Effect.flatMap((id) =>
        pipe(
          Effect.promise(() => ctx.db.get(id)),
          Effect.flatMap((doc) =>
            doc
              ? Effect.succeed(doc)
              : Effect.fail(new DocumentNotFoundError({ id: id.toString() }))
          )
        )
      ),
      Effect.catchAll((error) =>
        Effect.succeed({ error: error._tag })
      )
    );

    return Effect.runPromise(program);
  },
});
```

### Services & Layers with Pipe Syntax

```ts
// convex/services/validation.ts
import { Effect, Context, Layer, Data, pipe } from "effect";

// Define custom error using Data.TaggedError
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly reason: string;
}> {}

// Define service interface
export class ValidationService extends Context.Tag("ValidationService")<
  ValidationService,
  {
    readonly validateMessage: (body: string) => Effect.Effect<string, ValidationError>;
  }
>() {}

// Create Layer for service implementation
export const ValidationServiceLive = Layer.succeed(ValidationService, {
  validateMessage: (body: string) =>
    pipe(
      Effect.sync(() => body.trim()),
      Effect.flatMap((trimmed) =>
        trimmed.length === 0 || trimmed.length > 500
          ? Effect.fail(new ValidationError({ reason: "Message must be 1-500 characters" }))
          : Effect.succeed(trimmed)
      )
    ),
});

// convex/myFunctions.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Effect, pipe } from "effect";
import { ValidationService, ValidationServiceLive } from "./services/validation";

export const createMessage = mutation({
  args: {
    body: v.string(),
    author: v.string(),
  },
  handler: async (ctx, args) => {
    const program = pipe(
      ValidationService,
      Effect.flatMap((validation) => validation.validateMessage(args.body)),
      Effect.flatMap((validBody) =>
        Effect.promise(() =>
          ctx.db.insert("messages", { body: validBody, author: args.author })
        )
      ),
      Effect.map((id) => ({ id })),
      Effect.provide(ValidationServiceLive),
      Effect.catchTag("ValidationError", (error) =>
        Effect.fail(new Error(`Validation failed: ${error.reason}`))
      )
    );

    return Effect.runPromise(program);
  },
});
```

### Composing Multiple Services

```ts
// convex/services/config.ts
import { Context, Layer } from "effect";

export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  {
    readonly maxMessageLength: number;
    readonly minMessageLength: number;
  }
>() {}

export const ConfigServiceLive = Layer.succeed(ConfigService, {
  maxMessageLength: 500,
  minMessageLength: 1,
});

// convex/services/validation.ts - Updated to depend on ConfigService
import { Effect, Context, Layer, Data, pipe } from "effect";
import { ConfigService } from "./config";

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly reason: string;
}> {}

export class ValidationService extends Context.Tag("ValidationService")<
  ValidationService,
  {
    readonly validateMessage: (body: string) => Effect.Effect<string, ValidationError>;
  }
>() {}

// Layer with dependencies - use Effect.gen when closing over dependencies
export const ValidationServiceLive = Layer.effect(
  ValidationService,
  Effect.gen(function* () {
    // Access config during construction - justifies Effect.gen
    const config = yield* ConfigService;

    // Return service implementation that closes over config
    return {
      validateMessage: (body: string) =>
        pipe(
          Effect.sync(() => body.trim()),
          Effect.flatMap((trimmed) =>
            trimmed.length < config.minMessageLength ||
            trimmed.length > config.maxMessageLength
              ? Effect.fail(
                  new ValidationError({
                    reason: `Message must be ${config.minMessageLength}-${config.maxMessageLength} characters`,
                  })
                )
              : Effect.succeed(trimmed)
          )
        ),
    };
  })
);

// convex/myFunctions.ts - Composing multiple layers
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Effect, Layer, pipe } from "effect";
import { ValidationService, ValidationServiceLive } from "./services/validation";
import { ConfigServiceLive } from "./services/config";

export const createMessage = mutation({
  args: {
    body: v.string(),
    author: v.string(),
  },
  handler: async (ctx, args) => {
    const program = pipe(
      ValidationService,
      Effect.flatMap((validation) => validation.validateMessage(args.body)),
      Effect.flatMap((validBody) =>
        Effect.promise(() =>
          ctx.db.insert("messages", { body: validBody, author: args.author })
        )
      ),
      Effect.map((id) => ({ id }))
    );

    // Compose layers: ValidationService depends on ConfigService
    const AppLayer = pipe(
      ValidationServiceLive,
      Layer.provide(ConfigServiceLive)
    );

    return Effect.runPromise(
      pipe(
        program,
        Effect.provide(AppLayer),
        Effect.catchAll((error) =>
          Effect.succeed({ error: String(error) })
        )
      )
    );
  },
});
```

### When to Use Effect.gen vs Pipe

**Use pipe (default):**
- Linear transformations where each step depends only on the previous value
- Clear left-to-right data flow
- You're transforming a single value through multiple steps

**Use Effect.gen (rare exceptions):**
- Building service implementations that close over dependencies (like ValidationServiceLive above)
- Need to reference multiple earlier values from different steps
- Complex branching logic where intermediate named values improve clarity

**Example justifying Effect.gen:**
```ts
// Needs Effect.gen - references validBody AND user in final return
const program = Effect.gen(function* () {
  const user = yield* getUser(userId);
  const validBody = yield* validateMessage(body);
  const id = yield* insertMessage(validBody, user.id);

  // Both user and validBody needed here
  return { id, body: validBody, author: user.name, email: user.email };
});

// vs with pipe - would need nested flatMaps and lose clarity
```

---

## Frontend: Consuming Convex with Effect-TS in React

### Option 1: Effect Service Layer (Recommended)

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

**Backend (Convex):**
- Use Effect for complex business logic, validation, and error handling
- Prefer **pipe syntax** for linear transformations
- Use Effect.gen only when closing over dependencies or referencing multiple earlier values
- Create services with Context.Tag and Layers for reusable logic

**Frontend (React):**
- Create a **unified DatabaseService Layer** wrapping all Convex operations
- Use pipe syntax for composing database calls with business logic
- Handle errors with Effect.catchTag for specific error types
- Benefits: type-safe operations, centralized error handling, easy testing, composability

**Key Patterns:**
- Use `Data.TaggedError` for error definitions (not plain classes)
- Use `Layer.succeed` for simple services, `Layer.effect` for services with dependencies
- Use `Effect.provide` to supply Layer implementations
- Compose layers with `Layer.provide` (not `Layer.merge` unless parallel)
- Default to pipe, use Effect.gen only when justified

---

Use the Convex CLI to push your functions to a deployment. See everything
the Convex CLI can do by running `npx convex -h` in your project root
directory. To learn more, launch the docs with `npx convex docs`.

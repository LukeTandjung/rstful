import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  // Override users table to add required fields
  users: defineTable({
    name: v.string(),
    email: v.string(),
    image: v.optional(v.id("_storage")),
  }),
});

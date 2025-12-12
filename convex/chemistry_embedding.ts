import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const chemistryCriteriaValidator = v.object({
  epistemic_architecture: v.object({
    primary_mode: v.string(),
    evidence_hierarchy: v.array(v.string()),
    certainty_stance: v.string(),
    knowledge_model: v.string(),
  }),
  value_hierarchy: v.object({
    primary_good: v.string(),
    non_negotiables: v.array(v.string()),
    typical_tradeoffs: v.string(),
    moral_foundations: v.object({
      care_vs_harm: v.number(),
      fairness_vs_cheating: v.number(),
      loyalty_vs_betrayal: v.number(),
      authority_vs_subversion: v.number(),
      sanctity_vs_degradation: v.number(),
      liberty_vs_oppression: v.number(),
    }),
  }),
  cognitive_fingerprint: v.object({
    reasoning_pattern: v.string(),
    abstraction_level: v.string(),
    recurrent_metaphors: v.array(v.string()),
    mental_toolkit: v.array(v.string()),
  }),
  temporal_orientation: v.object({
    past_weight: v.number(),
    present_weight: v.number(),
    future_weight: v.number(),
    change_velocity: v.string(),
  }),
  aspirational_vector: v.object({
    target_state: v.string(),
    utopia_distance: v.number(),
    action_orientation: v.string(),
  }),
  affective_signature: v.object({
    emotional_register: v.string(),
    energy_level: v.string(),
    conflict_stance: v.string(),
  }),
  communication_geometry: v.object({
    density: v.string(),
    formality: v.string(),
    audience_assumption: v.string(),
  }),
  edge_or_center: v.object({
    contrarian_score: v.number(),
    orthodoxy_alignment: v.string(),
    risk_tolerance: v.string(),
  }),
});

export const get_chemistry_embedding = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const embedding = await ctx.db
      .query("chemistry_embedding")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
      .first();
    return embedding;
  },
});

export const upsert_chemistry_embedding = mutation({
  args: {
    user_id: v.id("users"),
    criteria: chemistryCriteriaValidator,
  },
  handler: async (ctx, args) => {
    const now = BigInt(Date.now());

    const existing = await ctx.db
      .query("chemistry_embedding")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        criteria: args.criteria,
        updated_at: now,
      });
      return existing._id;
    }

    const newId = await ctx.db.insert("chemistry_embedding", {
      user_id: args.user_id,
      criteria: args.criteria,
      created_at: now,
      updated_at: now,
    });
    return newId;
  },
});

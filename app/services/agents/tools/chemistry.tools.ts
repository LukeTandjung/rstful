import type { Id, Doc } from "convex/_generated/dataModel";
import type { ChemistryCriteria, StoredChemistryCriteria } from "../agents.types";

export interface ChemistryToolDependencies {
  getChemistryEmbedding: (args: {
    user_id: Id<"users">;
  }) => Promise<Doc<"chemistry_embedding"> | null>;
  upsertChemistryEmbedding: (args: {
    user_id: Id<"users">;
    criteria: ChemistryCriteria;
  }) => Promise<Id<"chemistry_embedding">>;
}

export function createChemistryTools(
  userId: Id<"users">,
  deps: ChemistryToolDependencies
) {
  async function fetchUserChemistry(): Promise<StoredChemistryCriteria | null> {
    const result = await deps.getChemistryEmbedding({ user_id: userId });
    if (!result) return null;
    return {
      userId: result.user_id,
      criteria: result.criteria as ChemistryCriteria,
      createdAt: Number(result.created_at),
      updatedAt: Number(result.updated_at),
    };
  }

  async function saveUserChemistry(criteria: ChemistryCriteria): Promise<string> {
    const id = await deps.upsertChemistryEmbedding({ user_id: userId, criteria });
    return `Chemistry profile saved successfully with id: ${id}`;
  }

  return { fetchUserChemistry, saveUserChemistry };
}

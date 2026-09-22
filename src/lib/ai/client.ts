import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { BetaMessage, BetaMessageParam, BetaTool, BetaToolUnion } from "@anthropic-ai/sdk/resources/beta/messages/messages";

export const MODEL = "claude-opus-5";

/** Bascule serveur automatique vers un autre modèle si une requête est refusée. */
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;
export function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AIError("ANTHROPIC_API_KEY n'est pas configurée.", 500);
  }
  client ??= new Anthropic();
  return client;
}

export class AIError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

export const WEB_TOOLS: BetaToolUnion[] = [
  { type: "web_search_20260209", name: "web_search", max_uses: 8 },
  { type: "web_fetch_20260209", name: "web_fetch", max_uses: 6 },
];

interface RunOptions {
  system: string;
  prompt: string;
  tools: BetaToolUnion[];
  /** Nom de l'outil client que Claude doit appeler pour rendre son résultat. */
  resultTool: string;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}

/**
 * Lance une requête avec outils serveur (recherche web) et un outil client « de rendu ».
 * Gère les pauses du serveur (pause_turn) et renvoie l'input brut de l'outil de rendu.
 */
export async function runForToolResult({
  system,
  prompt,
  tools,
  resultTool,
  effort = "medium",
  maxTokens = 32000,
}: RunOptions): Promise<unknown> {
  const messages: BetaMessageParam[] = [{ role: "user", content: prompt }];

  for (let attempt = 0; attempt < 6; attempt++) {
    let response: BetaMessage;
    try {
      response = await anthropic()
        .beta.messages.stream({
          model: MODEL,
          max_tokens: maxTokens,
          betas: [FALLBACK_BETA],
          fallbacks: "default",
          cache_control: { type: "ephemeral" },
          thinking: { type: "adaptive" },
          output_config: { effort },
          system,
          tools: tools.map((t) => ("input_schema" in t ? { ...t, eager_input_streaming: true } : t)),
          messages,
        })
        .finalMessage();
    } catch (error) {
      throw toAIError(error);
    }

    if (response.stop_reason === "refusal") {
      throw new AIError("La requête a été refusée par le modèle. Reformule et réessaie.");
    }

    if (response.stop_reason === "max_tokens") {
      throw new AIError("Réponse tronquée (limite de tokens atteinte). Réessaie.");
    }

    // L'input est streamé sans validation serveur : l'appelant le valide avec zod.
    const toolUse = response.content.find((b) => b.type === "tool_use" && b.name === resultTool);
    if (toolUse && toolUse.type === "tool_use") return toolUse.input;

    if (response.stop_reason === "pause_turn") {
      // Le serveur a atteint sa limite d'itérations : on renvoie le tour pour qu'il reprenne.
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    // Claude a fini sans appeler l'outil : on lui rappelle une fois.
    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: `Appelle maintenant l'outil \`${resultTool}\` avec ton résultat final.`,
    });
  }

  throw new AIError("Aucun résultat exploitable après plusieurs tentatives.");
}

export function toAIError(error: unknown): AIError {
  if (error instanceof AIError) return error;
  if (error instanceof Anthropic.AuthenticationError) return new AIError("Clé API Anthropic invalide.", 500);
  if (error instanceof Anthropic.RateLimitError) return new AIError("Limite de requêtes atteinte, réessaie dans une minute.", 429);
  if (error instanceof Anthropic.BadRequestError) return new AIError(`Requête invalide : ${error.message}`, 500);
  if (error instanceof Anthropic.APIError) return new AIError(`Erreur API (${error.status}) : ${error.message}`);
  if (error instanceof Error) return new AIError(error.message);
  return new AIError("Erreur inconnue.");
}

/** Convertit un schéma zod en input_schema d'outil. */
export function toolSchema(schema: z.ZodType): BetaTool.InputSchema {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json as BetaTool.InputSchema;
}

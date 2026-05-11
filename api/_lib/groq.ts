/**
 * Shared helpers for /api/ai/* Vercel Edge Functions. Centralizes the
 * Groq request pattern, error handling, and response sanitization so each
 * endpoint can focus on its specific input validation + prompt.
 *
 * `_lib/` is ignored as a route by Vercel (leading underscore convention).
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

export const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

/**
 * Internal log prefix tag for each Edge endpoint — keeps the per-endpoint
 * console.error lines greppable in Vercel function logs.
 */
type LogTag = string;

/**
 * Call Groq's chat completions with JSON mode. On success returns the
 * parsed JSON the model produced. On any failure (network / non-2xx /
 * bad parse / missing content), logs server-side and returns a Response
 * with a generic body that the caller should forward to the client.
 *
 * Caller pattern:
 *   const groqResult = await callGroqJson({ tag, system, user });
 *   if (groqResult.kind === "error") return groqResult.response;
 *   // groqResult.kind === "ok": use groqResult.parsed
 */
export type GroqJsonResult =
  | { kind: "ok"; parsed: unknown }
  | { kind: "error"; response: Response };

export async function callGroqJson(opts: {
  tag: LogTag;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  model?: string;
}): Promise<GroqJsonResult> {
  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) {
    return {
      kind: "error",
      response: json({ error: "GROQ_API_KEY not configured" }, 503),
    };
  }

  let groqRes: Response;
  try {
    groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model ?? DEFAULT_MODEL,
        temperature: opts.temperature ?? 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: opts.systemPrompt },
          { role: "user", content: opts.userPrompt },
        ],
      }),
    });
  } catch (err) {
    console.error(`[${opts.tag}] groq fetch failed:`, err);
    return { kind: "error", response: json({ error: "upstream unavailable" }, 502) };
  }

  if (!groqRes.ok) {
    const text = await groqRes.text().catch(() => "");
    console.error(`[${opts.tag}] groq returned ${groqRes.status}:`, text.slice(0, 500));
    return { kind: "error", response: json({ error: "upstream error" }, 502) };
  }

  let completion: unknown;
  try {
    completion = await groqRes.json();
  } catch (err) {
    console.error(`[${opts.tag}] groq returned non-json:`, err);
    return { kind: "error", response: json({ error: "upstream parse error" }, 502) };
  }

  const content = (
    completion as { choices?: { message?: { content?: string } }[] }
  )?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    console.error(`[${opts.tag}] groq response missing content`);
    return { kind: "error", response: json({ error: "upstream malformed" }, 502) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    console.error(
      `[${opts.tag}] model returned invalid json:`,
      err,
      "content:",
      content.slice(0, 500),
    );
    return { kind: "error", response: json({ error: "model output invalid" }, 502) };
  }

  return { kind: "ok", parsed };
}

/** Tight numeric guard: must be a finite number in `[min, max]`. */
export const clampInRange = (
  v: unknown,
  min: number,
  max: number,
): number | undefined => {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  if (v < min || v > max) return undefined;
  return v;
};

/** Filter an unknown-shape array to numeric IDs that appear in `allowed`. */
export const allowedIds = (
  raw: unknown,
  allowed: Set<number>,
  cap = 5,
): number[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((id): id is number => typeof id === "number" && allowed.has(id))
    .slice(0, cap);
};

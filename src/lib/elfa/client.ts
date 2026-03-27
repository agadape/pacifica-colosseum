/**
 * Elfa AI client — social sentiment + market commentary.
 */

const ELFA_API_KEY = process.env.ELFA_API_KEY;
const ELFA_BASE_URL = "https://api.elfa.ai/v1";

interface SentimentResult {
  symbol: string;
  score: number; // -100 to 100
  label: "bearish" | "neutral" | "bullish";
  volume: number; // social mentions
}

interface CommentaryResult {
  text: string;
  generatedAt: string;
}

/**
 * Fetch social sentiment for a symbol.
 */
export async function getSentiment(symbol: string): Promise<SentimentResult> {
  if (!ELFA_API_KEY) {
    return { symbol, score: 0, label: "neutral", volume: 0 };
  }

  try {
    const res = await fetch(`${ELFA_BASE_URL}/sentiment?symbol=${symbol}`, {
      headers: { "x-api-key": ELFA_API_KEY },
    });

    if (!res.ok) {
      return { symbol, score: 0, label: "neutral", volume: 0 };
    }

    const data = await res.json();
    const score = data.data?.score ?? data.score ?? 0;
    const volume = data.data?.volume ?? data.volume ?? 0;

    let label: "bearish" | "neutral" | "bullish" = "neutral";
    if (score > 20) label = "bullish";
    if (score < -20) label = "bearish";

    return { symbol, score, label, volume };
  } catch {
    return { symbol, score: 0, label: "neutral", volume: 0 };
  }
}

/**
 * Generate AI market commentary for an arena context.
 */
export async function generateCommentary(context: {
  arenaName: string;
  roundNumber: number;
  roundName: string;
  activeTraders: number;
  topSymbols: string[];
}): Promise<CommentaryResult> {
  if (!ELFA_API_KEY) {
    return {
      text: `Round ${context.roundNumber}: ${context.roundName} — ${context.activeTraders} traders competing across ${context.topSymbols.join(", ")}.`,
      generatedAt: new Date().toISOString(),
    };
  }

  try {
    const res = await fetch(`${ELFA_BASE_URL}/commentary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ELFA_API_KEY,
      },
      body: JSON.stringify({
        prompt: `Generate a brief, exciting commentary for a trading competition. Arena: "${context.arenaName}", Round ${context.roundNumber} (${context.roundName}), ${context.activeTraders} traders remaining, trading ${context.topSymbols.join(", ")}. Keep it under 2 sentences, dramatic but informative.`,
      }),
    });

    if (!res.ok) {
      return {
        text: `Round ${context.roundNumber}: ${context.roundName} is underway with ${context.activeTraders} traders.`,
        generatedAt: new Date().toISOString(),
      };
    }

    const data = await res.json();
    return {
      text: data.data?.text ?? data.text ?? `${context.roundName} continues...`,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      text: `${context.roundName} — ${context.activeTraders} traders remain.`,
      generatedAt: new Date().toISOString(),
    };
  }
}

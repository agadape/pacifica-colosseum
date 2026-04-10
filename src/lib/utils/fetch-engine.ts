/**
 * Fetch wrapper for engine internal calls with simple retry.
 * Retries once after 800ms on network error or 5xx response.
 * Returns the Response object — caller handles res.ok check.
 */
export async function fetchEngine(
  url: string,
  options: RequestInit,
  retries = 1
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      // Only retry on server errors (5xx), not client errors (4xx)
      if (res.status >= 500 && attempt < retries) {
        await new Promise(r => setTimeout(r, 800));
        continue;
      }
      return res;
    } catch (err) {
      // Network error — retry if attempts remain
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 800));
        continue;
      }
      throw err;
    }
  }
  // Unreachable but satisfies TypeScript
  throw new Error("fetchEngine: exhausted retries");
}

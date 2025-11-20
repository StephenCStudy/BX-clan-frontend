// client/src/utils/callBackend.ts
/**
 * Ping backend with retry logic — useful to wake Render/Vercel-like services.
 * @param url endpoint to call
 * @param retries number of attempts (default 5)
 * @param delay ms delay between retries (default 1000)
 */
export async function callBackend(
  url: string,
  retries = 5,
  delay = 1000
): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`Status ${res.status}`);

      // try to parse JSON; if endpoint returns empty body this will throw
      const text = await res.text();
      try {
        return text ? JSON.parse(text) : null;
      } catch {
        // not JSON, return raw text
        return text;
      }
    } catch (err: any) {
      // log attempt
      // Use console.debug so regular logs aren't noisy; still visible during development
      console.debug(
        `callBackend attempt ${i + 1} failed:`,
        err?.message || err
      );
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw new Error("Backend not ready after multiple attempts");
    }
  }
}
export default async function handler(request, context) {
  // Default to the Google APIs origin; override with PROXY_ORIGIN if needed.
  const origin = Deno.env.get("PROXY_ORIGIN") || "https://www.googleapis.com";

  const incoming = new URL(request.url);
  const target = new URL(origin);
  // Preserve the request path and query while switching to the origin host.
  target.pathname = incoming.pathname;
  target.search = incoming.search;

  // Forward every header the user sent. `Host` is a forbidden header for
  // fetch(), so we drop it and let fetch derive the correct Host/SNI from the
  // target URL — otherwise the origin would receive the netlify.app host and
  // TLS would break.
  const headers = new Headers(request.headers);
  headers.delete("host");

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  // Only methods that can carry a body should forward one.
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    // Required by Deno/undici when streaming a request body.
    init.duplex = "half";
  }

  try {
    return await fetch(target.toString(), init);
  } catch (error) {
    return new Response(`Proxy error: ${error.message}`, { status: 502 });
  }
}

// Route every request through this function.
export const config = { path: "/*" };

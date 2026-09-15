/**
 * Resolves which API keys a server route should use: a per-user key from
 * the client (if they added one in Settings) takes priority, falling back
 * to the team's shared server-side key from environment variables. This
 * lets the app work out of the box for everyone on the team without
 * requiring individual sign-ups, while still letting anyone plug in their
 * own key for extra personal capacity if the shared pool runs low.
 */
export function resolveKeys(clientSerperKey?: string, clientSerpapiKey?: string) {
  return {
    serperKey: clientSerperKey || process.env.SERPER_API_KEY || undefined,
    serpapiKey: clientSerpapiKey || process.env.SERPAPI_API_KEY || undefined,
  };
}

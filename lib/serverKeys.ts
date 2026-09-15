/**
 * Resolves which API keys a server route should use: a per-user key from
 * the client (if they added one in Settings) takes priority, falling back
 * to the team's shared server-side key(s) from environment variables. This
 * lets the app work out of the box for everyone on the team without
 * requiring individual sign-ups, while still letting anyone plug in their
 * own key for extra personal capacity if the shared pool runs low.
 *
 * Serper supports a stack of keys (SERPER_API_KEY, then SERPER_API_KEY_2)
 * so a second account's free pool kicks in automatically once the first is
 * exhausted, before ever falling back to SerpApi.
 */
export function resolveKeys(clientSerperKey?: string, clientSerpapiKey?: string) {
  const serverSerperKeys = [process.env.SERPER_API_KEY, process.env.SERPER_API_KEY_2].filter(
    (k): k is string => Boolean(k)
  );

  // A personal client key is tried first (it's the user's own capacity),
  // then the shared server-side keys in order.
  const serperKeys = clientSerperKey ? [clientSerperKey, ...serverSerperKeys] : serverSerperKeys;

  return {
    serperKeys,
    serpapiKey: clientSerpapiKey || process.env.SERPAPI_API_KEY || undefined,
  };
}

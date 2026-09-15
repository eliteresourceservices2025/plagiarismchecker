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
 *
 * Each key is labeled `shared` or not — only usage against a *shared*
 * (server env var) key gets recorded to the shared credit store (see
 * lib/creditStore.ts). A personal key someone added themselves is their
 * own account, not the team's, so it isn't tracked there.
 */
export interface ResolvedKeys {
  /** Ordered — tried in sequence. */
  serperKeys: string[];
  /** Parallel to `serperKeys`: true where that key is a shared server-side one. */
  serperKeysAreShared: boolean[];
  serpapiKey?: string;
  serpapiKeyIsShared: boolean;
}

export function getServerSerperKeys(): string[] {
  return [process.env.SERPER_API_KEY, process.env.SERPER_API_KEY_2].filter(
    (k): k is string => Boolean(k)
  );
}

export function resolveKeys(clientSerperKey?: string, clientSerpapiKey?: string): ResolvedKeys {
  const serverSerperKeys = getServerSerperKeys();

  const serperKeys: string[] = [];
  const serperKeysAreShared: boolean[] = [];

  // A personal client key is tried first (it's the user's own capacity),
  // then the shared server-side keys in order.
  if (clientSerperKey) {
    serperKeys.push(clientSerperKey);
    serperKeysAreShared.push(false);
  }
  for (const key of serverSerperKeys) {
    serperKeys.push(key);
    serperKeysAreShared.push(true);
  }

  const serpapiKey = clientSerpapiKey || process.env.SERPAPI_API_KEY || undefined;
  const serpapiKeyIsShared = !clientSerpapiKey && Boolean(process.env.SERPAPI_API_KEY);

  return { serperKeys, serperKeysAreShared, serpapiKey, serpapiKeyIsShared };
}

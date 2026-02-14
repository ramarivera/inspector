import { authFetch } from "@/lib/session-token";
import { buildResourceMetadataUrl } from "./state-machines/shared/helpers";

export function isLikelyOAuthRequiredConnectionError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("unauthorized") ||
    m.includes("non-200 status code (401)") ||
    m.includes("non-200 status code ( 401") ||
    m.includes("http 401")
  );
}

export async function serverAdvertisesOAuth(serverUrl: string): Promise<boolean> {
  // Use the backend metadata proxy to bypass CORS and keep behavior consistent
  // across Electron/hosted environments.
  const prmUrl = buildResourceMetadataUrl(serverUrl);
  const res = await authFetch(
    `/api/mcp/oauth/metadata?url=${encodeURIComponent(prmUrl)}`,
    { method: "GET" },
  );
  if (!res.ok) return false;

  const json = (await res.json()) as any;
  return Array.isArray(json?.authorization_servers) && json.authorization_servers.length > 0;
}


import * as client from "openid-client";

const configCache = new Map<string, client.Configuration>();

export async function getOidcClient(config: any) {
  const cacheKey = `${config.issuer}|${config.clientId}|${config.redirectUri}`;
  if (!configCache.has(cacheKey)) {
    configCache.set(
      cacheKey,
      await client.discovery(new URL(config.issuer), config.clientId, {
        redirect_uris: [config.redirectUri],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      })
    );
  }
  return configCache.get(cacheKey)!;
}
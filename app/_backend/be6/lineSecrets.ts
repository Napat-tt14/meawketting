import { LineChannelAdapter } from "./adapters";
import type { Channel } from "./contracts";

/** Server-only secret binding. Provisioning and rotation remain external launch work.
 * A reference is tied to one Business-owned account; no central chat proxy exists.
 */
export function lineSecretResolver(binding: string | undefined) {
  return async (channel: Channel) => {
    if (channel.provider !== "line" || !binding) return null;
    try {
      const parsed: unknown = JSON.parse(binding);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      const entry = Object.hasOwn(parsed, channel.secretRef) ? (parsed as Record<string, unknown>)[channel.secretRef] : null;
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const value = entry as Record<string, unknown>;
      if (value.businessId !== channel.businessId || value.externalAccountId !== channel.externalAccountId || typeof value.channelSecret !== "string" || typeof value.channelAccessToken !== "string" || !value.channelSecret || !value.channelAccessToken) return null;
      return new LineChannelAdapter(value.channelSecret, value.channelAccessToken);
    } catch { return null; }
  };
}

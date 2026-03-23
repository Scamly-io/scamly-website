/**
 * Utility to gather browser metadata for profile enrichment.
 * All values are optional — cookies may not exist and IP fetch may fail.
 */

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function getPublicIP(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.ip ?? null;
  } catch {
    return null;
  }
}

export interface BrowserMetadata {
  fbp?: string;
  fbq?: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Gathers optional browser metadata: Meta pixel cookies, public IP, and user agent.
 * Safe to call in any context — returns only the fields that are available.
 */
export async function getBrowserMetadata(): Promise<BrowserMetadata> {
  const fbp = getCookie("_fbp");
  const fbq = getCookie("_fbq");
  const ip_address = await getPublicIP();
  const user_agent = navigator.userAgent;

  const metadata: BrowserMetadata = {};
  if (fbp) metadata.fbp = fbp;
  if (fbq) metadata.fbq = fbq;
  if (ip_address) metadata.ip_address = ip_address;
  if (user_agent) metadata.user_agent = user_agent;

  return metadata;
}

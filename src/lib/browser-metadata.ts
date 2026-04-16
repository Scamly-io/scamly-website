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
  fbc?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface BrowserMetadataOptions {
  includeFbp?: boolean;
  includeFbc?: boolean;
  includeIpAddress?: boolean;
  includeUserAgent?: boolean;
}

/**
 * Gathers optional browser metadata: Meta pixel cookies, public IP, and user agent.
 * Safe to call in any context — returns only the fields that are available.
 */
export async function getBrowserMetadata(options: BrowserMetadataOptions = {}): Promise<BrowserMetadata> {
  const {
    includeFbp = true,
    includeFbc = true,
    includeIpAddress = true,
    includeUserAgent = true,
  } = options;

  const fbp = includeFbp ? getCookie("_fbp") : null;
  const fbc = includeFbc ? getCookie("_fbc") : null;
  const ip_address = includeIpAddress ? await getPublicIP() : null;
  const user_agent = includeUserAgent ? navigator.userAgent : null;

  const metadata: BrowserMetadata = {};
  if (fbp) metadata.fbp = fbp;
  if (fbc) metadata.fbc = fbc;
  if (ip_address) metadata.ip_address = ip_address;
  if (user_agent) metadata.user_agent = user_agent;

  return metadata;
}

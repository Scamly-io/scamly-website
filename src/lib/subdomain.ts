/**
 * Subdomain detection utilities for conditional rendering
 * between main domain (marketing) and test subdomain (full app)
 */

export function isTestSubdomain(): boolean {
  const hostname = window.location.hostname;
  return (
    hostname.startsWith('test.') ||
    hostname.includes('.test.') ||
    hostname.startsWith('id-preview--') ||
    hostname.includes('-preview--')
  );
}

export function isMainDomain(): boolean {
  return !isTestSubdomain();
}

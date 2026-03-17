/**
 * Google Tag Manager - Dynamic Loader
 *
 * GTM is loaded dynamically instead of in index.html so we can
 * exclude onboarding pages (shown in iOS webview) where Apple
 * requires the ATT framework for any cookie/analytics tracking.
 */

const GTM_ID = "GTM-KJ7DLHSK";

let gtmLoaded = false;

export function loadGTM(): void {
  if (gtmLoaded) return;
  gtmLoaded = true;

  // DataLayer init + gtm.start
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });

  // Inject script
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(script);

  // Inject noscript iframe
  const noscript = document.createElement("noscript");
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${GTM_ID}`;
  iframe.height = "0";
  iframe.width = "0";
  iframe.style.display = "none";
  iframe.style.visibility = "hidden";
  noscript.appendChild(iframe);
  document.body.prepend(noscript);
}

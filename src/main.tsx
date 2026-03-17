import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { isAnalyticsAllowed } from "./lib/analytics-gate";
import { loadGTM } from "./lib/gtm";
import { setupConsentListener } from "./lib/consent";

// Initialize Sentry error tracking before anything else (always allowed)
initSentry();

// Only load GTM + consent listener on pages that aren't shown in the iOS webview
if (isAnalyticsAllowed()) {
  loadGTM();
  setupConsentListener();
}

createRoot(document.getElementById("root")!).render(<App />);

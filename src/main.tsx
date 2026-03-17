import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAnalytics } from "./lib/analytics";
import { initSentry } from "./lib/sentry";
import { isAnalyticsAllowed } from "./lib/analytics-gate";
import { loadGTM } from "./lib/gtm";

// Initialize Sentry error tracking before anything else (always allowed)
initSentry();

// Only load analytics & GTM on pages that aren't shown in the iOS webview
if (isAnalyticsAllowed()) {
  initAnalytics();
  loadGTM();
}

createRoot(document.getElementById("root")!).render(<App />);

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAnalytics } from "./lib/analytics";
import { initSentry } from "./lib/sentry";

// Initialize Sentry error tracking before anything else
initSentry();

// Initialize PostHog analytics before rendering the app
initAnalytics();

createRoot(document.getElementById("root")!).render(<App />);

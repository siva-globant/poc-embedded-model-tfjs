import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { MonitoringProvider } from "./context";

const sentryConfig = {
  dsn: "https://02abba68d0f381879efe130cbd878551@o4505669501648896.ingest.sentry.io/4505793214480384",
  environment: import.meta.env.MODE,
  debug: !import.meta.env.PROD,
  tracesSampleRate: 1.0,
  release: `poc-embedded-model-tfjs`,
  tracingOrigins: [
    "127.0.0.1",
    "localhost",
    "https://poc-embedded-tfjs.preview.monk.ai/",
  ],
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MonitoringProvider config={sentryConfig}>
      <App />
    </MonitoringProvider>
  </React.StrictMode>
);

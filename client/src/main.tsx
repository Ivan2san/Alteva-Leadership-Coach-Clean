import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Enable MSW in development with smart configuration
if (import.meta.env.DEV && import.meta.env.VITE_DISABLE_MSW !== "true") {
  const mockChat = import.meta.env.VITE_MOCK_CHAT === "true";
  console.log(`🔧 MSW Config: Chat mocking ${mockChat ? 'enabled' : 'disabled'}`);
  
  import("./mocks/browser")
    .then(({ worker }) => {
      const swUrl = `${import.meta.env.BASE_URL || "/"}mockServiceWorker.js`;
      if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW === "true") worker.start({
        onUnhandledRequest: "bypass",
        serviceWorker: { url: swUrl }
      });
    })
    .then(() => {
      console.log("✅ MSW service worker started successfully");
    })
    .catch((error) => {
      console.warn("⚠️ MSW service worker failed to start:", error);
      // Continue without MSW - app should still work
    });
}

// Load Web Vitals in production
if (import.meta.env.PROD) {
  import("./vitals");
}

createRoot(document.getElementById("root")!).render(<App />);

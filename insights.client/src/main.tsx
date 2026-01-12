import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthProvider.tsx";
import { ThemeProvider } from "./context/ThemeProvider.tsx";

if (window.location.pathname === "/auth-callback") {
  window.opener?.postMessage({ type: "auth-success" }, window.location.origin);
  window.close();
} else {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </StrictMode>
  );
}

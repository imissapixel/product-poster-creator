import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const redirectKey = "gh_redirect";

try {
  const pendingRedirect = sessionStorage.getItem(redirectKey);
  if (pendingRedirect) {
    sessionStorage.removeItem(redirectKey);
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const normalized =
      pendingRedirect.startsWith("/") || pendingRedirect.startsWith("?")
        ? pendingRedirect
        : `/${pendingRedirect}`;
    const nextUrl = `${base}${normalized}`;
    if (window.location.pathname + window.location.search + window.location.hash !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }
} catch (error) {
  console.warn("Unable to complete GitHub Pages redirect", error);
}

createRoot(document.getElementById("root")!).render(<App />);

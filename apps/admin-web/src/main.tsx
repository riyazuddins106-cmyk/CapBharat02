import { createRoot } from "react-dom/client";
import App from "./app/App";
import { LanguageProvider, LanguageSelect } from "./lib/language";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <div className="fixed right-4 top-4 z-[100]">
      <LanguageSelect />
    </div>
    <App />
  </LanguageProvider>,
);

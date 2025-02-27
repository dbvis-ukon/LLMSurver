import "@styles/globals.css";
import ReactDOM from "react-dom/client";
import { HeroUIProvider } from "@heroui/react";
import App from "./App.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <HeroUIProvider>
    <main className="dark text-foreground bg-background">
      <App />
    </main>
  </HeroUIProvider>
);


import "@styles/globals.css";
import {createRoot} from 'react-dom/client';
import { HeroUIProvider } from "@heroui/react";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <HeroUIProvider>
    <main className="dark text-foreground bg-background">
      <App />
    </main>
  </HeroUIProvider>
);

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installDemoModeInterceptor } from "./lib/demoMode";

installDemoModeInterceptor();

createRoot(document.getElementById("root")!).render(<App />);

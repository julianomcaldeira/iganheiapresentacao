import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installDemoModeInterceptor } from "./lib/demoMode";
import { installVisualBrand } from "./lib/visualBrand";

installDemoModeInterceptor();
installVisualBrand();

createRoot(document.getElementById("root")!).render(<App />);

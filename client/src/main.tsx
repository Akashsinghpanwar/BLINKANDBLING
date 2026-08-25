import { createRoot } from "react-dom/client";
import { MotionConfig } from "framer-motion";
import App from "./App";
import "./index.css";

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  sessionStorage.removeItem("bb-route-reload-attempted");
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <MotionConfig reducedMotion="user">
    <App />
  </MotionConfig>
);

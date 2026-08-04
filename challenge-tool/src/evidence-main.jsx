import React from "react";
import { createRoot } from "react-dom/client";
import EvidencePage from "./EvidencePage.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <EvidencePage />
  </React.StrictMode>
);

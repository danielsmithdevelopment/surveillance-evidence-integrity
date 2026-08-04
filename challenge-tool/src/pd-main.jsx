import React from "react";
import { createRoot } from "react-dom/client";
import PublicDefendersPage from "./PublicDefendersPage.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PublicDefendersPage />
  </React.StrictMode>
);

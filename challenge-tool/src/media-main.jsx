import React from "react";
import { createRoot } from "react-dom/client";
import MediaPage from "./MediaPage.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MediaPage />
  </React.StrictMode>
);

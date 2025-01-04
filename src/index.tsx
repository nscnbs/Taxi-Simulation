import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import "bootstrap/dist/css/bootstrap.min.css";
import { SimulationProvider } from "./context/SimulationContext";

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement as HTMLElement);
  root.render(
    <React.StrictMode>
      <SimulationProvider>
        <App />
      </SimulationProvider>
    </React.StrictMode>
  );
}

reportWebVitals(console.log);

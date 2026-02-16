import React from "react";
import { createRoot } from "react-dom/client";
import { ThirdwebProvider } from "thirdweb/react";
import App from "./App.jsx";
import "./styles.css";
import { client, ganacheChain } from "./thirdwebClient.js";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThirdwebProvider client={client} chain={ganacheChain}>
      <App />
    </ThirdwebProvider>
  </React.StrictMode>
);

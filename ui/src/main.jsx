import React from "react";
import { createRoot } from "react-dom/client";
import { ThirdwebProvider } from "thirdweb/react";
import App from "./App.jsx";
import "./styles.css";
import { client, ganacheChain } from "./thirdwebClient.js";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
          <h2>⚠️ Error Loading App</h2>
          <pre style={{ background: "#f0f0f0", padding: "16px", borderRadius: "8px", textAlign: "left", overflow: "auto" }}>
            {this.state.error?.toString()}
          </pre>
          <p>Check browser console for more details.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThirdwebProvider client={client} chain={ganacheChain}>
        <App />
      </ThirdwebProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

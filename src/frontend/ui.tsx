import { App } from "frontend/components/App";
import { ErrorBoundary as ErrorBoundary } from "frontend/components/ErrorBoundary";
import { h, render } from "preact";
import { AppProvider } from "./app_context";

// Render app
render(
  <ErrorBoundary>
    <AppProvider>
      <App />
    </AppProvider>
  </ErrorBoundary>,
  document.body
);

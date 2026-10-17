import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App, ConfigProvider } from "antd";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import { tokens, installTokens } from "./theme";
import { AuthProvider } from "./components/Auth/AuthContext";
import AppController from "./AppController";
import "./styles.css";
import "./dashboard.css";
import "./portal.css";
import "./marketing.css";
import "./auth.css";
installTokens();
createRoot(document.getElementById("root")).render(
  <ConfigProvider theme={{ token: tokens }}>
    <App>
      <BrowserRouter>
        <AuthProvider>
          <AppController />
        </AuthProvider>
      </BrowserRouter>
    </App>
  </ConfigProvider>,
);

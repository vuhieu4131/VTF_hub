import React, { FC } from "react";
import { Route, Routes } from "react-router";
import { Box } from "zmp-ui";
import { Navigation } from "./navigation";
import HomePage from "pages/home";
import StatisticsPage from "pages/statistics";
import CreatePage from "pages/create";
import DocumentDetailPage from "pages/document-detail";
import ProfilePage from "pages/profile";
import { getSystemInfo } from "zmp-sdk";
import { ScrollRestoration } from "./scroll-restoration";

if (import.meta.env.DEV) {
  document.body.style.setProperty("--zaui-safe-area-inset-top", "24px");
} else if (getSystemInfo().platform === "android") {
  const statusBarHeight =
    window.ZaloJavaScriptInterface?.getStatusBarHeight() ?? 0;
  const androidSafeTop = Math.round(statusBarHeight / window.devicePixelRatio);
  document.body.style.setProperty(
    "--zaui-safe-area-inset-top",
    `${androidSafeTop}px`
  );
}

export const Layout: FC = () => {
  return (
    <Box flex flexDirection="column" className="h-screen relative">
      <ScrollRestoration />
      <Box className="flex-1 flex flex-col overflow-hidden relative">
        <Routes>
          <Route path="/" element={<HomePage />}></Route>
          <Route path="/statistics" element={<StatisticsPage />}></Route>
          <Route path="/create" element={<CreatePage />}></Route>
          <Route path="/document-detail" element={<DocumentDetailPage />}></Route>
          <Route path="/profile" element={<ProfilePage />}></Route>
        </Routes>
      </Box>
      <Navigation />
    </Box>
  );
};

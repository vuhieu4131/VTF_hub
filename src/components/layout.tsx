import React, { FC } from "react";
import { Route, Routes } from "react-router";
import { Box } from "zmp-ui";
import { Navigation } from "./navigation";
import HomePage from "pages/home";
import DocumentsPage from "pages/documents";
import StatisticsPage from "pages/statistics";
import CreatePage from "pages/create";
import DocumentDetailPage from "pages/document-detail";
import ProfilePage from "pages/profile";
import DiaryPage from "pages/diary";
import LoginPage from "pages/login";
import RegisterPage from "pages/register";
import AdminSettingsPage from "pages/admin-settings";
import NotificationsPage from "pages/notifications";
import PendingApprovalPage from "pages/pending-approval";
import { getSystemInfo } from "zmp-sdk";
import { ScrollRestoration } from "./scroll-restoration";
import { useRecoilValue } from "recoil";
import { currentUserState } from "../state";

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
  const currentUser = useRecoilValue(currentUserState);

  return (
    <Box flex flexDirection="column" className="h-screen relative">
      <ScrollRestoration />
      <Box className="flex-1 flex flex-col overflow-hidden relative">
        <Routes>
          <Route path="/login" element={<LoginPage />}></Route>
          <Route path="/register" element={<RegisterPage />}></Route>
          
          {currentUser ? (
            currentUser.status === 'pending_approval' ? (
              <Route path="*" element={<PendingApprovalPage />}></Route>
            ) : (
              <>
                <Route path="/" element={<HomePage />}></Route>
                <Route path="/diary" element={<DiaryPage />}></Route>
                <Route path="/documents" element={<DocumentsPage />}></Route>
                <Route path="/statistics" element={<StatisticsPage />}></Route>
                <Route path="/create" element={<CreatePage />}></Route>
                <Route path="/document-detail" element={<DocumentDetailPage />}></Route>
                <Route path="/profile" element={<ProfilePage />}></Route>
                <Route path="/notifications" element={<NotificationsPage />}></Route>
                <Route path="/admin-settings" element={<AdminSettingsPage />}></Route>
              </>
            )
          ) : (
            <Route path="*" element={<LoginPage />}></Route>
          )}
        </Routes>
      </Box>
      {currentUser && currentUser.status !== 'pending_approval' && <Navigation />}
    </Box>
  );
};

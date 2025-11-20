import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/home/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProfilePage from "./pages/user/ProfilePage";

import AdminPage from "./pages/admin/AdminPage";
import RoomMembersPage from "./pages/admin/RoomMembersPage";
import MessagesPage from "./pages/admin/MessagesPage";
import MembersPage from "./pages/MembersPage";
import CustomsPage from "./pages/CustomsPage";
import CustomDetailPage from "./pages/CustomDetailPage";
import NewsPage from "./pages/NewsPage";
import NewsDetailPage from "./pages/NewsDetailPage";
import RegistrationPage from "./pages/RegistrationPage";
import { useEffect, useState } from "react";
import LoadingSpinner from "./components/LoadingSpinner";
import { callBackend } from "./utils/callBackend";

// vercel / render reload backend ping helper
export default function App() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const pingUrl =
      // prefer Vite env variable if available, else fallback
      (import.meta as any).env?.VITE_BACKEND_PING_URL ||
      "https://bx-clan-backend.onrender.com/api/ping";

    let mounted = true;

    async function wakeBackend() {
      setLoading(true);
      try {
        // use callBackend's retry logic; increase retries here if you want longer waiting
        await callBackend(pingUrl, 12, 2000);
      } catch (err: any) {
        // final failure after retries – keep error logged; we still stop loading
        console.error("Backend ping failed:", err?.message || err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    wakeBackend();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-white text-gray-900">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90">
            <div className="text-center">
              <LoadingSpinner />
              <div className="mt-3 text-gray-700">
                Đang tải dữ liệu, vui lòng chờ...
              </div>
            </div>
          </div>
        )}
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/customs" element={<CustomsPage />} />
            <Route path="/customs/:id" element={<CustomDetailPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/news/:id" element={<NewsDetailPage />} />
            <Route
              path="/registration"
              element={
                <ProtectedRoute>
                  <RegistrationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["leader", "organizer"]}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/:tab"
              element={
                <ProtectedRoute roles={["leader", "organizer"]}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/rooms/:newsId/:roomId"
              element={
                <ProtectedRoute roles={["leader", "organizer", "moderator"]}>
                  <RoomMembersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute roles={["leader", "organizer", "moderator"]}>
                  <MessagesPage />
                </ProtectedRoute>
              }
            />
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

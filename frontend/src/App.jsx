import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CheckEmailPage from "./pages/CheckEmailPage";
import OnboardingPage from "./pages/OnboardingPage";
import SessionExpiredPage from "./pages/SessionExpiredPage";
import DashboardPage from "./pages/DashboardPage";
import CheckinPage from "./pages/CheckinPage";
import ChatPage from "./pages/ChatPage";
import HistoryPage from "./pages/HistoryPage";
import EducationPage from "./pages/EducationPage";
import ProfilePage from "./pages/ProfilePage";
import AppShell from "./components/AppShell";
import DevPreviewBar from "./components/DevPreviewBar";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 text-primary">
      <span className="material-symbols-outlined animate-spin text-[36px]">
        progress_activity
      </span>
      <p className="font-label-md text-label-md text-on-surface-variant">
        Memuat PCOSmart...
      </p>
    </div>
  );
}

function PublicOnlyRoute({ children, previewBypass }) {
  const { user, loading, needsOnboarding } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user && !previewBypass) {
    return <Navigate to={needsOnboarding ? "/onboarding" : "/dashboard"} replace />;
  }
  return children;
}

function OnboardingRoute({ children, previewBypass }) {
  const { user, loading, needsOnboarding } = useAuth();
  if (loading) return <LoadingScreen />;
  if (previewBypass) return children;
  if (!user) return <Navigate to="/login" replace />;
  if (!needsOnboarding) return <Navigate to="/dashboard" replace />;
  return children;
}

function ProtectedRoute({ children, previewBypass }) {
  const { user, loading, needsOnboarding } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!previewBypass) {
    if (!user) return <Navigate to="/login" replace />;
    if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  }
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  const [previewBypass, setPreviewBypass] = useState(false);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <PublicOnlyRoute previewBypass={previewBypass}>
                <LandingPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute previewBypass={previewBypass}>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute previewBypass={previewBypass}>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />
          <Route path="/check-email" element={<CheckEmailPage />} />
          <Route path="/session-expired" element={<SessionExpiredPage />} />

          <Route
            path="/onboarding"
            element={
              <OnboardingRoute previewBypass={previewBypass}>
                <OnboardingPage />
              </OnboardingRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute previewBypass={previewBypass}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkin"
            element={
              <ProtectedRoute previewBypass={previewBypass}>
                <CheckinPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute previewBypass={previewBypass}>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute previewBypass={previewBypass}>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/education"
            element={
              <ProtectedRoute previewBypass={previewBypass}>
                <EducationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute previewBypass={previewBypass}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {import.meta.env.DEV && <DevPreviewBar setPreviewBypass={setPreviewBypass} />}
      </BrowserRouter>
    </AuthProvider>
  );
}

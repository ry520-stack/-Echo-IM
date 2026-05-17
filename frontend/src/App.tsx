import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './contexts/SocketContext';
import { ToastProvider } from './contexts/ToastContext';
import RequireAuth from './components/RequireAuth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import FriendsPage from './pages/FriendsPage';
import GroupsPage from './pages/GroupsPage';
import MomentsPage from './pages/MomentsPage';
import SearchMessagesPage from './pages/SearchMessagesPage';
import FavoritesPage from './pages/FavoritesPage';
import TimeCapsulePage from './pages/TimeCapsulePage';
import ChatSettingsPage from './pages/ChatSettingsPage';
import NotificationProvider from './components/NotificationProvider';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <SocketProvider>
            <HashRouter>
              <NotificationProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                <Route element={<RequireAuth />}>
                  <Route index element={<ChatPage />} />
                  <Route path="/chat/:id" element={<ChatPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/friends" element={<FriendsPage />} />
                  <Route path="/groups" element={<GroupsPage />} />
                  <Route path="/moments" element={<MomentsPage />} />
                  <Route path="/search" element={<SearchMessagesPage />} />
                  <Route path="/favorites" element={<FavoritesPage />} />
                  <Route path="/time-capsule" element={<TimeCapsulePage />} />
                  <Route path="/orbit/:userId" element={<MomentsPage />} />
                  <Route path="/chat/:userId/settings" element={<ChatSettingsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </NotificationProvider>
            </HashRouter>
          </SocketProvider>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

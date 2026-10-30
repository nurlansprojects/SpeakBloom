import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WelcomeScreen } from './pages/public/WelcomeScreen';
import { AppShell } from './components/layout/AppShell';
import { StudentHome } from './pages/student/StudentHome';
import { LessonsCatalog } from './pages/student/LessonsCatalog';
import { LessonDetail } from './pages/student/LessonDetail';
import { ActivityPlayerHost } from './pages/student/ActivityPlayerHost';
import { PracticeArena } from './pages/student/PracticeArena';
import { TeacherHome } from './pages/teacher/TeacherHome';
import { LessonEditor } from './pages/teacher/LessonEditor';
import { ReviewQueue } from './pages/teacher/ReviewQueue';
import { ProfileScreen } from './pages/profile/ProfileScreen';
import { TeacherApplicationScreen } from './pages/profile/TeacherApplicationScreen';
import { MessagesScreen } from './pages/messages/MessagesScreen';
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminLessons } from './pages/admin/AdminLessons';
import { NotificationsScreen } from './pages/notifications/NotificationsScreen';

const AppRoutes: React.FC = () => {
  const { firebaseUser, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F4FF] dark:bg-[#0f0a1c]">
        <div className="w-12 h-12 rounded-full border-4 border-[#EDE5FF] border-t-[#6D28D9] animate-spin" />
      </div>
    );
  }

  if (!firebaseUser) {
    return <WelcomeScreen />;
  }

  return (
    <AppShell>
      <Routes>
        {/* Dynamic Home Route based on Role */}
        <Route
          path="/"
          element={
            role === 'admin' ? (
              <AdminOverview />
            ) : role === 'teacher' ? (
              <TeacherHome />
            ) : (
              <StudentHome />
            )
          }
        />

        {/* Student Routes */}
        <Route path="/lessons" element={<LessonsCatalog />} />
        <Route path="/lessons/:lessonId" element={<LessonDetail />} />
        <Route path="/lessons/:lessonId/activity/:activityId" element={<ActivityPlayerHost />} />
        <Route path="/practice" element={<PracticeArena />} />

        {/* Teacher Routes */}
        <Route path="/create-lesson" element={<LessonEditor />} />
        <Route path="/edit-lesson/:lessonId" element={<LessonEditor />} />
        <Route path="/review" element={<ReviewQueue />} />
        <Route path="/teacher" element={<TeacherHome />} />

        {/* Profile & Applications */}
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/apply-teacher" element={<TeacherApplicationScreen />} />

        {/* Direct Messages */}
        <Route path="/messages" element={<MessagesScreen />} />
        <Route path="/messages/:otherUserId" element={<MessagesScreen />} />

        {/* Notifications */}
        <Route path="/notifications" element={<NotificationsScreen />} />

        {/* Admin Routes */}
        <Route path="/admin/overview" element={<AdminOverview />} />
        <Route path="/admin/lessons" element={<AdminLessons />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/requests" element={<AdminOverview />} />
        <Route path="/admin/settings" element={<ProfileScreen />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

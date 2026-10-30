import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Book,
  Mic,
  MessageCircle,
  User,
  Pencil,
  CheckCircle,
  BarChart2,
  Users,
  FileText,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../common/Logo';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { profile, role, signOutUser, firebaseUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Student Navigation Items
  const studentNav = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Lessons', path: '/lessons', icon: Book },
    { label: 'Practice', path: '/practice', icon: Mic },
    { label: 'Messages', path: '/messages', icon: MessageCircle },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  // Teacher Navigation Items
  const teacherNav = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Create', path: '/create-lesson', icon: Pencil },
    { label: 'Review', path: '/review', icon: CheckCircle },
    { label: 'Messages', path: '/messages', icon: MessageCircle },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  // Admin Navigation Items
  const adminNav = [
    { label: 'Overview', path: '/', icon: BarChart2 },
    { label: 'Lessons', path: '/admin/lessons', icon: Book },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Requests', path: '/admin/requests', icon: FileText },
    { label: 'Messages', path: '/messages', icon: MessageCircle },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  const navItems = role === 'admin' ? adminNav : role === 'teacher' ? teacherNav : studentNav;

  const initials = profile?.displayName
    ? profile.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'SB';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F7F4FF] dark:bg-[#0f0a1c] text-[#1C1530] dark:text-[#f3f0fc]">
      {/* Desktop Persistent Sidebar (240px) */}
      <aside className="hidden lg:flex flex-col w-60 bg-white dark:bg-[#18122b] border-r border-[#E6E0F5] dark:border-[#2e234c] shrink-0 sticky top-0 h-screen z-30">
        {/* Brand header */}
        <div className="p-6 border-b border-[#E6E0F5] dark:border-[#2e234c]">
          <NavLink to="/" className="flex items-center gap-3">
            <Logo size={40} showText />
          </NavLink>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-[14px] text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#EDE5FF] text-[#6D28D9] dark:bg-[#2e1d54] dark:text-[#a78bfa]'
                    : 'text-[#5B5470] dark:text-[#a49cb5] hover:bg-[#F7F4FF] dark:hover:bg-[#201838] hover:text-[#1C1530]'
                }`}
              >
                <Icon size={20} strokeWidth={1.8} className="shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card at bottom of sidebar */}
        <div className="p-4 border-t border-[#E6E0F5] dark:border-[#2e234c] bg-[#F7F4FF]/50 dark:bg-[#201838]/50">
          <div className="flex items-center gap-3 mb-3">
            {profile?.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.displayName}
                className="w-10 h-10 rounded-full object-cover border border-[#E6E0F5] shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#6D28D9] text-white flex items-center justify-center font-bold text-sm shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate text-[#1C1530] dark:text-white">
                {profile?.displayName || 'Scholar'}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#6D28D9] dark:text-[#a78bfa]">
                  {role}
                </span>
                <span className="text-[11px] text-[#5B5470]">
                  @{profile?.username || 'user'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => signOutUser()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#5B5470] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-[14px] transition-colors"
          >
            <LogOut size={16} strokeWidth={1.8} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Top Bar for Desktop & Tablet */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 py-3.5 bg-white/90 dark:bg-[#18122b]/90 backdrop-blur-md border-b border-[#E6E0F5] dark:border-[#2e234c]">
          {/* Left on Mobile: Logo; on Desktop: Search / Breadcrumb */}
          <div className="flex items-center gap-3">
            <div className="lg:hidden flex items-center gap-2">
              <Logo size={32} />
              <span className="font-bold text-lg text-[#1C1530] dark:text-white">
                SpeakBloom
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-2 text-sm text-[#5B5470] dark:text-[#a49cb5]">
              <span className="font-semibold capitalize text-[#1C1530] dark:text-white">
                {role} Portal
              </span>
              <span>/</span>
              <span className="capitalize">
                {location.pathname.replace('/', '') || 'Home'}
              </span>
            </div>
          </div>

          {/* Right Top Bar Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Role indicator pill */}
            <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-[#EDE5FF] text-[#6D28D9] dark:bg-[#2e1d54] dark:text-[#a78bfa]">
              {role}
            </span>

            {/* Notifications Shortcut */}
            <button
              onClick={() => navigate('/notifications')}
              className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-[#5B5470] hover:bg-[#F7F4FF] dark:hover:bg-[#201838] transition-colors relative"
              aria-label="Notifications"
            >
              <Bell size={20} strokeWidth={1.8} />
            </button>

            {/* Avatar on mobile header */}
            <div
              onClick={() => navigate('/profile')}
              className="lg:hidden cursor-pointer"
            >
              {profile?.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.displayName}
                  className="w-8 h-8 rounded-full object-cover border border-[#E6E0F5]"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#6D28D9] text-white flex items-center justify-center font-bold text-xs">
                  {initials}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (< 768px and Tablet portrait) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#18122b]/95 backdrop-blur-lg border-t border-[#E6E0F5] dark:border-[#2e234c] px-3 py-2 flex items-center justify-around"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors ${
                isActive
                  ? 'text-[#6D28D9] dark:text-[#a78bfa]'
                  : 'text-[#5B5470] dark:text-[#a49cb5]'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className={`text-[11px] mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

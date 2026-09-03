import React, { useContext, useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Store,
  MessageSquare,
  LogOut,
  Utensils,
  Menu,
  X,
  Calendar,
  Sun,
  Moon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Sidebar/shell colors use design tokens (index.css) so owner panel matches the app theme in both modes.

const menuItems = [
  { name: 'Dashboard', path: '/owner/dashboard', icon: <LayoutDashboard size={17} /> },
  { name: 'My Restaurant', path: '/owner/restaurant', icon: <Store size={17} /> },
  { name: 'Reservations', path: '/owner/reservations', icon: <Calendar size={17} /> },
  { name: 'Reviews', path: '/owner/reviews', icon: <MessageSquare size={17} /> },
];

const OwnerLayout = ({ children }) => {
  const { admin, loading, logoutAdmin } = useContext(AuthContext);
  const { toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-border border-t-primary" />
          <span className="text-muted-foreground text-sm font-medium tracking-wide">
            Loading your dashboard…
          </span>
        </div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" />;
  }

  if (admin.role === 'superadmin') {
    return <Navigate to="/admin/dashboard" />;
  }

  const currentPage =
    menuItems.find((item) => location.pathname.startsWith(item.path))?.name ?? 'Dashboard';

  const NavContent = ({ onNavClick }) => (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center px-5 border-b border-border shrink-0">
        <Link
          to="/owner/dashboard"
          className="flex items-center gap-3 group"
          onClick={onNavClick}
        >
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-primary shrink-0">
            <Utensils size={17} className="text-white" />
          </div>
          <div className="leading-none select-none">
            <span className="text-foreground font-extrabold tracking-wider text-[15px]">RESTRO</span>
            <span className="text-primary font-extrabold tracking-wider text-[15px]">OWNER</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        {menuItems.map((item, idx) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.25 }}
            >
              <Link
                to={item.path}
                onClick={onNavClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary border-l-2 border-primary pl-[10px]'
                    : 'text-muted-foreground hover:bg-surface hover:text-foreground pl-3'
                }`}
              >
                <span className={isActive ? 'text-primary' : 'text-muted-foreground/60'}>
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.name}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border shrink-0">
        <div className="flex items-center gap-3 bg-surface rounded-xl px-3 py-2.5 mb-1 border border-border">
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0 select-none">
            {admin?.name?.charAt(0)?.toUpperCase() || 'O'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-semibold text-sm truncate leading-tight">
              {admin?.name || 'Owner'}
            </p>
            <p className="text-muted-foreground/60 text-xs truncate leading-tight mt-0.5">
              Restaurant Owner
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            logoutAdmin();
            onNavClick?.();
          }}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl font-medium text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 group"
        >
          <LogOut size={15} className="transition-colors group-hover:text-destructive" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans transition-colors duration-300">
      <aside className="w-64 bg-card hidden md:flex flex-col z-20 shrink-0 shadow-admin border-r border-border">
        <NavContent onNavClick={undefined} />
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-5 z-10 shrink-0 transition-colors duration-300">
          <div className="md:hidden flex items-center gap-2 flex-1">
            <Link to="/owner/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Utensils size={15} className="text-white" />
              </div>
              <span className="text-foreground font-extrabold tracking-wider text-sm">
                RESTRO<span className="text-primary">OWNER</span>
              </span>
            </Link>
            <button
              className="ml-auto w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-muted-foreground"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-sm">
            <span className="text-foreground font-semibold">{currentPage}</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <div className="w-px h-5 bg-border mx-1" />

            <div className="text-right leading-none mr-1">
              <p className="text-foreground font-semibold text-sm">{admin?.name || 'Owner'}</p>
            </div>

            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-primary select-none">
              {admin?.name?.charAt(0)?.toUpperCase() || 'O'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-background transition-colors duration-300">
          {children}
        </main>
      </div>

      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed top-0 left-0 h-full w-64 bg-card z-50 flex flex-col shadow-2xl md:hidden border-r border-border"
            >
              <button
                onClick={() => setMobileNavOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-muted-foreground z-10"
                aria-label="Close navigation"
              >
                <X size={16} />
              </button>
              <NavContent onNavClick={() => setMobileNavOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OwnerLayout;

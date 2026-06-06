import React, { useContext, useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  LayoutDashboard,
  Store,
  Users,
  UserCheck,
  MessageSquare,
  LogOut,
  Utensils,
  Menu,
  X,
  ChevronRight,
  Search,
  Bell,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminLayout = ({ children }) => {
  const { admin, loading, logoutAdmin } = useContext(AuthContext);
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#080d1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1e2d47] border-t-[#fa6500]" />
          <span className="text-[#8b98b0] text-sm font-medium tracking-wide">
            Loading admin panel…
          </span>
        </div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" />;
  }

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={17} /> },
    {
      name: admin?.role === 'superadmin' ? 'Restaurants' : 'My Restaurants',
      path: '/admin/restaurants',
      icon: <Store size={17} />,
    },
    ...(admin?.role === 'superadmin'
      ? [
          { name: 'Owners', path: '/admin/owners', icon: <UserCheck size={17} /> },
          { name: 'Users', path: '/admin/users', icon: <Users size={17} /> },
        ]
      : []),
    { name: 'Reviews', path: '/admin/reviews', icon: <MessageSquare size={17} /> },
    { name: 'Reservations', path: '/admin/reservations', icon: <Calendar size={17} /> },
  ];

  const currentPage =
    menuItems.find((item) => location.pathname.startsWith(item.path))?.name ?? 'Admin';

  const SidebarContent = ({ onNavClick }) => (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className="h-16 flex items-center px-5 border-b border-[#1e2d47] shrink-0">
        <Link
          to="/admin/dashboard"
          className="flex items-center gap-3 group"
          onClick={onNavClick}
        >
          <div className="w-9 h-9 rounded-xl bg-[#fa6500] flex items-center justify-center shadow-primary shrink-0">
            <Utensils size={17} className="text-white" />
          </div>
          <div className="leading-none select-none">
            <span className="text-white font-extrabold tracking-wider text-[15px]">RESTRO</span>
            <span className="text-[#fa6500] font-extrabold tracking-wider text-[15px]">ADMIN</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        <p className="text-[#4a5a78] text-[10px] font-bold uppercase tracking-[0.18em] px-3 mb-3">
          Navigation
        </p>

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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 relative group ${
                  isActive
                    ? 'bg-[#fa6500]/10 text-[#fa6500] border-l-2 border-[#fa6500] pl-[10px]'
                    : 'text-[#8b98b0] hover:bg-[#131e35] hover:text-slate-100 pl-3'
                }`}
              >
                <span className={`shrink-0 transition-colors ${isActive ? 'text-[#fa6500]' : 'text-[#4a5a78] group-hover:text-slate-300'}`}>
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.name}</span>
                {isActive && (
                  <ChevronRight size={13} className="text-[#fa6500]/60 shrink-0" />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Bottom admin info + logout */}
      <div className="p-3 border-t border-[#1e2d47] shrink-0">
        {/* Admin info card */}
        <div className="flex items-center gap-3 bg-[#131e35] rounded-xl px-3 py-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[#fa6500] text-white flex items-center justify-center font-bold text-sm shrink-0 select-none">
            {admin?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-100 font-semibold text-sm truncate leading-tight">
              {admin?.name || 'Admin'}
            </p>
            <p className="text-[#4a5a78] text-xs capitalize truncate leading-tight mt-0.5">
              {admin?.role || 'administrator'}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => {
            logoutAdmin();
            onNavClick?.();
          }}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl font-medium text-sm text-[#8b98b0] hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
        >
          <LogOut size={15} className="transition-colors group-hover:text-red-400" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0f1629] overflow-hidden font-sans">
      {/* Desktop sidebar */}
      <aside className="w-64 bg-[#080d1a] hidden md:flex flex-col z-20 shrink-0 shadow-admin border-r border-[#1e2d47]">
        <SidebarContent onNavClick={undefined} />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-[#0f1629] border-b border-[#1e2d47] flex items-center justify-between px-5 z-10 shrink-0">

          {/* Mobile: logo + hamburger */}
          <div className="md:hidden flex items-center gap-2 flex-1">
            <Link to="/admin/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#fa6500] flex items-center justify-center">
                <Utensils size={15} className="text-white" />
              </div>
              <span className="text-white font-extrabold tracking-wider text-sm">
                RESTRO<span className="text-[#fa6500]">ADMIN</span>
              </span>
            </Link>
            <button
              className="ml-auto w-9 h-9 rounded-xl bg-[#131e35] border border-[#1e2d47] flex items-center justify-center text-[#8b98b0] hover:text-slate-100 transition-colors"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
          </div>

          {/* Desktop: breadcrumb */}
          <div className="hidden md:flex items-center gap-2 text-sm">
            <span className="text-[#4a5a78] font-medium">Admin</span>
            <ChevronRight size={13} className="text-[#2d3d57]" />
            <span className="text-slate-100 font-semibold">{currentPage}</span>
          </div>

          {/* Right: icons + admin info */}
          <div className="hidden md:flex items-center gap-2">
            {/* Search icon */}
            <button
              className="w-9 h-9 rounded-xl bg-[#131e35] border border-[#1e2d47] flex items-center justify-center text-[#8b98b0] hover:text-slate-100 transition-colors"
              aria-label="Search"
            >
              <Search size={15} />
            </button>

            {/* Bell icon */}
            <button
              className="w-9 h-9 rounded-xl bg-[#131e35] border border-[#1e2d47] flex items-center justify-center text-[#8b98b0] hover:text-slate-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={15} />
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-[#1e2d47] mx-1" />

            {/* Admin name + role */}
            <div className="text-right leading-none mr-1">
              <p className="text-slate-100 font-semibold text-sm">{admin?.name || 'Admin'}</p>
              <p className="text-[#8b98b0] text-xs capitalize mt-0.5">{admin?.role || 'administrator'}</p>
            </div>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-xl bg-[#fa6500] text-white flex items-center justify-center font-bold text-sm shadow-primary select-none">
              {admin?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0f1629]">
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileNavOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed top-0 left-0 h-full w-64 bg-[#080d1a] z-50 flex flex-col shadow-2xl md:hidden border-r border-[#1e2d47]"
            >
              {/* Close button */}
              <button
                onClick={() => setMobileNavOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-[#131e35] border border-[#1e2d47] flex items-center justify-center text-[#8b98b0] hover:text-slate-100 transition-colors z-10"
                aria-label="Close navigation"
              >
                <X size={16} />
              </button>
              <SidebarContent onNavClick={() => setMobileNavOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminLayout;

import React, { useContext, useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  LayoutDashboard,
  Store,
  Users,
  MessageSquare,
  LogOut,
  Utensils,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

const AdminLayout = ({ children }) => {
  const { admin, loading, logoutAdmin } = useContext(AuthContext);
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0f172a]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1e293b] border-t-primary"></div>
          <span className="text-[#475569] text-sm font-medium">Loading admin panel…</span>
        </div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" />;
  }

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
    {
      name: admin?.role === 'superadmin' ? 'Restaurants' : 'My Restaurants',
      path: '/admin/restaurants',
      icon: <Store size={18} />,
    },
    ...(admin?.role === 'superadmin'
      ? [
          { name: 'Owners', path: '/admin/owners', icon: <Users size={18} /> },
          { name: 'Users', path: '/admin/users', icon: <Users size={18} /> },
        ]
      : []),
    { name: 'Reviews', path: '/admin/reviews', icon: <MessageSquare size={18} /> },
    { name: 'Reservations', path: '/admin/reservations', icon: <Utensils size={18} /> },
  ];

  /* Derive a readable page title from the current path */
  const currentPage =
    menuItems.find((item) => location.pathname.startsWith(item.path))?.name ?? 'Admin';

  const SidebarContent = ({ onNavClick }) => (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-[#1e293b] shrink-0">
        <Link
          to="/admin/dashboard"
          className="flex items-center gap-3 group"
          onClick={onNavClick}
        >
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-primary shrink-0">
            <Utensils size={18} className="text-white" />
          </div>
          <div className="leading-none">
            <span className="text-white font-extrabold tracking-wider text-base">RESTRO</span>
            <span className="text-primary font-extrabold tracking-wider text-base">ADMIN</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
        <p className="text-[#475569] text-[10px] font-semibold uppercase tracking-widest px-3 mb-3">
          Navigation
        </p>
        {menuItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={onNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all relative ${
                isActive
                  ? 'bg-primary/15 text-primary border-l-2 border-primary pl-[10px]'
                  : 'text-[#94a3b8] hover:bg-[#1e293b] hover:text-white pl-3'
              }`}
            >
              <span className={`shrink-0 ${isActive ? 'text-primary' : 'text-[#475569] group-hover:text-white'}`}>
                {item.icon}
              </span>
              <span className="flex-1">{item.name}</span>
              {isActive && (
                <ChevronRight size={14} className="text-primary/60 shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Admin footer */}
      <div className="p-3 border-t border-[#1e293b] shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-xl bg-[#1e293b]">
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
            {admin?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate leading-tight">
              {admin?.name || 'Admin'}
            </p>
            <p className="text-[#475569] text-xs capitalize truncate leading-tight">
              {admin?.role || 'administrator'}
            </p>
          </div>
        </div>
        <button
          onClick={() => { logoutAdmin(); onNavClick?.(); }}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl font-medium text-sm text-[#94a3b8] hover:bg-red-500/10 hover:text-red-400 transition-all group"
        >
          <LogOut size={16} className="group-hover:text-red-400 transition-colors" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-warm-50 overflow-hidden font-sans">
      {/* Desktop sidebar */}
      <aside className="w-60 bg-[#0f172a] flex-col hidden md:flex z-20 shrink-0 shadow-admin">
        <SidebarContent onNavClick={undefined} />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-warm-200 flex items-center justify-between px-5 z-10 shrink-0">
          {/* Mobile: logo + hamburger */}
          <div className="md:hidden flex items-center gap-2 flex-1">
            <Link to="/admin/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Utensils size={16} className="text-white" />
              </div>
              <span className="text-warm-900 font-extrabold tracking-wider text-base">
                RESTRO<span className="text-primary">ADMIN</span>
              </span>
            </Link>
            <button
              className="ml-auto p-2 rounded-xl hover:bg-warm-100 text-warm-600 transition-colors"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
          </div>

          {/* Desktop: breadcrumb */}
          <div className="hidden md:flex items-center gap-2 text-sm">
            <span className="text-warm-400 font-medium">Admin</span>
            <ChevronRight size={14} className="text-warm-300" />
            <span className="text-warm-900 font-semibold">{currentPage}</span>
          </div>

          {/* Right side: avatar */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right leading-none">
              <p className="text-warm-900 font-semibold text-sm">{admin?.name || 'Admin'}</p>
              <p className="text-warm-400 text-xs capitalize">{admin?.role || 'administrator'}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-primary">
              {admin?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-warm-50">
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="fixed top-0 left-0 h-full w-60 bg-[#0f172a] z-50 flex flex-col shadow-2xl md:hidden animate-fade-in-up">
            {/* Close button overlay */}
            <button
              onClick={() => setMobileNavOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#1e293b] text-[#94a3b8] transition-colors z-10"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
            <SidebarContent onNavClick={() => setMobileNavOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
};

export default AdminLayout;

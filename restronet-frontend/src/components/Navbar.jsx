import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Utensils, LogOut, ChevronDown, User as UserIcon,
  Heart, Menu, X, Sparkles, Sun, Moon,
} from 'lucide-react';
import { Dropdown } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────
   Navbar
───────────────────────────────────────────────────────────── */
const Navbar = () => {
  const { user, logoutUser } = useContext(AuthContext);
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHome = location.pathname === '/';
  const isTransparent = isHome && !scrolled;

  /* scroll detection */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* close drawer on route change */
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    if (user) { logoutUser(); navigate('/'); }
  };

  /* ── nav bar class ── */
  const navBase = 'fixed top-0 w-full z-50 transition-all duration-500';
  const navScrolled = 'bg-background/95 backdrop-blur-xl border-b border-border shadow-[0_1px_0_rgba(0,0,0,0.04)] py-3';
  const navTransparent = 'bg-transparent py-5';
  const navClass = `${navBase} ${isTransparent ? navTransparent : navScrolled}`;

  /* ── text colors ── */
  const linkColor = isTransparent
    ? 'text-white/80 hover:text-white'
    : 'text-muted-foreground hover:text-foreground';
  const logoTextColor = isTransparent ? 'text-white' : 'text-foreground';
  const chevronColor = isTransparent ? 'text-white/50' : 'text-muted-foreground';
  const welcomeColor = isTransparent ? 'text-white/50' : 'text-muted-foreground';
  const nameColor = isTransparent ? 'text-white' : 'text-foreground';

  /* ── user dropdown items ── */
  const userMenuItems = [
    {
      key: 'profile',
      label: (
        <Link to="/profile" className="flex items-center gap-3 py-1 font-medium text-foreground hover:text-primary transition-colors">
          <UserIcon size={15} className="text-muted-foreground" /> Profile
        </Link>
      ),
    },
    {
      key: 'reservations',
      label: (
        <Link to="/reservations" className="flex items-center gap-3 py-1 font-medium text-foreground hover:text-primary transition-colors">
          <Utensils size={15} className="text-muted-foreground" /> My Reservations
        </Link>
      ),
    },
    {
      key: 'saved',
      label: (
        <Link to="/profile" className="flex items-center gap-3 py-1 font-medium text-foreground hover:text-primary transition-colors">
          <Heart size={15} className="text-muted-foreground" /> Saved Places
        </Link>
      ),
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: (
        <div
          onClick={handleLogout}
          className="flex items-center gap-3 py-1 font-semibold text-red-500 cursor-pointer"
        >
          <LogOut size={15} /> Sign Out
        </div>
      ),
    },
  ];

  return (
    <>
      {/* ── Main header ── */}
      <header className={navClass}>
        <div className="section-container flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div
              className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white
                         transition-transform duration-200 group-hover:scale-105 group-active:scale-95
                         shadow-[0_2px_8px_rgba(250,101,0,0.35)]"
            >
              <Utensils size={16} strokeWidth={2.2} />
            </div>
            <span className={`text-[17px] font-bold tracking-tight transition-colors duration-300 ${logoTextColor}`}>
              RESTRO<span className="text-primary">NET</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/search" transparent={isTransparent} className={linkColor}>
              Explore
            </NavLink>
            <NavLink to="/discover" transparent={isTransparent} className={linkColor} icon={
              <Sparkles size={13} className="text-primary" />
            }>
              Discover
            </NavLink>
          </div>

          {/* Right section: theme toggle + auth */}
          <div className="hidden md:flex items-center gap-3">

            {/* Theme toggle */}
            <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} isTransparent={isTransparent} />

            {/* Auth */}
            {user ? (
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                trigger={['click']}
                overlayClassName="restronet-user-dropdown"
              >
                <button className="flex items-center gap-2.5 cursor-pointer group outline-none">
                  <div
                    className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center
                               font-bold text-sm transition-transform duration-200
                               group-hover:scale-105 group-active:scale-95
                               shadow-[0_2px_8px_rgba(250,101,0,0.3)]"
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className={`text-label transition-colors duration-300 ${welcomeColor}`}>
                      Welcome back
                    </p>
                    <p className={`text-[13px] font-semibold leading-none mt-0.5 transition-colors duration-300 ${nameColor}`}>
                      {user.name.split(' ')[0]}
                    </p>
                  </div>
                  <ChevronDown
                    size={13}
                    strokeWidth={2.5}
                    className={`transition-colors duration-300 ${chevronColor}`}
                  />
                </button>
              </Dropdown>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className={`text-sm font-medium transition-colors duration-200 hover:text-primary ${
                    isTransparent ? 'text-white/90' : 'text-foreground'
                  }`}
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="bg-primary text-white rounded-xl py-2 px-4 text-sm font-semibold
                             shadow-[0_2px_10px_rgba(250,101,0,0.3)] hover:bg-primary-hover
                             hover:shadow-[0_4px_16px_rgba(250,101,0,0.4)]
                             transition-all duration-200 active:scale-[0.97]"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: theme toggle + hamburger */}
          <div className="flex md:hidden items-center gap-1.5">
            <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} isTransparent={isTransparent} />
            <button
              className={`p-2 rounded-xl transition-colors duration-200 ${
                isTransparent
                  ? 'text-white hover:bg-white/10'
                  : 'text-foreground hover:bg-surface'
              }`}
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-[300px] bg-card border-l border-border
                         z-50 shadow-[−8px_0_40px_rgba(0,0,0,0.15)] flex flex-col md:hidden"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white shadow-[0_2px_6px_rgba(250,101,0,0.3)]">
                    <Utensils size={14} strokeWidth={2.2} />
                  </div>
                  <span className="text-sm font-bold text-foreground tracking-tight">
                    RESTRO<span className="text-primary">NET</span>
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer nav */}
              <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                <DrawerLink to="/search" onClick={() => setMobileMenuOpen(false)}>
                  Explore
                </DrawerLink>
                <DrawerLink
                  to="/discover"
                  onClick={() => setMobileMenuOpen(false)}
                  icon={<Sparkles size={15} className="text-primary" />}
                >
                  Discover
                </DrawerLink>

                {user && (
                  <div className="mt-4 pt-4 border-t border-border space-y-0.5">
                    <p className="text-label px-4 mb-2">Account</p>
                    <DrawerLink
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      icon={<UserIcon size={15} className="text-muted-foreground" />}
                    >
                      Profile
                    </DrawerLink>
                    <DrawerLink
                      to="/reservations"
                      onClick={() => setMobileMenuOpen(false)}
                      icon={<Utensils size={15} className="text-muted-foreground" />}
                    >
                      My Reservations
                    </DrawerLink>
                    <DrawerLink
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      icon={<Heart size={15} className="text-muted-foreground" />}
                    >
                      Saved Places
                    </DrawerLink>
                  </div>
                )}
              </nav>

              {/* Drawer footer */}
              <div className="p-4 border-t border-border">
                {user ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface">
                      <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center font-bold text-sm shrink-0 shadow-[0_1px_6px_rgba(250,101,0,0.3)]">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate leading-tight">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl
                                 text-red-500 hover:bg-red-500/8 text-sm font-medium transition-colors"
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-center py-2.5 rounded-xl border border-border
                                 text-sm font-medium text-foreground hover:bg-surface transition-colors"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-center py-2.5 rounded-xl bg-primary text-white
                                 text-sm font-semibold shadow-[0_2px_10px_rgba(250,101,0,0.3)]
                                 hover:bg-primary-hover transition-all"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────── */

/** Desktop nav link with subtle underline hover effect */
const NavLink = ({ to, children, icon, transparent }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`
        relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium
        transition-all duration-200 group
        ${isActive
          ? transparent
            ? 'text-white bg-white/10'
            : 'text-foreground bg-surface'
          : transparent
            ? 'text-white/75 hover:text-white hover:bg-white/8'
            : 'text-muted-foreground hover:text-foreground hover:bg-surface'
        }
      `}
    >
      {icon}
      {children}
      {/* Active dot */}
      {isActive && (
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
      )}
    </Link>
  );
};

/** Mobile drawer link */
const DrawerLink = ({ to, children, icon, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
        ${isActive
          ? 'bg-primary/8 text-primary'
          : 'text-foreground hover:bg-surface'
        }`}
    >
      {icon}
      {children}
    </Link>
  );
};

/** Smooth Sun / Moon theme toggle */
const ThemeToggle = ({ isDark, toggleTheme, isTransparent }) => (
  <button
    onClick={toggleTheme}
    aria-label="Toggle theme"
    className={`
      w-9 h-9 rounded-xl flex items-center justify-center
      transition-all duration-200 active:scale-90
      ${isTransparent
        ? 'text-white/70 hover:text-white hover:bg-white/10'
        : 'text-muted-foreground hover:text-foreground hover:bg-surface'
      }
    `}
  >
    <AnimatePresence mode="wait" initial={false}>
      {isDark ? (
        <motion.span
          key="sun"
          initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
          transition={{ duration: 0.18 }}
          className="flex"
        >
          <Sun size={17} strokeWidth={2} />
        </motion.span>
      ) : (
        <motion.span
          key="moon"
          initial={{ opacity: 0, rotate: 45, scale: 0.7 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: -45, scale: 0.7 }}
          transition={{ duration: 0.18 }}
          className="flex"
        >
          <Moon size={17} strokeWidth={2} />
        </motion.span>
      )}
    </AnimatePresence>
  </button>
);

export default Navbar;

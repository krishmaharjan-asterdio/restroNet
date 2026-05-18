import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Utensils, LogOut, ChevronDown, User as UserIcon, Heart, Menu, X, Sparkles } from 'lucide-react';
import { Dropdown } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const { user, logoutUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    if (user) {
      logoutUser();
      navigate('/');
    }
  };

  const navClass = `fixed top-0 w-full z-50 transition-all duration-500 ${
    isHome && !scrolled
      ? 'bg-transparent py-5'
      : 'bg-white/95 backdrop-blur-xl border-b border-warm-200 shadow-[0_1px_0_rgba(0,0,0,0.04)] py-3'
  }`;

  const userMenuItems = [
    {
      key: '1',
      label: <Link to="/profile" className="flex items-center gap-3 py-1 font-medium text-warm-700 hover:text-primary"><UserIcon size={16} /> Profile</Link>,
    },
    {
      key: '2',
      label: <Link to="/reservations" className="flex items-center gap-3 py-1 font-medium text-warm-700 hover:text-primary"><Utensils size={16} /> My Reservations</Link>,
    },
    {
      key: '3',
      label: <Link to="/profile" className="flex items-center gap-3 py-1 font-medium text-warm-700 hover:text-primary"><Heart size={16} /> Saved Places</Link>,
    },
    { type: 'divider' },
    {
      key: '4',
      label: <div onClick={handleLogout} className="flex items-center gap-3 py-1 font-bold text-red-500"><LogOut size={16} /> Logout</div>,
    },
  ];

  return (
    <>
      <header className={navClass}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="p-2 rounded-xl bg-primary text-white transition-transform group-hover:scale-105 group-active:scale-95">
              <Utensils size={20} />
            </div>
            <span className={`text-xl font-bold tracking-tight ${isHome && !scrolled ? 'text-white' : 'text-warm-900'}`}>
              RESTRO<span className="text-primary">NET</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/search"
              className={`text-sm font-medium tracking-wide transition-colors hover:text-primary ${isHome && !scrolled ? 'text-white/80' : 'text-warm-500'}`}
            >
              Explore
            </Link>
            <Link
              to="/discover"
              className={`flex items-center gap-1.5 text-sm font-medium tracking-wide transition-colors hover:text-primary ${isHome && !scrolled ? 'text-white/80' : 'text-warm-500'}`}
            >
              <Sparkles size={16} className="text-primary" />
              Discover
            </Link>

            {user ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']} overlayClassName="hearth-dropdown">
                <div className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center font-bold text-sm transition-transform group-hover:scale-105">
                    {user.name.charAt(0)}
                  </div>
                  <div className="hidden lg:block">
                    <p className={`text-[10px] font-medium uppercase tracking-widest ${isHome && !scrolled ? 'text-white/60' : 'text-warm-400'}`}>Welcome</p>
                    <p className={`text-sm font-semibold ${isHome && !scrolled ? 'text-white' : 'text-warm-900'}`}>{user.name.split(' ')[0]}</p>
                  </div>
                  <ChevronDown size={14} className={isHome && !scrolled ? 'text-white/60' : 'text-warm-400'} />
                </div>
              </Dropdown>
            ) : (
              <div className="flex items-center gap-5">
                <Link
                  to="/login"
                  className={`text-sm font-medium transition-colors hover:text-primary ${isHome && !scrolled ? 'text-white/90' : 'text-warm-600'}`}
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="bg-primary text-white rounded-xl py-2 px-5 text-sm font-semibold shadow-sm hover:bg-primary-hover transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className={`md:hidden p-2 rounded-lg transition-colors ${isHome && !scrolled ? 'text-white hover:bg-white/10' : 'text-warm-700 hover:bg-warm-100'}`}
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-2xl flex flex-col md:hidden"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-warm-200">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary text-white">
                    <Utensils size={17} />
                  </div>
                  <span className="text-base font-bold text-warm-900">
                    RESTRO<span className="text-primary">NET</span>
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-warm-100 text-warm-500 transition-colors"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer nav links */}
              <nav className="flex-1 p-4 space-y-1">
                <Link
                  to="/search"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-warm-700 hover:bg-warm-50 text-sm font-medium transition-colors"
                >
                  Explore
                </Link>
                <Link
                  to="/discover"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-warm-700 hover:bg-warm-50 text-sm font-medium transition-colors"
                >
                  <Sparkles size={16} className="text-primary" />
                  Discover
                </Link>
                {user && (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-warm-700 hover:bg-warm-50 text-sm font-medium transition-colors"
                    >
                      <UserIcon size={16} className="text-warm-400" />
                      Profile
                    </Link>
                    <Link
                      to="/reservations"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-warm-700 hover:bg-warm-50 text-sm font-medium transition-colors"
                    >
                      <Utensils size={16} className="text-warm-400" />
                      My Reservations
                    </Link>
                  </>
                )}
              </nav>

              {/* Drawer footer */}
              <div className="p-4 border-t border-warm-200">
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-3 py-2">
                      <div className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-warm-900 text-sm truncate">{user.name}</p>
                        <p className="text-warm-400 text-xs truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 text-sm font-medium transition-colors"
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-center py-2.5 rounded-xl border border-warm-200 text-sm font-medium text-warm-700 hover:bg-warm-50 transition-colors"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-center py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary-hover transition-all"
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

export default Navbar;

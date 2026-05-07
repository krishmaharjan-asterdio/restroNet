import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Utensils, LogOut, ChevronDown, User as UserIcon, Heart, Menu, X } from 'lucide-react';
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

  const navClass = `fixed top-0 w-full z-50 transition-all duration-300 ${
    isHome && !scrolled
      ? 'bg-transparent py-6'
      : 'bg-white/90 backdrop-blur-lg border-b border-gray-200/50 shadow-sm py-4'
  }`;

  const userMenuItems = [
    {
      key: '1',
      label: <Link to="/profile" className="flex items-center gap-2"><UserIcon size={16} /> Profile</Link>,
    },
    {
      key: '2',
      label: <Link to="/profile" className="flex items-center gap-2"><Heart size={16} /> Saved Places</Link>,
    },
    { type: 'divider' },
    {
      key: '3',
      label: <div onClick={handleLogout} className="flex items-center gap-2 text-red-500"><LogOut size={16} /> Logout</div>,
    },
  ];

  return (
    <>
      <header className={navClass}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-xl bg-primary text-white transition-transform group-hover:scale-105">
              <Utensils size={24} />
            </div>
            <h1 className={`text-2xl font-extrabold tracking-tight ${isHome && !scrolled ? 'text-white' : 'text-gray-900'}`}>
              RESTRO<span className={isHome && !scrolled ? 'text-white' : 'text-primary'}>NET</span>
            </h1>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/search"
              className={`font-semibold transition-colors hover:text-primary ${isHome && !scrolled ? 'text-gray-100' : 'text-gray-600'}`}
            >
              Explore
            </Link>

            {user ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
                <div className={`flex items-center gap-2 cursor-pointer font-semibold ${isHome && !scrolled ? 'text-white' : 'text-gray-800'}`}>
                  <div className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center border-2 border-white/20 shadow-sm font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <span>{user.name.split(' ')[0]}</span>
                  <ChevronDown size={16} />
                </div>
              </Dropdown>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to="/login"
                  className={`font-semibold transition-colors hover:text-primary ${isHome && !scrolled ? 'text-white' : 'text-gray-700'}`}
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="bg-primary hover:bg-primary-hover text-white font-bold py-2.5 px-6 rounded-full shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className={`md:hidden p-2 rounded-lg transition-colors ${isHome && !scrolled ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'}`}
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
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-2xl flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary text-white">
                    <Utensils size={18} />
                  </div>
                  <span className="text-lg font-extrabold text-gray-900">
                    RESTRO<span className="text-primary">NET</span>
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 p-5 space-y-1">
                <Link
                  to="/search"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
                >
                  Explore
                </Link>
                {user && (
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
                  >
                    Profile
                  </Link>
                )}
              </nav>

              <div className="p-5 border-t border-gray-100">
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-3 py-2">
                      <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold shadow-sm shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{user.name}</p>
                        <p className="text-gray-500 text-xs truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 font-semibold transition-colors"
                    >
                      <LogOut size={18} /> Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-center py-3 rounded-xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-center py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
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

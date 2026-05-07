import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Utensils, LogOut, ChevronDown, User as UserIcon, Settings, Heart, LayoutDashboard } from 'lucide-react';
import { Dropdown } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const { user, logoutUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  // Transparent nav only on home page when at top
  const isHome = location.pathname === '/';
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const textColorClass = isHome && !scrolled ? 'text-white' : 'text-gray-900';
  const logoColorClass = isHome && !scrolled ? 'text-white' : 'text-primary';

  const userMenuItems = [
    {
      key: '1',
      label: <Link to="/profile" className="flex items-center gap-2"><UserIcon size={16}/> Profile</Link>,
    },
    {
      key: '2',
      label: <Link to="/profile" className="flex items-center gap-2"><Heart size={16}/> Saved Places</Link>,
    },
    {
      type: 'divider',
    },
    {
      key: '3',
      label: <div onClick={handleLogout} className="flex items-center gap-2 text-red-500"><LogOut size={16}/> Logout</div>,
    },
  ];

  // Admin menu items removed since admin state is now decoupled from public Navbar

  return (
    <header className={navClass}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 group">
          <div className={`p-2 rounded-xl bg-primary text-white transition-transform group-hover:scale-105`}>
            <Utensils size={24} />
          </div>
          <h1 className={`text-2xl font-extrabold tracking-tight ${textColorClass}`}>
            RESTRO<span className={logoColorClass}>NET</span>
          </h1>
        </Link>
        
        <div className="flex items-center gap-8">
          <Link 
            to="/search" 
            className={`font-semibold transition-colors hover:text-primary ${isHome && !scrolled ? 'text-gray-100' : 'text-gray-600'}`}
          >
            Explore
          </Link>

          {user ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div className={`flex items-center gap-2 cursor-pointer font-semibold ${isHome && !scrolled ? 'text-white' : 'text-gray-800'}`}>
                <div className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center border-2 border-white/20 shadow-sm">
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
      </div>
    </header>
  );
};

export default Navbar;

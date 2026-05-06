import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Utensils, User as UserIcon, LogOut } from 'lucide-react';

const Navbar = () => {
  const { user, admin, logoutUser, logoutAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    if (admin) {
      logoutAdmin();
      navigate('/admin/login');
    } else if (user) {
      logoutUser();
      navigate('/');
    }
  };

  return (
    <nav className="glass-nav py-4 px-6 flex justify-between items-center sticky top-0 z-50">
      <Link to="/" className="flex items-center gap-2">
        <Utensils className="text-primary" size={28} />
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">RESTRO<span className="text-primary">NET</span></h1>
      </Link>
      
      <div className="flex items-center gap-6">
        <Link to="/search" className="text-gray-600 hover:text-primary font-medium transition-colors">
          Find Restaurants
        </Link>

        {admin ? (
          <div className="flex items-center gap-4">
            <Link to="/admin/dashboard" className="text-sm font-semibold text-accent hover:underline">
              Dashboard
            </Link>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        ) : user ? (
          <div className="flex items-center gap-4">
            <Link to="/profile" className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors font-medium">
              <UserIcon size={20} />
              <span>{user.name.split(' ')[0]}</span>
            </Link>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <div className="space-x-4">
            <Link to="/login" className="text-gray-600 hover:text-primary font-medium transition-colors">Login</Link>
            <Link to="/register" className="btn-primary-modern">Sign Up</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

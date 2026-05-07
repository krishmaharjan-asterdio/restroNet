import React, { useContext } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  BarChart, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Utensils 
} from 'lucide-react';

const AdminLayout = ({ children }) => {
  const { admin, loading, logoutAdmin } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" />;
  }

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Restaurants', path: '/admin/restaurants', icon: <Store size={20} /> },
    { name: 'Users', path: '/admin/users', icon: <Users size={20} /> },
    { name: 'Reviews', path: '/admin/reviews', icon: <MessageSquare size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-inter">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex z-20">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <Link to="/admin/dashboard" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-lg bg-primary text-white">
              <Utensils size={20} />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
              RESTRO<span className="text-primary">ADMIN</span>
            </h1>
          </Link>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className={`${isActive ? 'text-primary' : 'text-gray-400'}`}>
                  {item.icon}
                </div>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={logoutAdmin}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 shrink-0">
          <div className="md:hidden">
            <Link to="/admin/dashboard" className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary text-white">
                <Utensils size={20} />
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
                RESTRO<span className="text-primary">ADMIN</span>
              </h1>
            </Link>
          </div>
          <div className="hidden md:block"></div> {/* Spacer */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm shadow-sm border-2 border-white">
              A
            </div>
            <span className="font-semibold text-gray-800 text-sm hidden sm:block">Superadmin</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

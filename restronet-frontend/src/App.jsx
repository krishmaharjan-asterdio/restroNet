import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

import Navbar from './components/Navbar';
import Home from './pages/Home';
import Search from './pages/Search';
import RestaurantDetail from './pages/RestaurantDetail';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Discover from './pages/Discover';
import MyReservations from './pages/MyReservations';
import NotFound from './pages/NotFound';

// Admin Imports
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminRestaurants from './pages/AdminRestaurants';
import AdminUsers from './pages/AdminUsers';
import AdminReviews from './pages/AdminReviews';
import AdminOwners from './pages/AdminOwners';
import AdminReservations from './pages/AdminReservations';
import AdminLayout from './components/AdminLayout';

// Public Layout
const PublicLayout = ({ children }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className={`flex-grow flex flex-col ${isHome ? '' : 'pt-20'}`}>
        {children}
      </main>
    </div>
  );
};

// Admin Wrapper
const AdminWrapper = ({ children }) => {
  return <AdminLayout>{children}</AdminLayout>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Admin Login (No Layout) */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Admin Routes */}
          <Route path="/admin/*" element={
            <AdminWrapper>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="restaurants" element={<AdminRestaurants />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="owners" element={<AdminOwners />} />
                <Route path="reservations" element={<AdminReservations />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AdminWrapper>
          } />

          {/* Public & User Routes */}
          <Route path="/*" element={
            <PublicLayout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/restaurant/:slug" element={<RestaurantDetail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/reservations" element={<MyReservations />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PublicLayout>
          } />
        </Routes>
      </Router>
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          duration: 4000,
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        }} 
      />
    </AuthProvider>
  );
}

export default App;

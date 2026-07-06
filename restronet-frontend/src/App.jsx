import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ConciergeChat from './components/ConciergeChat';
import Home from './pages/Home';
import Search from './pages/Search';
import RestaurantDetail from './pages/RestaurantDetail';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Discover from './pages/Discover';
import MyReservations from './pages/MyReservations';
import NotFound from './pages/NotFound';

import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminRestaurants from './pages/AdminRestaurants';
import AdminUsers from './pages/AdminUsers';
import AdminReviews from './pages/AdminReviews';
import AdminOwners from './pages/AdminOwners';
import AdminReservations from './pages/AdminReservations';
import AdminLayout from './components/AdminLayout';
import OwnerDashboard from './pages/OwnerDashboard';
import OwnerLayout from './components/OwnerLayout';

const PublicLayout = ({ children }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  return (
    <div className="flex flex-col min-h-screen bg-background transition-colors duration-300">
      <Navbar />
      <main className={`flex-grow flex flex-col ${isHome ? '' : 'pt-20'}`}>
        {children}
      </main>
      <ConciergeChat />
      <Footer />
    </div>
  );
};

const AdminWrapper = ({ children }) => <AdminLayout>{children}</AdminLayout>;

const ToasterWrapper = () => {
  const { isDark } = useTheme();
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: '12px',
          background: isDark ? '#131e35' : '#1a1814',
          color: isDark ? '#f0ece4' : '#fff',
          border: isDark ? '1px solid #1e2d47' : '1px solid rgba(255,255,255,0.1)',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.4)'
            : '0 8px 32px rgba(0,0,0,0.2)',
          fontSize: '14px',
          fontWeight: '500',
          fontFamily: "'DM Sans', system-ui, sans-serif",
        },
        success: { iconTheme: { primary: '#fa6500', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
      }}
    />
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/*" element={
              <AdminWrapper>
                <Routes>
                  <Route path="dashboard"    element={<AdminDashboard />} />
                  <Route path="restaurants"  element={<AdminRestaurants />} />
                  <Route path="users"        element={<AdminUsers />} />
                  <Route path="owners"       element={<AdminOwners />} />
                  <Route path="reservations" element={<AdminReservations />} />
                  <Route path="reviews"      element={<AdminReviews />} />
                  <Route path="*"            element={<NotFound />} />
                </Routes>
              </AdminWrapper>
            } />
            <Route path="/owner/*" element={
              <OwnerLayout>
                <Routes>
                  <Route path="dashboard"    element={<OwnerDashboard />} />
                  <Route path="restaurant"   element={<AdminRestaurants />} />
                  <Route path="reservations" element={<AdminReservations />} />
                  <Route path="reviews"      element={<AdminReviews />} />
                  <Route path="*"            element={<NotFound />} />
                </Routes>
              </OwnerLayout>
            } />
            <Route path="/*" element={
              <PublicLayout>
                <Routes>
                  <Route path="/"                   element={<Home />} />
                  <Route path="/search"             element={<Search />} />
                  <Route path="/discover"           element={<Discover />} />
                  <Route path="/restaurant/:slug"   element={<RestaurantDetail />} />
                  <Route path="/login"              element={<Login />} />
                  <Route path="/register"           element={<Register />} />
                  <Route path="/forgot-password"    element={<ForgotPassword />} />
                  <Route path="/reset-password"     element={<ResetPassword />} />
                  <Route path="/profile"            element={<Profile />} />
                  <Route path="/reservations"       element={<MyReservations />} />
                  <Route path="*"                   element={<NotFound />} />
                </Routes>
              </PublicLayout>
            } />
          </Routes>
          <ToasterWrapper />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

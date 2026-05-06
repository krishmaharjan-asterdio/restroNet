import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

import Navbar from './components/Navbar';
import Home from './pages/Home';
import Search from './pages/Search';
import RestaurantDetail from './pages/RestaurantDetail';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="page-container flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow flex flex-col">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/restaurant/:slug" element={<RestaurantDetail />} />
              
              {/* User Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={<Profile />} />

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Routes>
          </main>
        </div>
      </Router>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </AuthProvider>
  );
}

export default App;

import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { AuthProvider } from './hooks/use-auth';
import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import HomePage from './pages/Home/HomePage';
import LoginPage from './pages/Login/LoginPage';
import RegisterPage from './pages/Register/RegisterPage';
import DiscoverPage from './pages/Discover/DiscoverPage';
import MessagesPage from './pages/Messages/MessagesPage';
import FriendsPage from './pages/Friends/FriendsPage';
import ProfilePage from './pages/Profile/ProfilePage';
import AdminPage from './pages/Admin/AdminPage';
import PostDetailPage from './pages/PostDetail/PostDetailPage';

const RoutesComponent = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="post/:id" element={<PostDetailPage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="friends" element={<FriendsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
};

export default RoutesComponent;

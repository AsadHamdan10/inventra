import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function AuthLayout() {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const isChangePassword = location.pathname === '/change-password';

  if (isAuthenticated && user && !isChangePassword) {
    return <Navigate to={user.role === 'super_admin' ? '/admin' : '/'} replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Brand header */}
<div className="text-center mb-8">
  <div className="flex justify-center mb-5">
    <img
      src="/assets/logo/inventra-logo.png"
      alt="Inventra ERP"
      className="h-24 w-auto object-contain"
    />
  </div>

  <h1 className="text-3xl font-extrabold text-white tracking-tight">
    Inventra ERP
  </h1>

  <p className="text-gray-400 text-sm mt-2">
    Simplifying Business Operations
  </p>
</div>

        {/* Auth card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-white/10 p-7">
          <Outlet />
        </div>

        {/* Copyright only — no developer credit on login page */}
        <p className="text-center text-gray-600 text-xs mt-6">
          © {new Date().getFullYear()} Inventra ERP. All rights reserved.
        </p>
      </div>
    </div>
  );
}

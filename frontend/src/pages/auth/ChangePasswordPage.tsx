import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { authApi } from '../../services/apiServices';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  // Not logged in at all — redirect to login
  if (!isAuthenticated) {
    navigate('/login', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    if (form.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password changed successfully. Please log in again.');
      logout();
      navigate('/login', { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const isForced = user?.forcePasswordChange === true;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {isForced ? 'Set Your Password' : 'Change Password'}
        </h2>
        {isForced && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            ⚠️ Your password was reset by an administrator. You must set a new password before continuing.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Current Password
          </label>
          <input
            className="input"
            type="password"
            placeholder="••••••••"
            value={form.currentPassword}
            onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
            required
            autoFocus
            autoComplete="current-password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            New Password
          </label>
          <input
            className="input"
            type="password"
            placeholder="••••••••"
            value={form.newPassword}
            onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
            required
            autoComplete="new-password"
          />
          <p className="text-xs text-gray-400 mt-1">Minimum 8 characters.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Confirm New Password
          </label>
          <input
            className="input"
            type="password"
            placeholder="••••••••"
            value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
            required
            autoComplete="new-password"
          />
        </div>
      </div>

      <button
        type="submit"
        className="btn-primary w-full py-2.5"
        disabled={loading || !form.currentPassword || !form.newPassword || !form.confirm}
      >
        <KeyRound size={16} />
        {loading ? 'Saving…' : 'Change Password'}
      </button>
    </form>
  );
}

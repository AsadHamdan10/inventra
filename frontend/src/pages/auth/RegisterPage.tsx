import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../../services/apiServices';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({
  companyName: '',
  username: '',
  email: '',

  gstin: '',
  panNumber: '',

  addressLine1: '',
  addressLine2: '',

  city: '',
  district: '',
  state: '',
  pincode: '',
  country: 'India',

  mobile: '',

  password: '',
  password2: '',
});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.password2) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authApi.register(form);
      setDone(true);
    } catch (err: any) {
      const backendMessage = err.response?.data?.error || err.response?.data?.message;
      setError(backendMessage || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="text-center space-y-3">
        <div className="text-4xl">✅</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Registration Successful</h2>
        <p className="text-sm text-gray-500">
          Your account is <strong>pending Super Admin approval</strong>. You'll be notified once approved.
        </p>
        <p className="text-sm text-gray-500">
          If approval is taking longer than expected, email{' '}
          <a href="mailto:maniyaliasadhamdan@gmail.com" className="text-brand-600 hover:text-brand-700 font-medium">
            maniyaliasadhamdan@gmail.com
          </a>{' '}
          for help.
        </p>
        <Link to="/login" className="btn-primary inline-flex mt-2">Back to Login</Link>
      </div>
    );
  }

  const field = (
    label: string,
    key: keyof typeof form,
    type = 'text',
    placeholder = '',
    required = false,
    fullWidth = false
  ) => (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {!required && <span className="text-gray-400 font-normal text-xs"> (optional)</span>}
      </label>
      <input
        className="input w-full"
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        required={required}
      />
    </div>
  );

  const passwordField = (
    label: string,
    key: 'password' | 'password2',
    placeholder: string,
    visible: boolean,
    onToggle: () => void
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
        <span className="text-red-500 ml-0.5">*</span>
      </label>
      <div className="relative flex items-center">
        <input
          className="input w-full pr-10"
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          required
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-0 inset-y-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white dark:bg-gray-900 sm:border sm:border-gray-200 sm:dark:border-gray-800 sm:rounded-xl p-0 sm:p-8"
      >
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create account</h2>
          <p className="text-sm text-gray-500 mt-0.5">Get started with Inventra</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Required account details ─────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Account details</h3>
            <span className="text-xs text-gray-400">
              <span className="text-red-500">*</span> required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('Company Name', 'companyName', 'text', 'ABC Trading Pvt Ltd', true)}
            {field('Username', 'username', 'text', 'abc_trading', true)}
            {field('Email', 'email', 'email', 'info@abctrading.com', true)}
            {field('Mobile', 'mobile', 'tel', '9876543210', true)}
            {passwordField('Password', 'password', 'Minimum 8 characters', showPassword, () => setShowPassword((v) => !v))}
            {passwordField('Confirm Password', 'password2', 'Re-enter password', showPassword2, () => setShowPassword2((v) => !v))}
          </div>
        </div>

        {/* ── Optional company profile ─────────────────────────── */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 dark:border-gray-800 pb-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Company profile</h3>
            <p className="text-xs text-gray-400 mt-0.5">Optional — you can complete this later from your profile.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('GSTIN', 'gstin', 'text', '33ABCDE1234F1Z5')}
            {field('PAN Number', 'panNumber', 'text', 'ABCDE1234F')}
            {field('Address Line 1', 'addressLine1', 'text', '123 Industrial Estate', false, true)}
            {field('Address Line 2', 'addressLine2', 'text', 'Phase 2, SIPCOT', false, true)}
            {field('City', 'city', 'text', 'Ranipet')}
            {field('District', 'district', 'text', 'Ranipet')}
            {field('State', 'state', 'text', 'Tamil Nadu')}
            {field('Pincode', 'pincode', 'text', '632403')}
            {field('Country', 'country', 'text', 'India')}
          </div>
        </div>

        <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
          <UserPlus size={16} />
          {loading ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
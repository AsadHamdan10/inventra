import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, X, Check } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/apiServices';
import toast from 'react-hot-toast';

type ProfileForm = {
  companyName: string;
  email: string;
  mobile: string;
  gstin: string;
  panNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  country: string;
};

const EMPTY_FORM: ProfileForm = {
  companyName: '',
  email: '',
  mobile: '',
  gstin: '',
  panNumber: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  district: '',
  state: '',
  pincode: '',
  country: 'India',
};

function buildForm(u: any): ProfileForm {
  return {
    companyName:  u.companyName  || '',
    email:        u.email        || '',
    mobile:       u.mobile       || '',
    gstin:        u.gstin        || '',
    panNumber:    u.panNumber    || '',
    addressLine1: u.addressLine1 || '',
    addressLine2: u.addressLine2 || '',
    city:         u.city         || '',
    district:     u.district     || '',
    state:        u.state        || '',
    pincode:      u.pincode      || '',
    country:      u.country      || 'India',
  };
}

export default function CompanyProfilePage() {
  const { user, setAuth, accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => authApi.me(),
    staleTime: 0,
    refetchOnMount: true,
  });

  const [saved, setSaved]     = useState<ProfileForm>(EMPTY_FORM);
  const [form, setForm]       = useState<ProfileForm>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Populate from DB on mount / after refresh
  useEffect(() => {
  const u = profile ?? user;
  if (!u || isEditing) return;

  const built = buildForm(u);
  setSaved(built);
  setForm(built);
}, [profile, user, isEditing]);

  // Keep Zustand store in sync
  useEffect(() => {
    if (!profile || !accessToken) return;
    setAuth(profile, accessToken);
  }, [profile, accessToken, setAuth]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setForm(saved);       // revert all unsaved changes
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await authApi.updateProfile(form);
      const fresh = buildForm(res.user);
      setSaved(fresh);           // commit as the new baseline
      setForm(fresh);
      setAuth(res.user, accessToken || '');
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading && !user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-gray-500">
        Loading profile…
      </div>
    );
  }

  // ── Field renderer ────────────────────────────────────────────
  const Field = ({
    label,
    name,
    placeholder = '',
    readOnly: forceReadOnly = false,
  }: {
    label: string;
    name: keyof ProfileForm;
    placeholder?: string;
    readOnly?: boolean;
  }) => {
    const editable = isEditing && !forceReadOnly;
    return (
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
          {label}
          {forceReadOnly && (
            <span className="ml-2 text-[10px] font-normal normal-case tracking-normal text-gray-400 dark:text-gray-500">
              (fixed at registration)
            </span>
          )}
        </label>
        <input
          name={name}
          value={form[name]}
          onChange={handleChange}
          placeholder={editable ? placeholder : ''}
          readOnly={!editable}
          className={[
            'w-full rounded-xl border px-4 py-3 text-sm transition-colors duration-150',
            editable
              ? 'border-indigo-400 dark:border-indigo-500 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500'
              : 'border-transparent bg-gray-100 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 cursor-default select-text',
          ].join(' ')}
        />
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6 lg:p-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Company Profile
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isEditing
                ? 'Edit your details below, then save when done.'
                : 'Your registered company information.'}
            </p>
          </div>

          {!isEditing && (
            <button
              type="button"
              onClick={handleEdit}
              className="
                inline-flex items-center gap-2
                px-4 py-2.5
                rounded-xl
                border border-indigo-600
                text-indigo-600 dark:text-indigo-400
                hover:bg-indigo-50 dark:hover:bg-indigo-900/30
                text-sm font-medium
                transition
                shrink-0
              "
            >
              <Pencil size={14} />
              Edit Profile
            </button>
          )}
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">

          <Field label="Company Name"  name="companyName"  readOnly />
          <Field label="Email"         name="email"        placeholder="info@company.com" />
          <Field label="Mobile"        name="mobile"       placeholder="9876543210" />
          <Field label="GSTIN"         name="gstin"        placeholder="33ABCDE1234F1Z5" />
          <Field label="PAN Number"    name="panNumber"    placeholder="ABCDE1234F" />
          <Field label="Address Line 1" name="addressLine1" placeholder="Door No, Street" />
          <Field label="Address Line 2" name="addressLine2" placeholder="Area / Landmark" />
          <Field label="City"          name="city"         placeholder="Chennai" />
          <Field label="District"      name="district"     placeholder="Chennai" />
          <Field label="State"         name="state"        placeholder="Tamil Nadu" />
          <Field label="Pincode"       name="pincode"      placeholder="600001" />
          <Field label="Country"       name="country"      placeholder="India" />

          {/* ── Action row — only visible in edit mode ── */}
          {isEditing && (
            <div className="lg:col-span-2 pt-2 flex flex-row items-center gap-3 border-t border-gray-100 dark:border-gray-800 mt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2
                  px-6 py-2.5
                  rounded-xl
                  bg-indigo-600 hover:bg-indigo-700
                  text-white text-sm font-medium
                  transition disabled:opacity-50
                "
              >
                <Check size={15} />
                {loading ? 'Saving…' : 'Save Changes'}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="
                  flex-1 sm:flex-none
                  inline-flex items-center justify-center gap-2
                  px-6 py-2.5
                  rounded-xl
                  border border-gray-300 dark:border-gray-700
                  text-gray-700 dark:text-gray-300
                  hover:bg-gray-50 dark:hover:bg-gray-800
                  text-sm font-medium
                  transition disabled:opacity-50
                "
              >
                <X size={15} />
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
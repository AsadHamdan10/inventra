import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export interface User {
  id: number;

  companyName: string;
  username: string;
  email: string;

  gstin?: string;
  panNumber?: string;

  mobile?: string;

  addressLine1?: string;
  addressLine2?: string;

  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  country?: string;

  profileComplete?: boolean;

  role: 'super_admin' | 'admin' | 'staff';

  status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'suspended';

  forcePasswordChange: boolean;
}

// Fields that are safe to keep in localStorage. Everything else on User —
// gstin, panNumber, mobile, addressLine1/2, city, district, state, pincode —
// is sensitive business data that the backend stores encrypted at rest.
// Persisting it to localStorage in plaintext would defeat that protection,
// since localStorage is plain JSON on disk, readable by anyone with device
// access, a malicious browser extension, or an XSS payload — no login
// required. Only the fields actually needed for layout/routing before the
// app's first /auth/me call resolves are kept here.
type PersistedUser = Pick<
  User,
  'id' | 'companyName' | 'username' | 'email' | 'role' | 'status' | 'forcePasswordChange' | 'profileComplete'
>;

function toPersistedUser(user: User | null): PersistedUser | null {
  if (!user) return null;
  const { id, companyName, username, email, role, status, forcePasswordChange, profileComplete } = user;
  return { id, companyName, username, email, role, status, forcePasswordChange, profileComplete };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  updateUser: (user: User) => void;

  setAuth: (user: User, token: string) => void;
  setToken: (token: string) => void;
  logout: () => void;
  setLoading: (v: boolean) => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false,

      setAuth: (user, accessToken) => {
        set({ user, accessToken, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      },

      updateUser: (user) => {
        set((state) => ({
          ...state,
          user,
        }));
      },

      setToken: (accessToken) => {
        set((s) => ({ ...s, accessToken }));
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      },

      logout: () => {
        set({ user: null, accessToken: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
      },

      setLoading: (isLoading) => set({ isLoading }),

      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'inventra-auth',
      partialize: (state) => ({
        // user is intentionally narrowed — see PersistedUser above.
        // Sensitive fields (gstin, panNumber, mobile, address) live only in
        // memory for the lifetime of the tab; pages that need them (e.g.
        // CompanyProfilePage) already re-fetch the full profile via
        // authApi.me() rather than reading it from this store.
        user: toPersistedUser(state.user) as unknown as User | null,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Called once Zustand has finished reading from localStorage.
        // Until this fires, isHydrated stays false and route guards
        // render nothing instead of redirecting — preventing the flicker
        // that sends users to /login and then back to / (dashboard).
        state?.setHydrated();
      },
    }
  )
);
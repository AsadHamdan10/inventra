import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';
import './styles/pwa-update.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'dark:bg-gray-800 dark:text-gray-100',
          duration: 4000,
          style: {
            borderRadius: '8px',
            fontSize: '14px',
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>
);

/**
 * Service worker registration has moved to <UpdateProvider> (see
 * src/components/pwa/UpdateContext.tsx), which is mounted inside
 * App.tsx. This keeps all PWA update logic inside the dedicated pwa
 * module instead of main.tsx — see src/services/pwaService.ts,
 * src/hooks/usePWAUpdate.ts, and src/components/pwa/UpdateDialog.tsx.
 */

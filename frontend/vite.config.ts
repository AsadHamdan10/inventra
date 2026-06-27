import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Exposes a build-time constant consumed by src/config/version.ts
  // (shown in the update dialog / Company Profile "About" section).
  define: {
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },

  plugins: [
    react(),

    VitePWA({
      // 'autoUpdate' still controls *precaching* behavior; our own
      // UpdateContext/UpdateDialog now own *when the user is told*
      // about it and *when the new SW actually takes over* — that's
      // the whole point of registerType vs. our manual registerSW()
      // call in pwaService.ts (see skipWaiting/clientsClaim notes
      // below for why this combination is safe).
      registerType: 'autoUpdate',

      includeAssets: [
        'assets/logo/icon-192.png',
        'assets/logo/icon-512.png',
        'assets/logo/inventra-logo.png'
      ],

      manifest: {
        id: "/",
        name: "Inventra ERP",
        short_name: "Inventra",

        description: "Inventra ERP - Simplifying Business Operations",

        start_url: "/",
        scope: "/",

        display: "standalone",

        orientation: "portrait",

        background_color: "#ffffff",
        theme_color: "#1e3a8a",

        icons: [
          {
            src: "/assets/logo/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/assets/logo/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/assets/logo/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable any"
          }
        ],

        screenshots: [
          {
            src: "/assets/screenshots/login-mobile.png",
            sizes: "390x844",
            type: "image/png",
            form_factor: "narrow",
            label: "Inventra Login"
          },
          {
            src: "/assets/screenshots/dashboard-mobile.png",
            sizes: "390x844",
            type: "image/png",
            form_factor: "narrow",
            label: "Dashboard"
          },
          {
            src: "/assets/screenshots/sales-mobile.png",
            sizes: "390x844",
            type: "image/png",
            form_factor: "narrow",
            label: "Sales Management"
          }
        ],

        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "Open Dashboard",
            url: "/dashboard",
            icons: [{ src: "/assets/logo/icon-192.png", sizes: "192x192", type: "image/png" }]
          },
          {
            name: "Sales",
            short_name: "Sales",
            description: "Open Sales",
            url: "/sales",
            icons: [{ src: "/assets/logo/icon-192.png", sizes: "192x192", type: "image/png" }]
          },
          {
            name: "Purchases",
            short_name: "Purchases",
            description: "Open Purchases",
            url: "/purchases",
            icons: [{ src: "/assets/logo/icon-192.png", sizes: "192x192", type: "image/png" }]
          },
          {
            name: "Customers",
            short_name: "Customers",
            description: "Open Customers",
            url: "/customers",
            icons: [{ src: "/assets/logo/icon-192.png", sizes: "192x192", type: "image/png" }]
          }
        ],
      },

      workbox: {
        cleanupOutdatedCaches: true,

        // clientsClaim + skipWaiting are what make the *waiting* SW
        // ready to take over instantly when our dialog calls
        // updateSW(true) — without these, activating the new worker
        // wouldn't actually hand control of open tabs to it.
        clientsClaim: true,
        skipWaiting: true,

        globPatterns: [
          "**/*.{js,css,html,svg,woff2}"
        ],

        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: { cacheName: "inventra-images" }
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "inventra-static" }
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts" }
          }
        ]
      }
    })
  ]
});

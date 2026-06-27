import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
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
    icons: [
      {
        src: "/assets/logo/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      }
    ]
  },
  {
    name: "Sales",
    short_name: "Sales",
    description: "Open Sales",
    url: "/sales",
    icons: [
      {
        src: "/assets/logo/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      }
    ]
  },
  {
    name: "Purchases",
    short_name: "Purchases",
    description: "Open Purchases",
    url: "/purchases",
    icons: [
      {
        src: "/assets/logo/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      }
    ]
  },
  {
    name: "Customers",
    short_name: "Customers",
    description: "Open Customers",
    url: "/customers",
    icons: [
      {
        src: "/assets/logo/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      }
    ]
  }
],
  },

  workbox: {
  cleanupOutdatedCaches: true,

  clientsClaim: true,

  skipWaiting: true,

  navigateFallback: "/offline.html",

  globPatterns: [
    "**/*.{js,css,html,png,svg,jpg,jpeg,webp,woff2}"
  ],

  runtimeCaching: [
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,

      handler: "CacheFirst",

      options: {
        cacheName: "inventra-images"
      }
    },

    {
      urlPattern: /\.(?:js|css)$/,

      handler: "StaleWhileRevalidate",

      options: {
        cacheName: "inventra-static"
      }
    },

    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,

      handler: "CacheFirst",

      options: {
        cacheName: "google-fonts"
      }
    }
  ]
}
})
  ]
});
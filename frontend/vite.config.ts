import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";

const BASE = "/dexter/";

// Dev uses the live api by default, set DEXTER_API=http://localhost:8080 to use a local one
const PROXY = {
    [`${BASE}api`]: {
        target: process.env.DEXTER_API ?? "https://tangerie.xyz",
        changeOrigin: true,
        rewrite: process.env.DEXTER_API ? ((p : string) => p.replace(`${BASE}api`, "")) : undefined
    }
};

export default defineConfig({
    base: BASE,
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url))
        }
    },
    plugins: [
        preact(),
        tailwindcss(),
        VitePWA({
            registerType: "autoUpdate",
            injectRegister: "script-defer",
            // Same name as the old workbox-cli worker so existing installs pick up the update
            filename: "service-worker.js",
            manifest: {
                name: "Dexter",
                short_name: "Dexter",
                start_url: BASE,
                scope: BASE,
                display: "standalone",
                theme_color: "#09090B",
                background_color: "#09090B",
                icons: [
                    { src: "android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
                    { src: "android-chrome-512x512.png", sizes: "512x512", type: "image/png" }
                ]
            },
            workbox: {
                globPatterns: ["**/*.{html,js,css,png,ico,svg,woff2}"],
                navigateFallback: "index.html",
                navigateFallbackDenylist: [/\/api\//],
                cleanupOutdatedCaches: true
            }
        })
    ],
    server: {
        proxy: PROXY
    },
    preview: {
        proxy: PROXY
    }
});

import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
    plugins: [
        laravel({
            input: ["resources/css/app.css", "resources/js/app.jsx"],
            refresh: true,
        }),
        react(),
    ],
    server: {
        host: "127.0.0.1",
        port: 5173,
        hmr: {
            host: "127.0.0.1",
        },
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "resources/js"),
        },
    },
});

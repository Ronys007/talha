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
        fs: {
            allow: [".", "..", "D:/Code/laravel/Vama Invoice", "D:/Code/laravel/Inventrix"],
        },
    },
    resolve: {
        preserveSymlinks: true,
        dedupe: ["react", "react-dom", "@inertiajs/react"],
        alias: {
            "@": resolve(__dirname, "resources/js"),
            react: resolve(__dirname, "node_modules/react"),
            "react-dom": resolve(__dirname, "node_modules/react-dom"),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules")) {
                        if (
                            id.includes("react") ||
                            id.includes("scheduler") ||
                            id.includes("@inertiajs")
                        ) {
                            return "vendor-react";
                        }
                    }
                },
            },
        },
    },
});

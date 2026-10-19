import "./bootstrap";
import "../css/app.css";

import { createRoot } from "react-dom/client";
import { createInertiaApp, router } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 30,
            retry: 1,
        },
    },
});

// ── Handle expired sessions & invalid Inertia responses ──────────────────────
// When the Laravel session expires or the CSRF token is stale, the server
// returns a redirect to /login (HTML) instead of a JSON Inertia response.
// Without this handler, Inertia dumps the raw response on a black screen.
// This detects status 419 (CSRF / session expired), 401 (unauthenticated),
// and 409 (Inertia version conflict after a new deploy) and does a full
// page reload so Laravel can redirect the user to /login cleanly.
router.on("invalid", (event) => {
    const status = event?.detail?.response?.status;
    if (status === 419 || status === 401 || status === 409) {
        event.preventDefault();
        window.location.reload();
    }
});
// ─────────────────────────────────────────────────────────────────────────────

import { ModeProvider } from "./Context/ModeContext";

createInertiaApp({
    title: (title) =>
        title && title !== "Vama Invoice"
            ? `${title} — Vama Invoice`
            : "Vama Invoice",
    resolve: (name) =>
        resolvePageComponent(
            [`./Pages/${name}.tsx`, `./Pages/${name}.jsx`],
            import.meta.glob(["./Pages/**/*.jsx", "./Pages/**/*.tsx"]),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(
            <QueryClientProvider client={queryClient}>
                <ModeProvider>
                    <App {...props} />
                </ModeProvider>
            </QueryClientProvider>,
        );
    },
    progress: {
        color: "#4f46e5",
    },
});

import React, { createContext, useContext, useState, useEffect } from "react";

const ModeContext = createContext({
    mode: "standard",
    setMode: () => {},
});

export function ModeProvider({ children }) {
    const [mode, setModeState] = useState(() => {
        const saved = localStorage.getItem("inventoryMode");
        return saved === "barcode" ? "barcode" : "standard";
    });

    const setMode = (newMode) => {
        const valid = newMode === "barcode" ? "barcode" : "standard";
        setModeState(valid);
        localStorage.setItem("inventoryMode", valid);
        window.dispatchEvent(new CustomEvent("inventoryModeChanged", { detail: valid }));
    };

    useEffect(() => {
        const handler = (e) => {
            if (e.detail && e.detail !== mode) {
                setModeState(e.detail);
            }
        };
        window.addEventListener("inventoryModeChanged", handler);
        return () => window.removeEventListener("inventoryModeChanged", handler);
    }, [mode]);

    return (
        <ModeContext.Provider value={{ mode, setMode }}>
            {children}
        </ModeContext.Provider>
    );
}

export function useMode() {
    return useContext(ModeContext);
}

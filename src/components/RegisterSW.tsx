"use client";

// Service worker registration shim. NOT wired up yet.
//
// To enable offline support, import this component into `src/app/layout.tsx`
// and render it inside <body>:
//
//   import { RegisterSW } from "@/components/RegisterSW";
//   ...
//   <body ...>
//     <RegisterSW />
//     ...
//   </body>
//
// It registers `public/sw.js` once on mount in production-capable browsers.

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Only attempt registration on a secure context (https or localhost).
    if (!window.isSecureContext) return;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[sgbus] service worker registration failed:", err);
    });
  }, []);

  return null;
}

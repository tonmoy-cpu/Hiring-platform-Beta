"use client";

import { useState, useEffect, ReactNode } from "react";
import Toast from "@/components/Toast";
import "./globals.css";
import { Toaster } from "react-hot-toast";

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const listener = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setToast(customEvent.detail);
    };

    window.addEventListener("show-toast", listener);

    return () => {
      window.removeEventListener("show-toast", listener);
    };
  }, []);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#373737]">
        {children}

        {toast && (
          <Toast
            message={toast}
            onClose={() => setToast(null)}
          />
        )}

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#313131",
              color: "#fff",
              borderRadius: "8px",
            },
            duration: 5000,
          }}
        />
      </body>
    </html>
  );
}
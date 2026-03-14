import "./globals.css";
import React from "react";
import { ClientShell } from "../components/client-shell.jsxx";

export const metadata = {
  title: "VIGEN — AI Music Video Generator",
  description: "Upload a track. Get a cinematic, beat-synchronized music video in minutes."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
        />
      </head>
      <body>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}

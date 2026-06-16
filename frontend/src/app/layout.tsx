import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FaberLoom · Copiloto B2B",
  description: "FaberLoom — SpaceLoom · chat universal HITL seguro",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-theme="warm">
      <body>{children}</body>
    </html>
  );
}

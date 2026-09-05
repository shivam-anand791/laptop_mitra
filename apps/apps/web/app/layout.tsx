import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaptopMitra - Admin Panel",
  description: "Admin panel for LaptopMitra e-commerce platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

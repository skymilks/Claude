import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bid Intelligence - Tender Analysis Dashboard",
  description: "AI-powered bid and tender document analysis",
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

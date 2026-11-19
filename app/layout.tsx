import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Lumière Ristorante e Lounge Bar — Fine Italian Dining",
  description:
    "Fine Italian Dining & Lounge. Interactive 2D table reservations, artisanal seasonal courses, and a rare collection of Italian reserve wines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#071F1A] text-[#F7F6F1] antialiased selection:bg-[#C8A96A]/30 selection:text-[#F7F6F1]">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

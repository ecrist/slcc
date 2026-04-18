import type { Metadata } from "next";
import { Roboto_Condensed, Merriweather } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import AdminBar from "@/components/AdminBar";
import Footer from "@/components/Footer";
import SessionProvider from "@/components/SessionProvider";
import PwaProvider from "@/components/PwaProvider";
import { ToastProvider } from "@/components/Toast";
import AnnouncementBanner from "@/components/AnnouncementBanner";

const robotoCondensed = Roboto_Condensed({
  subsets: ["latin"],
  variable: "--font-roboto-condensed",
  weight: ["400", "500", "600", "700"],
});

const merriweather = Merriweather({
  subsets: ["latin"],
  variable: "--font-merriweather",
  weight: ["300", "400", "700"],
});

export const metadata: Metadata = {
  title: "Swan Lake Country Club | Pengilly, MN",
  description:
    "Swan Lake Country Club in Pengilly, Minnesota. Book tee times, purchase memberships, and view upcoming events.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Swan Lake CC",
  },
  other: {
    "theme-color": "#2d6a4f",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
      </head>
      <body className={`${robotoCondensed.variable} ${merriweather.variable} font-body flex flex-col min-h-screen`}>
        <SessionProvider>
          <ToastProvider>
            <AnnouncementBanner />
            <Header />
            <AdminBar />
            <main className="flex-1">{children}</main>
            <Footer />
            <PwaProvider />
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono, Archivo, Newsreader } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Nav } from "./components/nav";
import { Footer } from "./components/footer";
import { MobileTabBar } from "./components/mobile-tab-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Heavy, extended grotesque for titles and tags. The width axis gives the
// wide look of the team banner without a separate font file.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

// Serif for the big marketing headlines.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DeckDen",
  description: "Build, share, and browse TCG decklists",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground relative">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -top-48 -right-40 h-[32rem] w-[32rem] rounded-full bg-brand/15 blur-3xl" />
          <div className="absolute top-2/3 -left-48 h-96 w-96 rounded-full bg-brush/10 blur-3xl" />
        </div>
        <AuthProvider>
          <Nav />
          <main className="flex-1 flex flex-col pb-20 md:pb-0">{children}</main>
          <Footer />
          <MobileTabBar />
        </AuthProvider>
      </body>
    </html>
  );
}

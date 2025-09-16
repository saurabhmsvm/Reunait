import type { Metadata } from "next";
import { Geist, Geist_Mono, Rock_Salt } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ClientOnly } from "@/components/client-only";
import { ToastProvider } from "@/contexts/toast-context";
import { ClerkProvider } from "@clerk/nextjs";
import { OnboardingGate } from "@/components/OnboardingGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Handwritten/accent font close to "Rockybilly" vibe
const accent = Rock_Salt({
  variable: "--font-accent",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FindMe - Missing Person Platform",
  description: "Find missing persons using AI technology and community support",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${accent.variable} antialiased`}>
        <ClerkProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <ToastProvider>
              <div className="min-h-screen flex flex-col animate-in fade-in-0 duration-700">
                <ClientOnly>
                  <Navbar />
                </ClientOnly>
                <main className="flex-1 pt-24 animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-200">
                  <OnboardingGate>
                    {children}
                  </OnboardingGate>
                </main>
                <Footer />
              </div>
            </ToastProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}

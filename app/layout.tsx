import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import { ToastProvider } from "../lib/toast-context";
import { SiteProvider } from "../lib/site-context";
import { SiteGuard } from "../components/SiteGuard";
import ToastContainer from "../components/ToastContainer";
import { EnvironmentBadge } from "../components/EnvironmentBadge";
import { getAppEnvironment } from '@/lib/env-validation';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ERP System",
  description: "Enterprise Resource Planning System",
};

// Force dynamic rendering for all pages (required for useSearchParams)
export const dynamic = 'force-dynamic';

// Log application startup
// if (typeof window === 'undefined') {
//   const appEnv = getAppEnvironment();
//   console.log(`🚀 Application started in ${appEnv} mode`);
//   console.log(`🌐 Multi-site support enabled`);
//   console.log(`📍 Default site: demo.batasku.cloud`);
// }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SiteProvider>
          <ToastProvider>
            <SiteGuard>
              <Navbar />
              <main className="min-h-screen bg-gray-50">
                {children}
              </main>
              <ToastContainer />
              <EnvironmentBadge />
            </SiteGuard>
          </ToastProvider>
        </SiteProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import { ToastProvider } from "../lib/toast-context";
import ToastContainer from "../components/ToastContainer";
import { EnvironmentBadge } from "../components/EnvironmentBadge";
import { validateEnv, getAppEnvironment } from '@/lib/env-validation';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ERP System",
  description: "Enterprise Resource Planning System",
};

// Force dynamic rendering for all pages (required for useSearchParams)
export const dynamic = 'force-dynamic';

// Validate environment on server startup
if (typeof window === 'undefined') {
  try {
    const env = validateEnv();
    const appEnv = getAppEnvironment();
    console.log(`🚀 Application started in ${appEnv} mode`);
    console.log(`🔗 Connected to: ${env.ERPNEXT_API_URL}`);
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    throw error;
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          <Navbar />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
          <ToastContainer />
          <EnvironmentBadge />
        </ToastProvider>
      </body>
    </html>
  );
}

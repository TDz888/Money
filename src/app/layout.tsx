import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Lux Cipher — AI Chat",
  description:
    "A secure multi-model AI chat. Earn credits by completing a Yeumoney task and chat with GPT, Claude, Gemini and more.",
  keywords: ["AI", "Chat", "OpenAI", "Claude", "Gemini", "Yeumoney"],
  authors: [{ name: "Lux Cipher" }],
  openGraph: {
    title: "Lux Cipher — AI Chat",
    description: "Multi-model AI chat with token-based access.",
    type: "website"
  },
  robots: { index: true, follow: true }
};

export const viewport = {
  themeColor: "#0A0A0F",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} dark`}>
      <body className="font-sans bg-surface-base text-text-primary antialiased">
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "#111118",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#F0F0F5"
            }
          }}
        />
      </body>
    </html>
  );
}

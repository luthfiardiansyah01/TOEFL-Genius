import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/lib/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TOEFL Genius — AI Tutor by GLM-5.3",
  description:
    "Modern, mobile-first TOEFL learning app with AI-powered reading, listening, speaking, writing, quizzes, mini games, mock tests and adaptive learning. Development by MoedaTrace.",
  keywords: [
    "TOEFL",
    "English learning",
    "AI tutor",
    "GLM-5.3",
    "reading",
    "listening",
    "speaking",
    "writing",
    "MoedaTrace",
  ],
  authors: [{ name: "MoedaTrace", url: "https://github.com/MoedaTrace" }],
  creator: "MoedaTrace",
  publisher: "MoedaTrace",
  applicationName: "TOEFL Genius",
  generator: "MoedaTrace",
  copyright: "© MoedaTrace. All rights reserved.",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f5" },
    { media: "(prefers-color-scheme: dark)", color: "#1a2422" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* 
          ============================================================
          TOEFL Genius — AI Tutor by GLM-5.3
          Development by MoedaTrace © 2025
          https://github.com/MoedaTrace
          All rights reserved. Unauthorized copying or redistribution
          of this software is prohibited.
          ============================================================
        */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}

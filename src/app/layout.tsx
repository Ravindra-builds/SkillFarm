import type { Metadata } from "next";
import { Inter, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SkillFarm — Plant knowledge. Grow skills. Ship real things.",
    template: "%s | SkillFarm",
  },
  description:
    "Your AI Engineering Team — learn what matters, get guidance from specialized experts, build real projects, and ship them into the real world.",
  keywords: [
    "SkillFarm",
    "AI mentorship",
    "engineering mentorship",
    "learn to code",
    "backend",
    "frontend",
    "devops",
    "AI engineer",
    "system design",
  ],
  authors: [{ name: "SkillFarm" }],
  creator: "SkillFarm",
  metadataBase: new URL("https://skillfarm.in"),
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "SkillFarm — Plant knowledge. Grow skills. Ship real things.",
    description:
      "Your AI Engineering Team — learn what matters, get guidance from specialized experts, build real projects, and ship them into the real world.",
    siteName: "SkillFarm",
    url: "https://skillfarm.in",
  },
  twitter: {
    card: "summary_large_image",
    title: "SkillFarm — Plant knowledge. Grow skills. Ship real things.",
    description:
      "Your AI Engineering Team — learn what matters, get guidance from specialized experts, build real projects, and ship them into the real world.",
    creator: "@skillfarm_in",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${manrope.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}

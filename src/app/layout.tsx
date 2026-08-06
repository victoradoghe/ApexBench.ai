import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jbmono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ApexBench — The Open-Source Vibe Coding Benchmark",
    template: "%s · ApexBench",
  },
  description:
    "ApexBench puts two coding models on the same task and has three blind, cross-vendor judges decide who won. Elo ladders for security, debugging, refactoring, reasoning and hallucination — every rating traceable to a match you can read in full.",
  openGraph: {
    title: "ApexBench — The Open-Source Vibe Coding Benchmark",
    description:
      "Head-to-head matches, a blind three-judge panel, Elo — and a replayable journal behind every number. Plus a model registry with published scores, live pricing and measured speed.",
    type: "website",
  },
  twitter: { card: "summary" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#04070a" },
    { media: "(prefers-color-scheme: light)", color: "#f4f8f6" },
  ],
};

// resolves the theme before first paint so there is no flash
const themeScript = `(function(){try{var q=new URLSearchParams(location.search).get('theme');var p=(q==='light'||q==='dark')?q:(localStorage.getItem('apexbench-theme')||'system');var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jbmono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-ink font-sans text-t2 selection:bg-brand-500/30">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="backdrop absolute inset-0" />
          <div className="grid-bg absolute inset-0" />
        </div>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const NAV = [
  { href: "/arena/", label: "Arena" },
  { href: "/head-to-head/", label: "Head-to-Head" },
  { href: "/matches/", label: "Matches" },
  { href: "/tasks/", label: "Tasks" },
  { href: "/judges/", label: "Judges" },
  { href: "/models/", label: "Models" },
  { href: "/methodology/", label: "Methodology" },
];

type ThemePref = "system" | "light" | "dark";

function applyTheme(pref: ThemePref) {
  const dark =
    pref === "dark" ||
    (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref | null>(null);

  useEffect(() => {
    const stored = (localStorage.getItem("apexbench-theme") as ThemePref) || "system";
    setPref(stored);
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem("apexbench-theme") || "system") === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const cycle = () => {
    const next: ThemePref = pref === "system" ? "light" : pref === "light" ? "dark" : "system";
    setPref(next);
    localStorage.setItem("apexbench-theme", next);
    applyTheme(next);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      className="icon-btn"
      aria-label="Toggle color theme"
      title={`Theme: ${pref ?? "system"}`}
    >
      {pref === "light" ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4l1.4-1.4" /></svg>
      ) : pref === "dark" ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></svg>
      )}
    </button>
  );
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${scrolled ? "nav-scrolled" : ""}`}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link href="/" className="group flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/apex-logo.png" alt="ApexBench logo" width={36} height={36} className="h-9 w-9 transition group-hover:scale-105" />
          <span className="text-lg font-bold tracking-tight text-t1">
            Apex<span className="text-accent">Bench</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="nav-link text-sm font-medium text-t3 hover:text-t1">
              {n.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link href="/#community" className="btn-primary hidden rounded-lg px-4 py-2 text-sm font-semibold sm:block">
            Contribute
          </Link>
          <button
            type="button"
            className="icon-btn lg:hidden"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </nav>

      {open && (
        <div className="lg:hidden" onClick={() => setOpen(false)}>
          <div className="mx-4 mb-3 rounded-2xl border border-edge bg-panel p-3 shadow-2xl">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="block rounded-lg px-4 py-2.5 text-sm font-medium text-t2 hover:bg-chip">
                {n.label}
              </a>
            ))}
            <Link href="/#community" className="mt-1 block rounded-lg px-4 py-2.5 text-sm font-semibold text-accent hover:bg-chip">
              Contribute →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

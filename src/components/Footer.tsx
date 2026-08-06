import Link from "next/link";
import { CATEGORY_META } from "@/data/arena";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-edge">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:grid-cols-2 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-1">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/apex-logo.png" alt="ApexBench logo" width={32} height={32} className="h-8 w-8" />
            <span className="font-bold text-t1">
              Apex<span className="text-accent">Bench</span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm text-t4">
            The open-source vibe coding benchmark. Built by vibe coders, for vibe coders.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-t1">Categories</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-t4">
            {CATEGORY_META.map((c) => (
              <li key={c.key}>
                <Link href={`/arena/${c.key}/`} className="transition hover:text-accent">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-t1">Explore</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-t4">
            <li><Link href="/arena/" className="transition hover:text-accent">Arena</Link></li>
            <li><Link href="/head-to-head/" className="transition hover:text-accent">Head-to-Head</Link></li>
            <li><Link href="/matches/" className="transition hover:text-accent">Match journal</Link></li>
            <li><Link href="/tasks/" className="transition hover:text-accent">Task packs</Link></li>
            <li><Link href="/judges/" className="transition hover:text-accent">The panel</Link></li>
            <li><Link href="/models/" className="transition hover:text-accent">Model registry</Link></li>
            <li><Link href="/methodology/" className="transition hover:text-accent">Methodology</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-t1">Community</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-t4">
            <li><a href="#" className="transition hover:text-accent">GitHub</a></li>
            <li><a href="#" className="transition hover:text-accent">X / Twitter</a></li>
            <li><a href="#" className="transition hover:text-accent">Discord</a></li>
            <li><Link href="/#community" className="transition hover:text-accent">Contribute</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-edge">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-t4 sm:flex-row">
          <span>© 2026 ApexBench. Open methodology, open harness, open results.</span>
          <span className="font-mono">Built by vibe coders, for vibe coders.</span>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { useState } from "react";

export default function Newsletter() {
  const [state, setState] = useState<"idle" | "error" | "done">("idle");

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email")?.toString().trim() ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState("error");
      return;
    }
    localStorage.setItem("apexbench-digest", email);
    setState("done");
  };

  return (
    <>
      {state !== "done" && (
        <form className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row" noValidate onSubmit={submit}>
          <label htmlFor="newsEmail" className="sr-only">Email address</label>
          <input id="newsEmail" name="email" className="field flex-1" type="email" placeholder="you@ship-it.dev" required />
          <button className="btn-ghost rounded-xl px-5 py-2.5 text-sm font-semibold" type="submit">
            Get run digests
          </button>
        </form>
      )}
      <p className="mt-3 text-xs" style={{ color: state === "error" ? "var(--fail)" : state === "done" ? "var(--pass)" : "var(--t4)" }}>
        {state === "done"
          ? "✓ You’re on the list — first digest lands after the next public run."
          : state === "error"
            ? "That doesn’t look like an email — try again?"
            : "Monthly digest of new runs, rank moves and methodology changes. No hype, no spam."}
      </p>
    </>
  );
}

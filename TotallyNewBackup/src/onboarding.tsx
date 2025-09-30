// src/onboarding.tsx
import React, { useState } from "react";

export default function Onboarding() {
  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      setStatus("saving");
      // Local capture for now (safe even without backend):
      if (email) localStorage.setItem("userEmail", email);
      if (telegram) localStorage.setItem("userTelegram", telegram);

      // OPTIONAL backend call (enable later when endpoint is ready):
      // await fetch("/api/onboarding", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email, telegram }),
      // });

      setStatus("saved");
      setMessage("Saved. You can close this page or go to the dashboard.");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("Could not save right now. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Onboarding</h1>
        <p className="text-white/70 mb-8">
          Add your contact so we can connect your account later. Telegram handle
          is enough for now.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm mb-1">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              className="w-full rounded-md px-3 py-2 bg-white/5 border border-white/10 outline-none"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Telegram handle</label>
            <div className="flex gap-2">
              <span className="px-3 py-2 bg-white/5 border border-white/10 rounded-md select-none">
                @
              </span>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.currentTarget.value.replace(/^@/, ""))}
                className="flex-1 rounded-md px-3 py-2 bg-white/5 border border-white/10 outline-none"
                placeholder="yourhandle"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={status === "saving"}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 bg-cyan-500/90 hover:bg-cyan-400/90 disabled:opacity-60"
          >
            {status === "saving" ? "Saving…" : "Save"}
          </button>

          {message && (
            <p
              className={
                "mt-2 text-sm " +
                (status === "error" ? "text-red-400" : "text-green-400")
              }
            >
              {message}
            </p>
          )}
        </form>

        <div className="mt-10 text-sm text-white/60">
          <p>
            Later, this page will also ping our backend (
            <code>/api/onboarding</code>) and our Telegram bot to confirm.
          </p>
        </div>
      </div>
    </main>
  );
}

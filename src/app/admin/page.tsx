"use client";

import { useState, useEffect } from "react";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Check if already authenticated (cookie exists and is valid)
  useEffect(() => {
    fetch("/api/auth/google", { method: "HEAD", redirect: "manual" })
      .then((res) => {
        // If not 401, the cookie is valid
        setAuthenticated(res.status !== 401);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      setAuthenticated(true);
    } else {
      setError("Mot de passe incorrect.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-on-surface-variant">Chargement...</div>
      </div>
    );
  }

  // ── Login Screen ──
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-8">
        <div className="bg-surface-container-low rounded-[2rem] border border-outline-variant/10 shadow-2xl p-8 lg:p-12 max-w-md w-full">
          <h1 className="font-headline text-2xl font-bold mb-2 text-on-surface">
            Admin NovaAI
          </h1>
          <p className="text-on-surface-variant text-sm mb-8">
            Entrez le mot de passe administrateur pour continuer.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              required
              className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-4 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-on-surface-variant/40 outline-none"
            />
            {error && (
              <p className="text-error text-sm">{error}</p>
            )}
            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-primary-container to-primary text-on-primary font-bold rounded-xl hover:shadow-[0_0_20px_rgba(0,229,255,0.3)] active:scale-95 transition-all"
            >
              Se connecter
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Admin Dashboard ──
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-8">
      <div className="bg-surface-container-low rounded-[2rem] border border-outline-variant/10 shadow-2xl p-8 lg:p-12 max-w-lg w-full">
        <h1 className="font-headline text-3xl font-bold mb-2 text-on-surface">
          Admin NovaAI
        </h1>
        <p className="text-on-surface-variant mb-8">
          Connectez vos services pour activer les intégrations.
        </p>

        <div className="space-y-6">
          {/* Google Calendar */}
          <div className="p-6 rounded-2xl bg-surface-container border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" />
              </svg>
              <h2 className="text-lg font-bold text-on-surface">Google Calendar</h2>
            </div>
            <p className="text-sm text-on-surface-variant mb-4">
              Connectez votre compte Google pour créer automatiquement des
              événements quand un prospect réserve un créneau.
            </p>
            <a
              href="/api/auth/google"
              className="inline-block px-6 py-3 bg-gradient-to-r from-primary-container to-primary text-on-primary rounded-full font-bold text-sm hover:shadow-[0_0_20px_rgba(0,229,255,0.3)] active:scale-95 transition-all"
            >
              Connecter Google Calendar
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-outline-variant/10">
          <a href="/" className="text-sm text-on-surface-variant hover:text-primary transition-colors">
            ← Retour au site
          </a>
        </div>
      </div>
    </div>
  );
}

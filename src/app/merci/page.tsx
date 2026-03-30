"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ScheduleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
    </svg>
  );
}

function ThankYouContent() {
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  const time = searchParams.get("time");

  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/60 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto font-headline tracking-tight">
          <a
            href="/"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://innoft.ma/wp-content/uploads/2024/06/log-2048x2048.png" alt="Innoft" className="h-10 w-auto" />
          </a>
        </div>
      </nav>

      <main className="pt-24 min-h-screen flex items-center justify-center px-8 relative overflow-hidden">
        <div className="max-w-2xl w-full relative z-10">
          <div className="bg-surface-container-low rounded-[2.5rem] border border-outline-variant/10 shadow-2xl p-8 lg:p-16 text-center">
            {/* Success icon */}
            <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <CheckCircleIcon className="w-10 h-10 text-primary" />
            </div>

            <h1 className="font-headline text-3xl lg:text-4xl font-bold mb-4 text-on-surface">
              Merci pour votre demande !
            </h1>

            {date && time ? (
              <>
                <p className="text-lg text-on-surface-variant leading-relaxed mb-6">
                  Votre consultation est prévue le{" "}
                  <span className="text-primary font-semibold">{date}</span> à{" "}
                  <span className="text-primary font-semibold">{time}</span>.
                </p>
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-surface-container border border-outline-variant/10 mb-10">
                  <ScheduleIcon className="w-5 h-5 text-primary" />
                  <span className="text-on-surface font-medium">
                    {date} — {time}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-lg text-on-surface-variant leading-relaxed mb-10">
                Votre demande a bien été enregistrée.
              </p>
            )}

            <p className="text-on-surface-variant mb-10">
              Un consultant vous contactera sous 24h pour confirmer le créneau.
            </p>

            <a
              href="/"
              className="inline-block px-8 py-4 bg-gradient-to-br from-primary-container to-primary text-on-primary rounded-full font-bold text-lg hover:shadow-[0_0_30px_rgba(0,229,255,0.3)] transition-all"
            >
              Retour à l&apos;accueil
            </a>
          </div>
        </div>

        {/* Decorative orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-tertiary/5 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2" />
      </main>
    </>
  );
}

export default function MerciPage() {
  return (
    <Suspense>
      <ThankYouContent />
    </Suspense>
  );
}

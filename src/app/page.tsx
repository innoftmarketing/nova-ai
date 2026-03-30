"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* ───────── Icon Components ───────── */

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
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

function VideoCamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
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
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function SupportAgentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 12.22C21 6.73 16.74 3 12 3c-4.69 0-9 3.65-9 9.28-.6.34-1 .98-1 1.72v2c0 1.1.9 2 2 2h1v-6.1c0-3.87 3.13-7 7-7s7 3.13 7 7V19h-8v2h8c1.1 0 2-.9 2-2v-1.22c.59-.31 1-.92 1-1.64v-2.3c0-.7-.41-1.31-1-1.62z" />
      <circle cx="9" cy="13" r="1" />
      <circle cx="15" cy="13" r="1" />
      <path d="M18 11.03A6.04 6.04 0 0 0 12.05 6c-3.03 0-6.29 2.51-6.03 6.45a8.075 8.075 0 0 0 4.86-5.89c1.31 2.63 4 4.44 7.12 4.47z" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
    </svg>
  );
}

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


/* ───────── Calendar helpers ───────── */
const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAYS_HEADER = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];
const TIME_SLOTS = ["09:00", "10:30", "11:00", "13:30", "15:00", "16:30", "17:00"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

/* ───────── Booking Wizard ───────── */
function BookingWizard() {
  const router = useRouter();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const todayDate = today.getDate();
  const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear();

  function prevMonth() {
    if (isCurrentMonth) return;
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  }

  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  }

  const selectedDateLabel = selectedDay
    ? `${selectedDay} ${MONTH_NAMES[currentMonth]} ${currentYear}`
    : null;

  /* ── Step 1: Calendar + Time ── */
  if (step === 1) {
    return (
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-headline text-4xl lg:text-5xl font-bold mb-4 text-on-surface">
            Passez au site intelligent.
          </h2>
          <p className="text-on-surface-variant text-lg">
            Choisissez un créneau. Un consultant vous contacte pour en discuter.
          </p>
        </div>

        <div className="bg-surface-container-low rounded-[2.5rem] border border-outline-variant/10 shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[650px]">
          {/* Sidebar */}
          <div className="lg:w-1/3 p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-outline-variant/10 bg-surface-container">
            <div className="mb-8">
              <div className="text-primary-container font-bold text-sm tracking-widest uppercase mb-2">Consultation</div>
              <h3 className="text-2xl font-bold mb-4 text-on-surface">Stratégie IA &amp; Croissance</h3>
              <div className="flex items-center gap-2 text-on-surface-variant mb-4">
                <ScheduleIcon className="w-4 h-4" />
                <span className="text-sm">30 min</span>
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant">
                <VideoCamIcon className="w-4 h-4" />
                <span className="text-sm">Google Meet / Zoom</span>
              </div>
            </div>
            <div className="space-y-4 text-sm text-on-surface-variant leading-relaxed">
              <p>Lors de cet appel, nous analyserons :</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>Votre tunnel de vente actuel</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>Le potentiel d&apos;automatisation IA</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>Un plan d&apos;action personnalisé</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Calendar + Time */}
          <div className="flex-1 flex flex-col md:flex-row bg-surface-container-low">
            {/* Calendar */}
            <div className="flex-1 p-8">
              <div className="flex items-center justify-between mb-8">
                <h4 className="font-bold text-lg text-on-surface">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </h4>
                <div className="flex gap-2">
                  <button onClick={prevMonth} className={`p-1 rounded-full transition-colors ${isCurrentMonth ? "opacity-30 cursor-not-allowed" : "hover:bg-white/5"}`}>
                    <ChevronLeftIcon className="w-5 h-5 text-on-surface" />
                  </button>
                  <button onClick={nextMonth} className="p-1 hover:bg-white/5 rounded-full transition-colors">
                    <ChevronRightIcon className="w-5 h-5 text-on-surface" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-on-surface-variant mb-4">
                {DAYS_HEADER.map((d) => <span key={d}>{d}</span>)}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`blank-${i}`} className="h-10" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const isPast = isCurrentMonth && day < todayDate;
                  const isSunday = (firstDay + day - 1) % 7 === 6;
                  const disabled = isPast || isSunday;
                  const isSelected = selectedDay === day;
                  const isToday = isCurrentMonth && day === todayDate;

                  return (
                    <button
                      key={day}
                      disabled={disabled}
                      onClick={() => setSelectedDay(day)}
                      className={`h-10 w-10 mx-auto flex items-center justify-center rounded-full transition-all text-sm
                        ${disabled ? "opacity-20 cursor-not-allowed text-on-surface-variant" : ""}
                        ${isSelected ? "bg-primary text-on-primary font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)]" : ""}
                        ${!disabled && !isSelected && isToday ? "text-primary border border-primary/20 hover:bg-primary-container/20" : ""}
                        ${!disabled && !isSelected && !isToday ? "hover:bg-primary-container/20 hover:text-primary text-on-surface" : ""}
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots */}
            <div className="md:w-72 p-8 border-t md:border-t-0 md:border-l border-outline-variant/10">
              {selectedDay ? (
                <>
                  <h4 className="font-bold text-lg mb-8 text-on-surface">Heure</h4>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {TIME_SLOTS.map((time) => {
                      const isSelected = selectedTime === time;
                      return (
                        <div key={time} className="flex gap-2 items-center">
                          <button
                            onClick={() => setSelectedTime(time)}
                            className={`flex-1 py-3 rounded-xl font-medium transition-all border text-sm
                              ${isSelected
                                ? "bg-surface-container-highest border-primary/40 text-primary"
                                : "border-outline-variant/20 text-on-surface hover:border-primary/40 hover:text-primary"
                              }
                            `}
                          >
                            {time}
                          </button>
                          {isSelected && (
                            <button
                              onClick={() => setStep(2)}
                              className="px-5 py-3 bg-gradient-to-r from-primary-container to-primary text-on-primary rounded-xl font-bold text-sm hover:shadow-[0_0_20px_rgba(0,229,255,0.3)] active:scale-95 transition-all"
                            >
                              Suivant
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-on-surface-variant/40 text-sm text-center px-4">
                  Sélectionnez un jour pour voir les créneaux disponibles
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Step 2: Form ── */
  if (step === 2) {
    return (
      <div className="max-w-2xl mx-auto relative z-10">
        <div className="bg-surface-container-low rounded-[2.5rem] border border-outline-variant/10 shadow-2xl p-8 lg:p-12">
          {/* Back + selected date */}
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-6"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Modifier le créneau
          </button>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <ScheduleIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {selectedDateLabel} à {selectedTime}
            </span>
          </div>

          <div className="mb-10">
            <h2 className="font-headline text-3xl lg:text-4xl font-bold mb-3 text-on-surface">
              Demander votre consultation gratuite
            </h2>
            <p className="text-on-surface-variant">
              Remplissez le formulaire. Un consultant vous contacte pour confirmer.
            </p>
          </div>

          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (typeof window !== "undefined" && typeof window.fbq === "function") {
                window.fbq("track", "Lead");
              }
              const params = new URLSearchParams({
                date: selectedDateLabel || "",
                time: selectedTime || "",
              });
              router.push(`/merci?${params.toString()}`);
            }}
          >
            {/* Nom complet */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">
                Nom complet <span className="text-primary-container">*</span>
              </label>
              <input
                className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-4 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-on-surface-variant/40 outline-none"
                placeholder="Votre nom complet"
                required
                type="text"
              />
            </div>

            {/* Numéro de téléphone */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">
                Numéro de téléphone <span className="text-primary-container">*</span>
              </label>
              <input
                className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-4 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-on-surface-variant/40 outline-none"
                placeholder="+33 6 12 34 56 78"
                required
                type="tel"
              />
            </div>

            {/* Nom de l'entreprise */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">
                Nom de l&apos;entreprise <span className="text-primary-container">*</span>
              </label>
              <input
                className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-4 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-on-surface-variant/40 outline-none"
                placeholder="Nom de votre entreprise"
                required
                type="text"
              />
            </div>

            {/* Ville */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">
                Ville <span className="text-primary-container">*</span>
              </label>
              <input
                className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-4 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-on-surface-variant/40 outline-none"
                placeholder="Votre ville"
                required
                type="text"
              />
            </div>

            {/* Avez-vous déjà un site web ? */}
            <fieldset>
              <legend className="block text-sm font-medium text-on-surface-variant mb-3">
                Avez-vous déjà un site web ? <span className="text-primary-container">*</span>
              </legend>
              <div className="flex gap-4">
                <label className="flex-1 cursor-pointer">
                  <input type="radio" name="has_website" value="oui" required className="peer sr-only" />
                  <div className="py-3 px-4 text-center border border-outline-variant/20 rounded-xl text-on-surface-variant peer-checked:border-primary/40 peer-checked:text-primary peer-checked:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all font-medium">
                    Oui
                  </div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input type="radio" name="has_website" value="non" required className="peer sr-only" />
                  <div className="py-3 px-4 text-center border border-outline-variant/20 rounded-xl text-on-surface-variant peer-checked:border-primary/40 peer-checked:text-primary peer-checked:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all font-medium">
                    Non
                  </div>
                </label>
              </div>
            </fieldset>

            {/* Quand souhaitez-vous lancer votre projet ? */}
            <fieldset>
              <legend className="block text-sm font-medium text-on-surface-variant mb-3">
                Quand souhaitez-vous lancer votre projet ? <span className="text-primary-container">*</span>
              </legend>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex-1 cursor-pointer">
                  <input type="radio" name="timeline" value="asap" required className="peer sr-only" />
                  <div className="py-3 px-4 text-center border border-outline-variant/20 rounded-xl text-on-surface-variant peer-checked:border-primary/40 peer-checked:text-primary peer-checked:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all font-medium text-sm">
                    Dès que possible
                  </div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input type="radio" name="timeline" value="few_months" required className="peer sr-only" />
                  <div className="py-3 px-4 text-center border border-outline-variant/20 rounded-xl text-on-surface-variant peer-checked:border-primary/40 peer-checked:text-primary peer-checked:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all font-medium text-sm">
                    Dans quelques mois
                  </div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input type="radio" name="timeline" value="exploring" required className="peer sr-only" />
                  <div className="py-3 px-4 text-center border border-outline-variant/20 rounded-xl text-on-surface-variant peer-checked:border-primary/40 peer-checked:text-primary peer-checked:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all font-medium text-sm">
                    Je me renseigne
                  </div>
                </label>
              </div>
            </fieldset>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-5 mt-4 bg-gradient-to-r from-primary-container to-primary text-on-primary font-bold rounded-2xl text-xl hover:shadow-[0_10px_40px_rgba(0,229,255,0.4)] hover:scale-[1.01] active:scale-95 transition-all"
            >
              Envoyer ma demande
            </button>
            <p className="text-center text-xs text-on-surface-variant/60">
              En envoyant ce formulaire, vous acceptez notre politique de confidentialité.
            </p>
          </form>
        </div>
      </div>
    );
  }

  return null;
}

/* ───────── Main Page ───────── */
export default function Home() {

  return (
    <>
      {/* ── Navigation ── */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/60 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto font-headline tracking-tight">
          <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-100 bg-clip-text text-transparent">
            NovaAI
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a
              className="text-slate-300 hover:text-white transition-colors"
              href="#solution"
            >
              La Solution
            </a>
            <a
              className="text-slate-300 hover:text-white transition-colors"
              href="#concept"
            >
              Le Concept
            </a>
            <a
              className="text-slate-300 hover:text-white transition-colors"
              href="#resultat"
            >
              Témoignages
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="#contact"
              className="px-6 py-2 bg-gradient-to-br from-primary-container to-primary text-on-primary rounded-full font-bold text-sm hover:scale-105 active:scale-95 transition-all"
            >
              Réserver
            </a>
          </div>
        </div>
      </nav>

      <main className="pt-24">
        {/* ── Section 1: Hero ── */}
        <section className="relative overflow-hidden px-8 py-20 lg:py-32 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/30 border border-outline-variant/20 mb-6">
                <span className="w-2 h-2 rounded-full bg-primary-container" />
                <span className="text-xs font-label uppercase tracking-widest text-primary">
                  Intelligence Autonome v3.0
                </span>
              </div>
              <h1 className="font-headline text-5xl lg:text-7xl font-extrabold leading-tight mb-6 tracking-tighter text-on-surface">
                Un site web qui{" "}
                <span className="bg-gradient-to-r from-primary-container to-primary bg-clip-text text-transparent">
                  trouve vos clients
                </span>
                , leur répond, et se met à jour — tout seul.
              </h1>
              <div className="flex flex-col sm:flex-row gap-4 mt-10">
                <a
                  href="#contact"
                  className="px-8 py-4 bg-gradient-to-br from-primary-container to-primary text-on-primary rounded-full font-bold text-lg hover:shadow-[0_0_30px_rgba(0,229,255,0.3)] transition-all text-center"
                >
                  Réserver une consultation gratuite
                </a>
              </div>
            </div>

            <div className="relative group flex justify-center items-center">
              <div className="absolute inset-0 bg-primary/10 blur-[120px] rounded-full animate-pulse" />
              <div className="relative w-full max-w-md aspect-square rounded-full flex items-center justify-center p-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Expressive 3D AI Core"
                  className="w-full h-full object-contain filter drop-shadow-[0_0_50px_rgba(0,229,255,0.4)] animate-float"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCC02Y4-Y3LMnIM6EqgpzAiAHbTgS3RCGhRYIglWA-pqD876sOlO-Kwc6rWKQ2QHUgegnaJ26R3Hatp12JuDiMBD7IQ25XEg3wWpycEdCssLO97F6ozlkpX1ztw-E0WDXsr9pCvutC7iPwi31hRKdAwKs26PzGDm3FIlnbkNWKYt3qe7VoXYS-Vk0rezToZ0cJUBhYX56PtOK60Ik3C1iuqHmJCD5RE9Jj-xWfahz3U9vop30-ZmFbBms61H6wMEGlUX0mVwd16CE"
                />
                <div className="absolute inset-0 border-[0.5px] border-primary/20 rounded-full animate-spin-slow" />
                <div className="absolute inset-4 border-[0.5px] border-primary/10 rounded-full animate-spin-slow-reverse" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 2: Problème ── */}
        <section
          id="concept"
          className="px-8 py-24 bg-surface-container-lowest border-y border-outline-variant/5"
        >
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-error font-bold uppercase tracking-[0.2em] text-sm mb-4 block">
              Le constat
            </span>
            <h2 className="font-headline text-4xl lg:text-5xl font-bold mb-8 text-on-surface">
              Votre site vous coûte de l&apos;argent sans vous en rapporter.
            </h2>
            <p className="text-xl text-on-surface-variant leading-relaxed mb-12">
              Vous payez un développeur pour chaque modification. Vous perdez des
              prospects le soir parce que personne ne répond. Vous écrivez du
              contenu qui ne remonte jamais sur Google.{" "}
              <br className="hidden md:block" />
              <span className="text-on-surface font-semibold">
                En 2026, un site vitrine est une dépense — pas un outil de vente.
              </span>
            </p>
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-outline-variant to-transparent mx-auto" />
          </div>
        </section>

        {/* ── Section 3: Solution ── */}
        <section id="solution" className="px-8 py-24 bg-surface-container-low">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-headline text-3xl lg:text-5xl font-bold mb-4 text-on-surface">
                Ce que fait un site intelligent.
              </h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto">
                Une infrastructure autonome conçue pour la performance absolue.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1: SEO */}
              <div className="p-10 rounded-3xl bg-surface-container-high border border-outline-variant/5 hover:border-primary/20 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-primary-container/10 flex items-center justify-center mb-6 group-hover:bg-primary-container/20 transition-colors">
                  <SearchIcon className="w-7 h-7 text-primary-container" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-on-surface">
                  Visibilité Totale
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Il se référence tout seul sur Google — recherche de mots-clés et
                  création de contenu automatiques.
                </p>
              </div>

              {/* Card 2: Sales */}
              <div className="p-10 rounded-3xl bg-surface-container-highest border border-outline-variant/5 hover:border-primary/20 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-tertiary-container/10 flex items-center justify-center mb-6 group-hover:bg-tertiary-container/20 transition-colors">
                  <SupportAgentIcon className="w-7 h-7 text-tertiary" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-on-surface">
                  Conversion 24/7
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Il vend à votre place — un chatbot accueille chaque visiteur,
                  répond à ses questions et récupère ses coordonnées.
                </p>
              </div>

              {/* Card 3: WhatsApp */}
              <div className="p-10 rounded-3xl bg-surface-container border border-outline-variant/5 hover:border-primary/20 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-primary-container/10 flex items-center justify-center mb-6 group-hover:bg-primary-container/20 transition-colors">
                  <ChatIcon className="w-7 h-7 text-primary-container" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-on-surface">
                  Agilité WhatsApp
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Il se met à jour depuis WhatsApp — bannière, prix, produits,
                  offres. Un message et c&apos;est fait.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 4: Résultat ── */}
        <section id="resultat" className="px-8 py-24 bg-surface overflow-hidden">
          <div className="max-w-7xl mx-auto relative">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1 z-10">
                <h2 className="font-headline text-4xl lg:text-5xl font-bold mb-8 text-on-surface">
                  Zéro développeur. Zéro contenu manuel. Des clients en continu.
                </h2>
                <p className="text-xl text-on-surface-variant leading-relaxed">
                  Votre site travaille 24h/24. Il attire du trafic, convertit les
                  visiteurs en leads, et reste à jour sans que vous touchiez à quoi
                  que ce soit.
                </p>
                <div className="mt-8 flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold text-primary">+240%</span>
                    <span className="text-xs text-on-surface-variant uppercase tracking-widest">
                      Conversion
                    </span>
                  </div>
                  <div className="w-px h-10 bg-outline-variant/20" />
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold text-primary">0h</span>
                    <span className="text-xs text-on-surface-variant uppercase tracking-widest">
                      Maintenance
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 relative">
                <div className="absolute -inset-10 bg-primary-container/5 blur-3xl rounded-full" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="WhatsApp Management"
                  className="rounded-3xl shadow-2xl relative border border-outline-variant/10"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzE9leMZAzhKtDZRNmZMVduvgYnousIULw37Hzx_FzCJOc_S0hwQCwUSW9imd7__PGt2_8i66H0sbcByj9zVgFOAwQ15gsl_9MS9xxueHdcSxZpzoHKatDYpl_S71bV2_QJLIPG0UxjkGkxGqN72ZsmlRgGPoNKcGcAMcv336bwLCrD-bsywAEsEHcMQaw-rYn0KInUBCMRXFCEyhJPe_pwn8dkmOgoDMmeD32vA8bJw0aJb1jW2BlCv43PnAXTCxoHLhJbzftTDY"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 5: Contact / Lead Gen (3-step wizard) ── */}
        <section
          id="contact"
          className="px-8 py-24 bg-surface-container-lowest relative overflow-hidden"
        >
          <BookingWizard />

          {/* Decorative orbs */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-tertiary/5 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2" />
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 border-t border-slate-800/30">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 py-12 max-w-7xl mx-auto gap-6 font-body text-sm text-slate-400">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="text-lg font-bold text-slate-100 font-headline">
              NovaAI
            </div>
            <p className="max-w-xs text-center md:text-left">
              © 2024 NovaAI. La nouvelle ère du web autonome et performant.
            </p>
          </div>

          <div className="flex gap-8">
            <a
              className="text-slate-500 hover:text-cyan-400 transition-colors"
              href="#"
            >
              Confidentialité
            </a>
            <a
              className="text-slate-500 hover:text-cyan-400 transition-colors"
              href="#"
            >
              Conditions
            </a>
            <a
              className="text-slate-500 hover:text-cyan-400 transition-colors"
              href="#"
            >
              Contact
            </a>
          </div>

          <div className="flex gap-4">
            {/* Facebook */}
            <a
              className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-800 transition-colors"
              href="#"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            {/* Twitter/X */}
            <a
              className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-800 transition-colors"
              href="#"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

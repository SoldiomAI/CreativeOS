import React, { useEffect, useState } from 'react';

const HERO =
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2400&auto=format&fit=crop';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 40);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden cos-grain">
      <div className="absolute inset-0">
        <img
          src={HERO}
          alt=""
          className="cos-hero-media w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05080e] via-[#05080e]/82 to-[#05080e]/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05080e] via-transparent to-[#05080e]/50" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col justify-between px-6 md:px-14 py-10 md:py-14">
        <header className={`cos-rise ${ready ? '' : 'opacity-0'}`}>
          <p className="text-[11px] tracking-[0.45em] uppercase text-amber-200/80 font-body">
            Performance Creative OS
          </p>
        </header>

        <main className="max-w-4xl">
          <h1
            className={`cos-display text-[clamp(3.4rem,12vw,8.5rem)] leading-[0.88] text-[#f7f3ea] cos-rise cos-rise-delay-1 ${
              ready ? '' : 'opacity-0'
            }`}
          >
            Creative
            <br />
            OS
          </h1>
          <p
            className={`mt-6 max-w-xl text-lg md:text-xl text-[#9aa8bc] font-light cos-rise cos-rise-delay-2 ${
              ready ? '' : 'opacity-0'
            }`}
          >
            Prompt → cinematic short with sound, hooks, and a social export pack. Free models first.
            God Mode when you want blood.
          </p>
          <div
            className={`mt-10 flex flex-wrap items-center gap-4 cos-rise cos-rise-delay-3 ${
              ready ? '' : 'opacity-0'
            }`}
          >
            <button
              type="button"
              onClick={onGetStarted}
              className="cos-btn-primary px-8 py-4 rounded-xl text-base tracking-wide"
            >
              Enter Factory Studio
            </button>
            <span className="text-xs font-mono text-white/45 tracking-wider">
              localhost:5173 · v3 GOD
            </span>
          </div>
        </main>

        <footer className="flex flex-wrap gap-6 text-[11px] uppercase tracking-[0.25em] text-white/40">
          <span>OmniVoice</span>
          <span>MuAPI</span>
          <span>Comfy</span>
          <span>Export Pack</span>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;

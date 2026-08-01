import React, { useState, useEffect, useRef } from 'react';

const slides = [
  {
    video: 'https://assets.mixkit.co/videos/preview/mixkit-a-woman-in-a-white-dress-and-a-hat-walking-in-a-field-of-41221-large.mp4',
    title: <>Prompt → Movie <br/> with <span className="text-cyan-400">Sound</span></>
  },
  {
    video: 'https://assets.mixkit.co/videos/preview/mixkit-fast-shot-of-a-pizza-being-prepared-in-a-kitchen-4208-large.mp4',
    title: <>Free HF Models <br/> + <span className="text-blue-400">Local Fallback</span></>
  },
  {
    video: 'https://assets.mixkit.co/videos/preview/mixkit-a-man-in-a-suit-talking-on-the-phone-32833-large.mp4',
    title: <>MusicGen Score <br/> + <span className="text-white underline decoration-cyan-400">Edge-TTS</span></>
  },
  {
    video: 'https://assets.mixkit.co/videos/preview/mixkit-a-person-in-a-gorilla-suit-walking-in-a-forest-41988-large.mp4',
    title: <>Creative OS <br/> <span className="text-cyan-400">Factory Studio</span></>
  },
];

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(
      () => setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1)),
      4000
    );
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex]);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col h-[95vh] justify-between text-center p-6 animate-fade-in">
      <div className="flex-grow flex flex-col justify-center">
        <div className="mb-8">
          <h1 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-2">
            Creative OS
          </h1>
        </div>
        <div className="relative w-full aspect-[9/16] rounded-[32px] overflow-hidden shadow-2xl ring-1 ring-white/20">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-700 ${
                index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              {index === currentIndex && (
                <video
                  src={slide.video}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-90" />
              <div className="absolute bottom-12 left-0 right-0 px-6 text-left">
                <h2 className="text-white text-4xl font-bold leading-none tracking-tight drop-shadow-lg">
                  {slide.title}
                </h2>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center space-x-2 mt-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-1 rounded-full transition-all duration-300 ${
                currentIndex === index ? 'bg-cyan-400 w-8' : 'bg-gray-600 w-2 hover:bg-gray-500'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="pb-4">
        <button
          onClick={onGetStarted}
          className="w-full bg-white text-black font-bold py-4 px-4 rounded-xl text-lg hover:bg-gray-200 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        >
          Enter Studio
        </button>
        <p className="mt-4 text-xs text-gray-500">v2.2 · HF free models · localhost:5173</p>
      </div>
    </div>
  );
};

export default LandingPage;

import React, { useState, useEffect, useRef } from 'react';

const slides = [
  {
    bg: 'from-purple-600 via-indigo-600 to-blue-700',
    emoji: '🎬',
    title: <>AdWords for <br/> <span className="text-cyan-300">Culture</span></>
  },
  {
    bg: 'from-blue-700 via-cyan-600 to-teal-600',
    emoji: '⚡',
    title: <>Self-Optimizing <br/> <span className="text-blue-200">Media Factory</span></>
  },
  {
    bg: 'from-indigo-700 via-purple-600 to-pink-600',
    emoji: '🚀',
    title: <>Zero-to-Publish <br/> in <span className="text-white underline decoration-cyan-300">5 Minutes</span></>
  },
  {
    bg: 'from-gray-800 via-indigo-800 to-purple-700',
    emoji: '✨',
    title: <>Powered By <br/> Gemini <span className="text-cyan-300">Veo 3.1</span></>
  },
];

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    resetTimeout();
    timeoutRef.current = window.setTimeout(
      () =>
        setCurrentIndex((prevIndex) =>
          prevIndex === slides.length - 1 ? 0 : prevIndex + 1
        ),
      4000
    );

    return () => {
      resetTimeout();
    };
  }, [currentIndex]);

  const goToSlide = (slideIndex: number) => {
    setCurrentIndex(slideIndex);
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col h-[95vh] justify-between text-center p-6 animate-fade-in">
      <div className="flex-grow flex flex-col justify-center">
        <div className="mb-8">
             <h1 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-2">CreativeOS</h1>
        </div>
        <div className="relative w-full aspect-[9/16] rounded-[32px] overflow-hidden shadow-2xl ring-1 ring-white/20">
          <div className="w-full h-full flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
            {slides.map((slide, index) => (
              <div key={index} className={`w-full h-full flex-shrink-0 relative bg-gradient-to-br ${slide.bg}`}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[110px] opacity-40 select-none" aria-hidden="true">{slide.emoji}</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-90"></div>
                <div className="absolute bottom-12 left-0 right-0 px-6 text-left">
                    <h2 className="text-white text-4xl font-bold leading-none tracking-tight drop-shadow-lg">
                    {slide.title}
                    </h2>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-center space-x-2 mt-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-1 rounded-full transition-all duration-300 ${currentIndex === index ? 'bg-cyan-400 w-8' : 'bg-gray-600 w-2 hover:bg-gray-500'}`}
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
          Enter System
        </button>
        <p className="mt-4 text-xs text-gray-500">v2.2.0 • Gemini · OpenAI · ElevenLabs</p>
      </div>
    </div>
  );
};

export default LandingPage;
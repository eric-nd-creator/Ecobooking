import { useState, useEffect } from 'react';

const SLIDES = [
  {
    bg: 'from-brand-700 to-brand-500',
    title: 'Welcome to TennisCourt',
    subtitle: 'Book your court instantly. Play anytime, anywhere.',
    badge: 'College Tennis Management'
  },
  {
    bg: 'from-green-700 to-green-500',
    title: 'Professional Training Facilities',
    subtitle: '6 world-class courts available for members and coaches.',
    badge: '6 Courts Available'
  },
  {
    bg: 'from-purple-700 to-purple-500',
    title: 'Smarter Court Management',
    subtitle: 'Real-time availability, automated scheduling and analytics.',
    badge: 'Analytics & Insights'
  }
];

const ImageSlider = () => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIdx(i => (i + 1) % SLIDES.length), 3000);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[idx];

  return (
    <div className={`relative w-full min-h-[400px] h-[min(72vh,560px)] max-[639px]:min-h-[440px] max-[639px]:h-auto bg-gradient-to-br ${slide.bg} transition-all duration-1000 overflow-hidden`}>
      {/* Tennis court SVG background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 800 560" fill="none">
          <rect x="100" y="60" width="600" height="440" stroke="white" strokeWidth="3" fill="none"/>
          <line x1="400" y1="60" x2="400" y2="500" stroke="white" strokeWidth="2"/>
          <rect x="200" y="60" width="400" height="220" stroke="white" strokeWidth="2" fill="none"/>
          <rect x="200" y="280" width="400" height="220" stroke="white" strokeWidth="2" fill="none"/>
          <line x1="100" y1="280" x2="700" y2="280" stroke="white" strokeWidth="3"/>
          <circle cx="400" cy="280" r="30" stroke="white" strokeWidth="2" fill="none"/>
        </svg>
      </div>

      {/* Decorative balls */}
      <div className="absolute top-20 right-20 w-24 h-24 rounded-full bg-yellow-400 opacity-20 animate-bounce"/>
      <div className="absolute bottom-32 left-16 w-16 h-16 rounded-full bg-white opacity-15"/>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-full h-full text-center text-white px-4 py-12 sm:px-6">
        <span className="bg-white/20 backdrop-blur-sm text-white text-xs sm:text-sm font-semibold px-4 py-1.5 rounded-full mb-5 sm:mb-6">
          {slide.badge}
        </span>
        <h1 className="max-w-4xl text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">{slide.title}</h1>
        <p className="text-base sm:text-xl md:text-2xl text-white/90 max-w-2xl mb-7 sm:mb-8">{slide.subtitle}</p>
        <div className="flex w-full flex-col min-[420px]:w-auto min-[420px]:flex-row flex-wrap justify-center gap-3 sm:gap-4">
          <a href="/booking" className="bg-white text-brand-700 font-semibold px-6 sm:px-8 py-3 rounded-xl hover:bg-gray-100 transition-all shadow-lg">
            Book Now
          </a>
          <a href="/about" className="border-2 border-white text-white font-semibold px-6 sm:px-8 py-3 rounded-xl hover:bg-white/20 transition-all">
            Learn More
          </a>
        </div>

        {/* Dots */}
        <div className="flex gap-2 mt-7 sm:mt-10">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`w-3 h-3 rounded-full transition-all ${i === idx ? 'bg-white w-8' : 'bg-white/50'}`}/>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImageSlider;

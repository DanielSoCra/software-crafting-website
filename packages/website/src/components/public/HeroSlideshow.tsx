import { useState, useEffect, useCallback } from "react";

import site01 from "../../assets/showcase/site-01.jpg";
import site02 from "../../assets/showcase/site-02.jpg";
import site03 from "../../assets/showcase/site-03.jpg";
import site04 from "../../assets/showcase/site-04.jpg";
import site05 from "../../assets/showcase/site-05.jpg";
import site06 from "../../assets/showcase/site-06.jpg";
import site07 from "../../assets/showcase/site-07.jpg";
import site08 from "../../assets/showcase/site-08.jpg";

const slides = [
  { src: site01.src, alt: "Residenz -- Luxus-Immobilien Website" },
  { src: site02.src, alt: "NordBrew -- Craft-Brauerei Website" },
  { src: site03.src, alt: "Forma -- Architektur-Studio Portfolio" },
  { src: site04.src, alt: "Maison Noir -- Fashion E-Commerce" },
  { src: site05.src, alt: "Vitalis -- Digitale Gesundheitsplattform" },
  { src: site06.src, alt: "Hartmann & Partner -- Kanzlei Website" },
  { src: site07.src, alt: "Wanderlust -- Luxusreisen Website" },
  { src: site08.src, alt: "Nexus AI -- KI-Startup Website" },
];

export default function HeroSlideshow() {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback((index: number) => {
    if (index === current) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrent(index);
      setIsTransitioning(false);
    }, 400);
  }, [current]);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % slides.length);
        setIsTransitioning(false);
      }, 400);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full">
      {/* Glow behind */}
      <div className="absolute -inset-4 rounded-2xl blur-2xl bg-primary/5" />

      {/* Browser frame */}
      <div
        className="relative rounded-xl overflow-hidden border border-border/20 shadow-[0_25px_50px_-12px_var(--color-primary)]/10"
      >
        {/* Address bar hint */}
        <div className="px-4 py-2 flex items-center gap-2 bg-text-muted/5 backdrop-blur-md border-b border-border/10">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-text-muted/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-text-muted/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-text-muted/20" />
          </div>
          <div className="flex-1 mx-8">
            <div className="rounded-md h-5 max-w-[200px] mx-auto bg-text-muted/10" />
          </div>
        </div>

        {/* Slideshow area */}
        <div className="relative aspect-[16/10] bg-bg">
          <img
            src={slides[current].src}
            alt={slides[current].alt}
            width={1280}
            height={800}
            className={`absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-[400ms] ease-in-out ${
              isTransitioning ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
            }`}
          />
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-4">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === current ? 'w-6 bg-primary' : 'w-1.5 bg-text-muted/30'
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

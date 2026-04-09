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
      <div
        className="absolute -inset-4 rounded-2xl blur-2xl"
        style={{ backgroundColor: "oklch(0.55 0.2 280 / 0.05)" }}
      />

      {/* Browser frame */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          boxShadow: "0 25px 50px -12px oklch(0.55 0.2 280 / 0.1)",
          border: "1px solid oklch(0.25 0.01 270 / 0.2)",
        }}
      >
        {/* Address bar hint */}
        <div
          className="px-4 py-2 flex items-center gap-2"
          style={{
            backgroundColor: "oklch(0.7 0 0 / 0.05)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid oklch(0.25 0.01 270 / 0.1)",
          }}
        >
          <div className="flex gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: "oklch(0.7 0 0 / 0.2)" }}
            />
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: "oklch(0.7 0 0 / 0.2)" }}
            />
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: "oklch(0.7 0 0 / 0.2)" }}
            />
          </div>
          <div className="flex-1 mx-8">
            <div
              className="rounded-md h-5 max-w-[200px] mx-auto"
              style={{ backgroundColor: "oklch(0.7 0 0 / 0.08)" }}
            />
          </div>
        </div>

        {/* Slideshow area */}
        <div
          className="relative aspect-[16/10]"
          style={{ backgroundColor: "oklch(0.15 0.02 270)" }}
        >
          <img
            src={slides[current].src}
            alt={slides[current].alt}
            width={1280}
            height={800}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: isTransitioning ? 0 : 1,
              transform: isTransitioning ? "scale(0.98)" : "scale(1)",
              transition: "opacity 0.4s ease-in-out, transform 0.4s ease-in-out",
            }}
          />
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-4">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="rounded-full transition-all duration-500"
            style={{
              height: "4px",
              width: i === current ? "24px" : "6px",
              backgroundColor:
                i === current
                  ? "oklch(0.55 0.2 280)"
                  : "oklch(0.7 0 0 / 0.3)",
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";

const navLinks = [
  { href: "/leistungen", label: "Leistungen" },
  { href: "/referenzen", label: "Referenzen" },
  { href: "/prozess", label: "Prozess" },
  { href: "/team", label: "Team" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden fixed top-0 right-0 z-50">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 right-6 z-50 p-1 text-[var(--color-text)]"
        aria-label={open ? "Menü schließen" : "Menü öffnen"}
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Overlay menu */}
      {open && (
        <div className="fixed inset-x-0 top-[65px] bg-[var(--color-bg)]/95 backdrop-blur-lg border-t border-[var(--color-border)]/50 px-6 py-6 space-y-4 z-40">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block text-lg font-light text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/portal/login"
            onClick={() => setOpen(false)}
            className="block text-lg font-light text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            Login
          </a>
          <a
            href="/#kontakt"
            onClick={() => setOpen(false)}
            className="inline-flex gradient-btn text-white text-sm px-5 py-2 rounded-full font-medium mt-2"
          >
            Kontakt
          </a>
        </div>
      )}
    </div>
  );
}

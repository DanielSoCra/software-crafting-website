import { useState } from "react";

interface FAQItem {
  q: string;
  a: string;
}

interface Props {
  faqs: FAQItem[];
}

export default function FAQAccordion({ faqs }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {faqs.map((faq, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className="border-b border-[var(--color-border)]/50 py-3">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 text-left py-2 group"
              aria-expanded={isOpen}
            >
              <span
                className="font-[var(--font-display)] text-lg font-medium transition-colors duration-200"
                style={{
                  fontFamily: "var(--font-display)",
                  color: isOpen ? "var(--color-primary)" : "var(--color-text)",
                }}
              >
                {faq.q}
              </span>
              <svg
                className="w-5 h-5 flex-shrink-0 transition-transform duration-300"
                style={{
                  color: "var(--color-primary)",
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                maxHeight: isOpen ? "500px" : "0",
                opacity: isOpen ? 1 : 0,
              }}
            >
              <p
                className="pb-4 leading-relaxed font-light"
                style={{ color: "var(--color-text-muted)" }}
              >
                {faq.a}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

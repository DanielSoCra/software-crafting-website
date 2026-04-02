import { useState } from "react";

export default function ContactForm() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFormData({ name: "", email: "", message: "" });
  };

  if (submitted) {
    return (
      <div
        className="rounded-2xl p-12 text-center"
        style={{
          backgroundColor: "oklch(0.18 0.015 270)",
          border: "1px solid oklch(0.25 0.01 270 / 0.4)",
        }}
      >
        <p
          className="font-display text-2xl font-bold mb-4"
          style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
        >
          Vielen Dank!
        </p>
        <p
          className="font-light text-base"
          style={{ color: "oklch(0.7 0 0)" }}
        >
          Ihre Nachricht ist angekommen. Wir melden uns innerhalb von 24 Stunden
          bei Ihnen.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-6 text-sm font-medium transition-colors"
          style={{ color: "oklch(0.55 0.2 280)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "oklch(0.7 0.12 70)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "oklch(0.55 0.2 280)")
          }
        >
          Weitere Nachricht senden
        </button>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: "oklch(0.18 0.015 270 / 0.5)",
    border: "1px solid oklch(0.25 0.01 270 / 0.5)",
    color: "oklch(0.95 0 0)",
    height: "48px",
    borderRadius: "8px",
    padding: "0 16px",
    width: "100%",
    fontSize: "14px",
    fontFamily: '"Inter", system-ui, sans-serif',
    outline: "none",
    transition: "border-color 0.2s",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <input
          placeholder="Ihr Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          style={inputStyle}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = "oklch(0.55 0.2 280)")
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = "oklch(0.25 0.01 270 / 0.5)")
          }
        />
        <input
          type="email"
          placeholder="Ihre E-Mail"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          style={inputStyle}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = "oklch(0.55 0.2 280)")
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = "oklch(0.25 0.01 270 / 0.5)")
          }
        />
      </div>
      <textarea
        placeholder="Erzählen Sie uns von Ihrem Projekt..."
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        required
        rows={6}
        style={{
          ...inputStyle,
          height: "auto",
          minHeight: "160px",
          padding: "12px 16px",
          resize: "vertical",
        }}
        onFocus={(e) =>
          (e.currentTarget.style.borderColor = "oklch(0.55 0.2 280)")
        }
        onBlur={(e) =>
          (e.currentTarget.style.borderColor = "oklch(0.25 0.01 270 / 0.5)")
        }
      />
      <button
        type="submit"
        className="gradient-btn inline-flex items-center gap-2 text-white px-10 py-3 rounded-full text-base font-medium"
      >
        Nachricht senden
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </button>
    </form>
  );
}

import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

const inputClasses =
  "w-full h-12 rounded-lg border border-border/50 bg-bg-secondary/50 px-4 text-sm text-text " +
  "outline-none transition-colors focus:border-primary font-sans";

export default function ContactForm() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "", website: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot — bots fill hidden fields
    if (formData.website) return;

    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Ein Fehler ist aufgetreten.");
        return;
      }

      setStatus("sent");
      setFormData({ name: "", email: "", message: "", website: "" });
    } catch {
      setStatus("error");
      setErrorMsg("Verbindungsfehler. Bitte versuchen Sie es später erneut.");
    }
  };

  if (status === "sent") {
    return (
      <div className="rounded-2xl p-12 text-center bg-bg-secondary border border-border/40">
        <p className="font-display text-2xl font-bold mb-4">Vielen Dank!</p>
        <p className="font-light text-base text-text-muted">
          Ihre Nachricht ist angekommen. Wir melden uns innerhalb von 24 Stunden
          bei Ihnen.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 text-sm font-medium text-primary hover:text-accent transition-colors"
        >
          Weitere Nachricht senden
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Honeypot field — hidden from real users, filled by bots */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <input
          placeholder="Ihr Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className={inputClasses}
        />
        <input
          type="email"
          placeholder="Ihre E-Mail"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className={inputClasses}
        />
      </div>
      <textarea
        placeholder="Erzählen Sie uns von Ihrem Projekt..."
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        required
        rows={6}
        className={`${inputClasses} h-auto min-h-40 py-3 resize-y`}
      />

      {status === "error" && (
        <p className="text-sm text-error">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="gradient-btn inline-flex items-center gap-2 text-white px-10 py-3 rounded-full text-base font-medium disabled:opacity-50"
      >
        {status === "sending" ? "Wird gesendet…" : "Nachricht senden"}
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

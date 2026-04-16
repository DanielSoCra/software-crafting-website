import { useState, useEffect } from 'react';

/**
 * Renders contact information only on the client side to prevent
 * email/phone harvesting by crawlers and scraping bots.
 * The data is split and reassembled in JS, never in static HTML.
 */

const d = {
  e: ['web', 'software-crafting', 'de'],
  p: ['+49', '159', '0196', '9604'],
};

export default function ObfuscatedContact() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <p className="text-text-muted">
        Kontaktdaten werden geladen…
      </p>
    );
  }

  const email = `${d.e[0]}@${d.e[1]}.${d.e[2]}`;
  const phone = d.p.join(' ');
  const phoneHref = `tel:${d.p.join('')}`;

  return (
    <>
      <p>
        Telefon: <a href={phoneHref}>{phone}</a><br />
        E-Mail: <a href={`mailto:${email}`}>{email}</a>
      </p>
    </>
  );
}

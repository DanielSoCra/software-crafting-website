import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 3;
const recentRequests = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = recentRequests.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  recentRequests.set(ip, recent);
  return false;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Rate limit by IP
  if (isRateLimited(clientAddress)) {
    return new Response(
      JSON.stringify({ error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: { name?: string; email?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Ungültige Anfrage.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { name, email, message } = body;

  // Validate required fields
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return new Response(
      JSON.stringify({ error: 'Bitte füllen Sie alle Felder aus.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      JSON.stringify({ error: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Honeypot: reject if a hidden field is filled (checked on frontend)
  // Length limits to prevent abuse
  if (name.length > 200 || email.length > 254 || message.length > 5000) {
    return new Response(
      JSON.stringify({ error: 'Eingabe zu lang.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Build email
  const transporter = nodemailer.createTransport({
    host: import.meta.env.SMTP_HOST,
    port: Number(import.meta.env.SMTP_PORT || 587),
    secure: Number(import.meta.env.SMTP_PORT || 587) === 465,
    auth: {
      user: import.meta.env.SMTP_USER,
      pass: import.meta.env.SMTP_PASS,
    },
  });

  const sanitize = (s: string) => s.replace(/[<>]/g, '');

  try {
    await transporter.sendMail({
      from: `"Software Crafting Website" <${import.meta.env.SMTP_USER}>`,
      replyTo: `"${sanitize(name)}" <${email}>`,
      to: 'web@software-crafting.de',
      subject: `Kontaktanfrage von ${sanitize(name)}`,
      text: [
        `Name: ${name}`,
        `E-Mail: ${email}`,
        ``,
        `Nachricht:`,
        message,
      ].join('\n'),
      html: [
        `<p><strong>Name:</strong> ${sanitize(name)}</p>`,
        `<p><strong>E-Mail:</strong> ${sanitize(email)}</p>`,
        `<hr />`,
        `<p>${sanitize(message).replace(/\n/g, '<br />')}</p>`,
      ].join('\n'),
    });
  } catch (err) {
    console.error('Contact form email error:', err);
    return new Response(
      JSON.stringify({ error: 'E-Mail konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};

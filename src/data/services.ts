export interface BlogLink {
  title: string;
  slug: string;
}

export interface Service {
  icon: string;
  title: string;
  desc: string;
  detail: string[];
  benefits: string[];
  blogLinks: BlogLink[];
}

export const services: Service[] = [
  {
    icon: "Globe",
    title: "Webdesign & Entwicklung",
    desc: "Maßgeschneiderte Websites, Web-Apps und E-Commerce-Lösungen, die Ihre Marke zum Strahlen bringen.",
    detail: [
      "Jede Website, die wir entwickeln, ist ein strategisches Werkzeug — kein hübsches Beiwerk. Wir verbinden visuelles Storytelling mit technischer Exzellenz, um digitale Erlebnisse zu schaffen, die konvertieren.",
      "Von der ersten Wireframe-Skizze bis zum letzten Pixel arbeiten wir mit modernen Technologien wie React, Next.js und Headless CMS-Systemen. Das Ergebnis: blitzschnelle, SEO-optimierte Websites, die auf jedem Gerät perfekt aussehen.",
      "Ob Corporate Website, E-Commerce-Plattform oder komplexe Web-Applikation — wir liefern maßgeschneiderte Lösungen, die Ihre Geschäftsziele direkt unterstützen.",
    ],
    benefits: [
      "Responsive Design für alle Endgeräte",
      "Performance-Optimierung (Core Web Vitals)",
      "CMS-Integration für einfache Content-Pflege",
      "E-Commerce mit Shopify oder individuellen Lösungen",
    ],
    blogLinks: [
      { title: "Warum gutes Webdesign Ihr Umsatzwachstum verdoppelt", slug: "webdesign-umsatzwachstum" },
      { title: "Headless CMS vs. WordPress: Was passt zu Ihrem Unternehmen?", slug: "headless-cms-vs-wordpress" },
      { title: "Web-Performance: Ladezeit halbieren, Conversions verdoppeln", slug: "web-performance-optimierung" },
      { title: "E-Commerce-Optimierung: 10 Hebel für mehr Umsatz", slug: "ecommerce-conversion-optimierung" },
    ],
  },
  {
    icon: "Palette",
    title: "Branding & Corporate Design",
    desc: "Von Logo bis Styleguide – wir erschaffen eine unverwechselbare Markenidentität für Ihr Unternehmen.",
    detail: [
      "Eine starke Marke ist mehr als ein Logo. Sie ist das Versprechen, das Sie Ihren Kunden geben — und die Art, wie Sie es halten. Wir entwickeln Markenidentitäten, die Vertrauen aufbauen und Emotionen wecken.",
      "Unser Branding-Prozess beginnt mit einer tiefgehenden Analyse Ihrer Positionierung, Zielgruppe und Wettbewerber. Daraus entsteht eine visuelle Sprache, die Ihre Werte authentisch transportiert.",
      "Von der Farbpalette über Typografie bis zum umfassenden Styleguide — jedes Detail wird sorgfältig aufeinander abgestimmt, damit Ihre Marke konsistent und wiedererkennbar auftritt.",
    ],
    benefits: [
      "Logo-Design und visuelle Identität",
      "Farbsystem und Typografie-Konzept",
      "Brand Guidelines und Styleguide",
      "Geschäftsausstattung und Print-Design",
    ],
    blogLinks: [
      { title: "5 Zeichen, dass Ihr Branding ein Update braucht", slug: "branding-update-zeichen" },
      { title: "Der ROI von gutem Corporate Design", slug: "roi-corporate-design" },
    ],
  },
  {
    icon: "Figma",
    title: "UI/UX Design",
    desc: "Intuitive Interfaces und nahtlose Nutzererlebnisse, die Ihre Kunden begeistern und konvertieren.",
    detail: [
      "Großartiges Design ist unsichtbar — es fühlt sich einfach richtig an. Wir gestalten digitale Erlebnisse, bei denen Nutzer intuitiv ans Ziel kommen, ohne nachzudenken.",
      "Mit nutzerzentrierten Methoden wie User Research, Persona-Entwicklung und iterativem Prototyping stellen wir sicher, dass jede Interaktion durchdacht ist. Weniger Reibung, mehr Conversion.",
      "Von der Informationsarchitektur über Wireframes bis zum High-Fidelity-Prototyp — wir validieren jeden Schritt, bevor eine einzige Zeile Code geschrieben wird.",
    ],
    benefits: [
      "User Research und Persona-Entwicklung",
      "Wireframing und Prototyping",
      "Usability-Testing und A/B-Tests",
      "Design-Systeme für skalierbare Produkte",
    ],
    blogLinks: [
      { title: "UX-Design: Der unsichtbare Umsatzhebel", slug: "ux-design-umsatzhebel" },
      { title: "Wie User Research Ihre Conversion-Rate steigert", slug: "user-research-conversion" },
      { title: "Barrierefreie Websites: Warum Accessibility kein Nice-to-have ist", slug: "barrierefreiheit-websites" },
    ],
  },
  {
    icon: "Search",
    title: "SEO & Online-Marketing",
    desc: "Suchmaschinenoptimierung, Google Ads und datengetriebene Strategien für maximale Sichtbarkeit.",
    detail: [
      "Was nützt die schönste Website, wenn sie niemand findet? Wir sorgen dafür, dass Ihre Zielgruppe Sie genau dann entdeckt, wenn sie nach Ihren Leistungen sucht.",
      "Unsere SEO-Strategie ist ganzheitlich: Technisches SEO, Content-Optimierung, Linkbuilding und lokale Suchmaschinenoptimierung greifen nahtlos ineinander. Ergänzt durch Google Ads für schnelle Sichtbarkeit.",
      "Jede Maßnahme wird datengetrieben gesteuert und transparent reportet. Sie sehen genau, welche Ergebnisse Ihre Investition bringt.",
    ],
    benefits: [
      "Technisches SEO und On-Page-Optimierung",
      "Content-Strategie und Keyword-Research",
      "Google Ads Kampagnen-Management",
      "Monatliches Reporting und Analyse",
    ],
    blogLinks: [
      { title: "SEO in 2025: Die wichtigsten Ranking-Faktoren", slug: "seo-ranking-faktoren-2025" },
      { title: "Google Ads vs. organisches SEO: Was lohnt sich mehr?", slug: "google-ads-vs-seo" },
    ],
  },
  {
    icon: "Bot",
    title: "AI Search Optimization",
    desc: "Optimierung für KI-gestützte Suchmaschinen – damit Sie auch in der Zukunft der Suche gefunden werden.",
    detail: [
      "Die Suche verändert sich fundamental. ChatGPT, Perplexity und Google AI Overviews verändern, wie Menschen Informationen finden. Wer jetzt nicht optimiert, wird unsichtbar.",
      "Wir analysieren, wie KI-Modelle Ihre Inhalte verstehen und referenzieren. Dann optimieren wir Ihre digitale Präsenz so, dass Sie in AI-generierten Antworten prominent erscheinen.",
      "Von strukturierten Daten über semantische Content-Architekturen bis zu E-E-A-T-Signalen — wir machen Ihre Marke fit für die KI-Ära der Suche.",
    ],
    benefits: [
      "AI-Suchlandschaft-Analyse",
      "Strukturierte Daten und Schema Markup",
      "Semantische Content-Optimierung",
      "E-E-A-T Signale stärken",
    ],
    blogLinks: [
      { title: "Wie KI die Suche revolutioniert — und was das für Ihr Business bedeutet", slug: "ki-suche-revolution" },
      { title: "AI Search Optimization: Der ultimative Leitfaden", slug: "ai-search-optimization-guide" },
    ],
  },
  {
    icon: "Megaphone",
    title: "Content & Social Media Marketing",
    desc: "Strategische Content-Erstellung und Social-Media-Kampagnen, die Ihre Zielgruppe erreichen.",
    detail: [
      "Content ist König — aber nur, wenn er strategisch geplant und exzellent umgesetzt wird. Wir entwickeln Content-Strategien, die Ihre Expertise sichtbar machen und Vertrauen aufbauen.",
      "Von Blogartikeln und Whitepapers über Social-Media-Content bis zu Video-Produktion — wir schaffen Inhalte, die Ihre Zielgruppe wirklich interessieren und zum Handeln bewegen.",
      "Unsere Social-Media-Strategien gehen über hübsche Posts hinaus. Wir bauen Communities auf, generieren Leads und messen den Impact jeder Kampagne.",
    ],
    benefits: [
      "Content-Strategie und Redaktionsplanung",
      "Social Media Management (LinkedIn, Instagram, etc.)",
      "Blog- und Fachartikel-Erstellung",
      "Performance-Tracking und Reporting",
    ],
    blogLinks: [
      { title: "Content Marketing: 7 Strategien, die wirklich funktionieren", slug: "content-marketing-strategien" },
      { title: "LinkedIn für B2B: So generieren Sie qualifizierte Leads", slug: "linkedin-b2b-leads" },
    ],
  },
];

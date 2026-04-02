export interface ProjectResult {
  label: string;
  value: string;
}

export interface ProjectTestimonial {
  text: string;
  name: string;
  role: string;
}

export interface Project {
  slug: string;
  title: string;
  category: string;
  desc: string;
  longDesc: string;
  img: string;
  challenge: string;
  solution: string;
  results: ProjectResult[];
  services: string[];
  testimonial: ProjectTestimonial;
}

export const projects: Project[] = [
  {
    slug: "luxuria-interiors",
    title: "Luxuria Interiors",
    category: "Webdesign · E-Commerce",
    desc: "Kompletter Online-Auftritt für ein Premium-Einrichtungshaus mit integriertem Shop und 3D-Konfigurator.",
    longDesc: "Für Luxuria Interiors haben wir einen vollständigen digitalen Auftritt entwickelt — von der Markenpositionierung über das UX-Konzept bis zur technischen Umsetzung. Der integrierte Online-Shop mit 3D-Konfigurator ermöglicht es Kunden, Möbel in ihrem eigenen Raum zu visualisieren. Ergebnis: 180% Umsatzsteigerung im ersten Quartal.",
    img: "projects/project-luxuria.jpg",
    challenge: "Luxuria Interiors hatte eine veraltete Website ohne E-Commerce-Funktion. Kunden konnten Produkte nur im Showroom erleben, was den Umsatz auf die lokale Region beschränkte. Die Marke brauchte eine digitale Präsenz, die den Premium-Anspruch widerspiegelt.",
    solution: "Wir entwickelten eine immersive E-Commerce-Plattform mit integriertem 3D-Konfigurator. Kunden können Möbel in fotorealistischer Qualität betrachten und in ihrem eigenen Raum visualisieren. Das responsive Design sorgt für ein nahtloses Einkaufserlebnis auf allen Geräten.",
    results: [
      { label: "Umsatzsteigerung", value: "+180%" },
      { label: "Online-Bestellungen", value: "3.200+" },
      { label: "Verweildauer", value: "+65%" },
      { label: "Conversion Rate", value: "4.8%" },
    ],
    services: ["Webdesign & Entwicklung", "UI/UX Design", "E-Commerce", "3D-Visualisierung"],
    testimonial: {
      text: "Software Crafting hat unsere digitale Präsenz komplett transformiert. Der neue Online-Shop hat unseren Umsatz im ersten Quartal um 180% gesteigert.",
      name: "Dr. Anna Richter",
      role: "Geschäftsführerin",
    },
  },
  {
    slug: "finvest-group",
    title: "FinVest Group",
    category: "Branding · UI/UX",
    desc: "Markenidentität und digitale Plattform für ein aufstrebendes Fintech-Unternehmen.",
    longDesc: "Die FinVest Group brauchte eine Markenidentität, die Vertrauen und Innovation gleichermaßen ausstrahlt. Wir entwickelten ein komplettes Branding-System und eine digitale Plattform, die komplexe Finanzprodukte verständlich und zugänglich macht. Die neue Plattform hat die Nutzer-Registrierungen um 250% gesteigert.",
    img: "projects/project-finvest.jpg",
    challenge: "Als junges Fintech-Unternehmen fehlte FinVest eine klare Markenidentität. Die bestehende Plattform wirkte generisch und konnte das Vertrauen potenzieller Investoren nicht gewinnen. Komplexe Finanzprodukte waren schwer verständlich dargestellt.",
    solution: "Wir schufen eine Markenidentität, die Seriosität mit Innovation verbindet. Die neu gestaltete Plattform macht komplexe Finanzinformationen durch klare Visualisierungen und intuitive Navigation zugänglich. Ein durchgängiges Design-System sorgt für Konsistenz.",
    results: [
      { label: "Registrierungen", value: "+250%" },
      { label: "Vertrauen (NPS)", value: "72" },
      { label: "Bounce Rate", value: "-45%" },
      { label: "App Downloads", value: "15.000+" },
    ],
    services: ["Branding & Corporate Design", "UI/UX Design", "Webdesign & Entwicklung"],
    testimonial: {
      text: "Von der Strategieberatung bis zum finalen Launch – die Zusammenarbeit war erstklassig. Unser neues Branding wird von Kunden und Investoren gleichermaßen gelobt.",
      name: "Thomas Kellner",
      role: "Head of Marketing",
    },
  },
  {
    slug: "greentech-solutions",
    title: "GreenTech Solutions",
    category: "SEO · Content Marketing",
    desc: "Organische Reichweite um 340% gesteigert durch strategisches Content-Marketing und technisches SEO.",
    longDesc: "GreenTech Solutions hatte großartige Produkte, aber keine Sichtbarkeit. Durch eine kombinierte Strategie aus technischem SEO, AI Search Optimization und strategischem Content-Marketing haben wir die organische Reichweite um 340% gesteigert und die Marke als Thought Leader in der Branche positioniert.",
    img: "projects/project-greentech.jpg",
    challenge: "Trotz innovativer Produkte war GreenTech online nahezu unsichtbar. Die Website hatte technische SEO-Probleme, keinen strategischen Content und wurde von KI-Suchmaschinen nicht referenziert. Wettbewerber dominierten die relevanten Suchergebnisse.",
    solution: "Wir implementierten eine ganzheitliche SEO-Strategie: technische Optimierung, semantische Content-Architektur und AI Search Optimization. Ein redaktioneller Content-Plan mit Fachartikeln positionierte GreenTech als Branchenexperten.",
    results: [
      { label: "Organischer Traffic", value: "+340%" },
      { label: "Keywords Seite 1", value: "48" },
      { label: "AI-Erwähnungen", value: "120+" },
      { label: "Leads pro Monat", value: "+190%" },
    ],
    services: ["SEO & Online-Marketing", "AI Search Optimization", "Content & Social Media Marketing"],
    testimonial: {
      text: "Dank Software Crafting's SEO-Strategie und AI Search Optimization sind wir jetzt auf Seite 1 bei Google – und werden sogar von KI-Assistenten empfohlen.",
      name: "Marina Voss",
      role: "CEO",
    },
  },
];

export interface Testimonial {
  name: string;
  company: string;
  role: string;
  text: string;
  stars: number;
}

export const testimonials: Testimonial[] = [
  {
    name: "Dr. Anna Richter",
    company: "Luxuria Interiors",
    role: "Geschäftsführerin",
    text: "Software Crafting hat unsere digitale Präsenz komplett transformiert. Der neue Online-Shop hat unseren Umsatz im ersten Quartal um 180% gesteigert. Absolute Profis mit einem Auge fürs Detail.",
    stars: 5,
  },
  {
    name: "Thomas Kellner",
    company: "FinVest Group",
    role: "Head of Marketing",
    text: "Von der Strategieberatung bis zum finalen Launch – die Zusammenarbeit war erstklassig. Unser neues Branding wird von Kunden und Investoren gleichermaßen gelobt.",
    stars: 5,
  },
  {
    name: "Marina Voss",
    company: "GreenTech Solutions",
    role: "CEO",
    text: "Dank Software Crafting's SEO-Strategie und AI Search Optimization sind wir jetzt auf Seite 1 bei Google – und werden sogar von KI-Assistenten empfohlen. Unglaubliche Ergebnisse.",
    stars: 5,
  },
  {
    name: "Felix Krause",
    company: "NordCraft Brewery",
    role: "Inhaber",
    text: "Eine Website, die so gut aussieht wie unser Bier schmeckt. Das Team hat unsere Markenseele perfekt eingefangen. Wir bekommen ständig Komplimente von unseren Kunden.",
    stars: 5,
  },
];

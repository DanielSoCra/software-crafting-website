export interface ProcessStep {
  num: string;
  title: string;
  desc: string;
  longDesc: string;
}

export const processSteps: ProcessStep[] = [
  {
    num: "01",
    title: "Analyse",
    desc: "Ziele, Zielgruppe und Marktumfeld verstehen",
    longDesc: "Im ersten Schritt tauchen wir tief in Ihr Business ein. Wir analysieren Ihre Zielgruppe, den Wettbewerb und Ihre Geschäftsziele. In einem ausführlichen Workshop erarbeiten wir gemeinsam die strategische Grundlage für Ihr Projekt.",
  },
  {
    num: "02",
    title: "Konzeption",
    desc: "Strategie, Wireframes und Designentwürfe",
    longDesc: "Basierend auf den Erkenntnissen der Analyse entwickeln wir die inhaltliche und visuelle Strategie. Wireframes und Prototypen machen die Konzepte greifbar — noch bevor eine Zeile Code geschrieben wird.",
  },
  {
    num: "03",
    title: "Umsetzung",
    desc: "Pixel-perfekte Entwicklung und Testing",
    longDesc: "In der Umsetzungsphase erwecken wir die Konzepte zum Leben. Agile Sprints, regelmäßige Feedback-Runden und rigoroses Testing stellen sicher, dass das Ergebnis Ihre Erwartungen übertrifft.",
  },
  {
    num: "04",
    title: "Launch & Optimierung",
    desc: "Go-Live, Monitoring und stetige Verbesserung",
    longDesc: "Nach dem Launch ist vor der Optimierung. Wir monitoren Performance, analysieren Nutzerverhalten und optimieren kontinuierlich — damit Ihr digitaler Auftritt stetig besser wird.",
  },
];

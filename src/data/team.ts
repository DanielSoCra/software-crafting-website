export interface TeamMember {
  name: string;
  role: string;
  img: string;
  bio: string;
}

export const team: TeamMember[] = [
  {
    name: "Daniel Eberl",
    role: "Gründer & Creative Director",
    img: "team/team-daniel.jpg",
    bio: "Ich verbinde strategisches Denken mit technischer Expertise — von der Idee über das Design bis zur Umsetzung. Mit über 10 Jahren Erfahrung in Software-Entwicklung und Webdesign betreue ich jedes Projekt persönlich.",
  },
];

// --- HIDDEN: Activate when real team members join ---
// {
//   name: "Hanna Blochum",
//   role: "Product Manager",
//   img: "team/team-hanna.jpg",
//   bio: "Hanna orchestriert Projekte von der ersten Idee bis zum erfolgreichen Launch.",
// },
// {
//   name: "Fabian Kielkopf",
//   role: "Software Engineer",
//   img: "team/team-fabian.jpg",
//   bio: "Fabian verwandelt Designs in performante, skalierbare Web-Applikationen.",
// },

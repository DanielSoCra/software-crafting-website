export interface TeamMember {
  name: string;
  role: string;
  img: string;
  bio: string;
}

export const team: TeamMember[] = [
  {
    name: "Daniel Eberl",
    role: "Creative Director",
    img: "team/team-daniel.jpg",
    bio: "Daniel verbindet strategisches Denken mit einem untrüglichen Gespür für Design. Als Creative Director leitet er die kreative Vision bei Software Crafting und sorgt dafür, dass jedes Projekt visuell überzeugt.",
  },
  {
    name: "Hanna Blochum",
    role: "Product Manager",
    img: "team/team-hanna.jpg",
    bio: "Hanna orchestriert Projekte von der ersten Idee bis zum erfolgreichen Launch. Als Product Managerin verbindet sie Kundenbedürfnisse mit technischer Umsetzung — immer mit dem Ziel, echten Mehrwert zu schaffen.",
  },
  {
    name: "Fabian Kielkopf",
    role: "Software Engineer",
    img: "team/team-fabian.jpg",
    bio: "Fabian verwandelt Designs in performante, skalierbare Web-Applikationen. Als Software Engineer sorgt er für technische Exzellenz und sauberen Code in jedem Projekt.",
  },
];

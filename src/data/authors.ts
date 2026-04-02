export interface Author {
  name: string;
  slug: string;
  role: string;
  img: string;
  bio: string;
  linkedin: string;
  website: string;
}

export const authors: Record<string, Author> = {
  "daniel-eberl": {
    name: "Daniel Eberl",
    slug: "daniel-eberl",
    role: "Creative Director bei Software Crafting",
    img: "team/team-daniel.jpg",
    bio: "Daniel verbindet strategisches Denken mit einem untrüglichen Gespür für Design. Als Creative Director leitet er die kreative Vision bei Software Crafting. Er schreibt über Webdesign, Branding und UX.",
    linkedin: "https://linkedin.com/in/daniel-eberl",
    website: "https://softwarecrafting.digital/team",
  },
  "hanna-blochum": {
    name: "Hanna Blochum",
    slug: "hanna-blochum",
    role: "Product Manager bei Software Crafting",
    img: "team/team-hanna.jpg",
    bio: "Hanna orchestriert Projekte von der ersten Idee bis zum erfolgreichen Launch. Sie schreibt über Projektmanagement, Strategie und digitale Transformation.",
    linkedin: "https://linkedin.com/in/hanna-blochum",
    website: "https://softwarecrafting.digital/team",
  },
  "fabian-kielkopf": {
    name: "Fabian Kielkopf",
    slug: "fabian-kielkopf",
    role: "Software Engineer bei Software Crafting",
    img: "team/team-fabian.jpg",
    bio: "Fabian verwandelt Designs in performante, skalierbare Web-Applikationen. Er schreibt über CMS, Performance, SEO und Web-Entwicklung.",
    linkedin: "https://linkedin.com/in/fabian-kielkopf",
    website: "https://softwarecrafting.digital/team",
  },
};

export const blogAuthorMap: Record<string, string> = {
  "webdesign-umsatzwachstum": "daniel-eberl",
  "headless-cms-vs-wordpress": "daniel-eberl",
  "branding-update-zeichen": "daniel-eberl",
  "roi-corporate-design": "daniel-eberl",
  "ki-suche-revolution": "daniel-eberl",
  "ai-search-optimization-guide": "daniel-eberl",
  "seo-ranking-faktoren-2025": "daniel-eberl",
  "content-marketing-strategien": "daniel-eberl",
  "linkedin-b2b-leads": "daniel-eberl",
  "ux-design-umsatzhebel": "daniel-eberl",
  "user-research-conversion": "daniel-eberl",
  "google-ads-vs-seo": "daniel-eberl",
  "ecommerce-conversion-optimierung": "daniel-eberl",
  "barrierefreiheit-websites": "daniel-eberl",
  "web-performance-optimierung": "daniel-eberl",
};

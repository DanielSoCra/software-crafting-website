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
    role: "Gründer & Creative Director",
    img: "team/team-daniel.jpg",
    bio: "Ich verbinde strategisches Denken mit technischer Expertise. Hier schreibe ich über Webdesign, Branding, SEO und AI Search Optimization.",
    linkedin: "https://linkedin.com/in/danieleberl",
    website: "https://software-crafting.de",
  },
};

// All blog posts are by Daniel
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

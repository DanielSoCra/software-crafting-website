import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    category: z.string(),
    img: z.string(),
    readTime: z.string(),
    intro: z.string(),
    author: z.string().default('daniel-eberl'),
    sectionImages: z.record(z.string(), z.string()).optional(),
  }),
});

export const collections = { blog };

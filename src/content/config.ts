import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.string(),
    category: z.string(),
    img: z.string(),
    readTime: z.string(),
    intro: z.string(),
    author: z.string().default('daniel-eberl'),
    sectionImages: z.record(z.string()).optional(),
  }),
});

export const collections = { blog };

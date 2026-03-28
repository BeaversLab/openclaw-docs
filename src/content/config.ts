import { defineCollection, z } from "astro:content";
import { docsSchema } from "@astrojs/starlight/schema";

const baseSchema = docsSchema();

export const collections = {
  docs: defineCollection({
    schema: baseSchema.extend({
      title: z.string().optional(),
    }),
  }),
};

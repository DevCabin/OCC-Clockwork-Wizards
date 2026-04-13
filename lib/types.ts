import { z } from "zod";

export type Product = {
  title: string;
  description: string;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  product_url: string;
  source_domain: string | null;
};

export const productSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  image_url: z.string().url().nullable(),
  price: z.number().nonnegative().nullable(),
  currency: z.string().min(1).nullable(),
  product_url: z.string().url(),
  source_domain: z.string().min(1).nullable(),
});

export const openAiScoreSchema = z.object({
  score: z.number().min(0).max(100),
  isRelevant: z.boolean(),
});

export const openAiPostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  excerpt: z.string().min(1),
  body_md: z.string().min(1),
});

export type GeneratedPost = z.infer<typeof openAiPostSchema>;

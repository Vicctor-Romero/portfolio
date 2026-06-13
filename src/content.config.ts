import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Long-form project case studies. One Markdown file per language:
//   src/content/projects/en/<id>.md  ·  src/content/projects/es/<id>.md
// The folder (en/es) is the language; the file name is the project id and the
// URL slug (/projects/<id> · /es/projects/<id>). Screenshots live in
// public/projects/<id>/ and are referenced by absolute path (e.g. /projects/glidocs/board.png).
const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    num: z.string(), // "01"
    category: z.string(), // "SAAS" | "CLIENT"
    rolePill: z.string(), // "Founder" | "Web"
    roleMeta: z.string(), // "Product · Engineering · Design"
    summary: z.string(), // short blurb shown above the body
    status: z.string().optional(), // "Closed beta" | "Live"
    tags: z.array(z.string()),
    visit: z.object({ label: z.string(), url: z.string() }).optional(),
    cover: z.string().optional(), // hero image, absolute /public path
    coverAlt: z.string().optional(),
    gallery: z
      .array(
        z.object({
          src: z.string(),
          alt: z.string(),
          caption: z.string().optional(),
        }),
      )
      .optional(),
    order: z.number().default(0),
  }),
});

export const collections = { projects };

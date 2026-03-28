import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineCollection } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

function slugSegment(value, preserveCase = false) {
  const normalized = preserveCase ? value : value.toLowerCase();
  return normalized
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

function generateStarlightDocId({ entry, base, data }) {
  if (data.slug) return data.slug;

  const entryPath = fileURLToPath(new URL(encodeURI(entry), base));
  const basePath = fileURLToPath(base);
  const relativePath = path.relative(basePath, entryPath);
  const withoutExtension = relativePath.replace(
    new RegExp(`${path.extname(relativePath)}$`),
    "",
  );
  const segments = withoutExtension.split(path.sep);
  const [first, ...rest] = segments;
  const sluggedSegments = [
    first ? slugSegment(first, true) : "",
    ...rest.map((segment) => slugSegment(segment)),
  ].filter(Boolean);

  return sluggedSegments.join("/").replace(/\/index$/, "");
}

export const collections = {
  docs: defineCollection({
    loader: docsLoader({ generateId: generateStarlightDocId }),
    schema: (context) => docsSchema()(context).partial({ title: true }),
  }),
};

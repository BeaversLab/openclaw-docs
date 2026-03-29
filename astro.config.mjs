// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { buildSidebarFromDocsJson } from "./src/lib/starlight-nav.js";
import remarkStitchMdComponents from "./src/plugins/remark-stitch-md-components.ts";
import rehypeRecursiveMdComponents from "./src/plugins/rehype-recursive-md-components.ts";

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
	site: 'https://openclaw-docs.beaverslab.xyz',
	markdown: {
		remarkPlugins: [remarkStitchMdComponents],
    rehypePlugins: [rehypeRecursiveMdComponents],
    shikiConfig: {
      langAlias: {
        exec: "bash",
        prose: "text",
        caddy: "text",
        gitignore: "text",
        ssh: "bash",
        lobster: "text",
        json55: "json",
      },
    },
  },
  integrations: [starlight({
    title: "OpenClaw Docs",
    disable404Route: true,
    customCss: ["/src/styles/starlight-overrides.css"],
    components: {
      Footer: "./src/components/starlight/Footer.astro",
      Head: "./src/components/starlight/Head.astro",
      Header: "./src/components/starlight/Header.astro",
      MobileTableOfContents:
        "./src/components/starlight/MobileTableOfContents.astro",
      PageTitle: "./src/components/starlight/PageTitle.astro",
      Sidebar: "./src/components/starlight/Sidebar.astro",
      TableOfContents: "./src/components/starlight/TableOfContents.astro",
    },
    social: [
      { icon: "laptop", label: "BeaversLab", href: "https://beaverslab.xyz" },
      {
        icon: "github",
        label: "GitHub",
        href: "https://github.com/BeaversLab/openclaw-docs",
      },
    ],
    lastUpdated: true,
    sidebar: buildSidebarFromDocsJson(),
    defaultLocale: "en",
    locales: {
      zh: {
        label: "简体中文",
        lang: "zh-CN",
      },
      "zh-Hant": {
        label: "繁體中文",
        lang: "zh-Hant",
      },
      en: {
        label: "English",
      },
      fr: {
        label: "Français",
        lang: "fr",
      },
      es: {
        label: "Español",
        lang: "es",
      },
    },
  }), sitemap()],
});
